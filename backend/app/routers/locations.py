from fastapi import APIRouter, Depends, HTTPException
from psycopg.errors import UniqueViolation
from ..database import get_db
from ..auth import get_current_user, require_roles
from ..schemas import LocationCreate, LocationUpdate

router = APIRouter(prefix="/ubicaciones", tags=["Ubicaciones"])

@router.get("")
def list_locations(conn=Depends(get_db), _user=Depends(get_current_user)):
    return conn.execute(
        """
        SELECT u.id_ubicacion,u.codigo,u.pasillo,u.estanteria,u.nivel,u.columna,
               u.capacidad_unidades,u.zona,u.activo,
               COALESCE(SUM(i.cantidad_actual),0)::int AS stock_actual,
               COUNT(i.id_producto) FILTER(WHERE i.cantidad_actual>0)::int AS productos_distintos,
               COALESCE(BOOL_OR(pt.stock_total<=p.stock_minimo) FILTER(WHERE i.cantidad_actual>0),FALSE) AS tiene_stock_bajo
        FROM public.ubicaciones u
        LEFT JOIN public.inventario i ON i.id_ubicacion=u.id_ubicacion
        LEFT JOIN public.productos p ON p.id_producto=i.id_producto
        LEFT JOIN (
          SELECT id_producto,SUM(cantidad_actual)::int AS stock_total
          FROM public.inventario GROUP BY id_producto
        ) pt ON pt.id_producto=i.id_producto
        GROUP BY u.id_ubicacion ORDER BY u.estanteria,u.nivel,u.columna
        """
    ).fetchall()

@router.get("/{location_id}")
def get_location(location_id: int, conn=Depends(get_db), _user=Depends(get_current_user)):
    location = conn.execute(
        """
        SELECT u.*,COALESCE(SUM(i.cantidad_actual),0)::int AS stock_actual
        FROM public.ubicaciones u LEFT JOIN public.inventario i ON i.id_ubicacion=u.id_ubicacion
        WHERE u.id_ubicacion=%s GROUP BY u.id_ubicacion
        """,
        (location_id,),
    ).fetchone()
    if not location:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada.")
    products = conn.execute(
        """
        SELECT p.id_producto,p.sku,p.nombre,p.categoria,i.cantidad_actual,p.stock_minimo,p.precio_referencia
        FROM public.inventario i JOIN public.productos p ON p.id_producto=i.id_producto
        WHERE i.id_ubicacion=%s AND i.cantidad_actual>0 ORDER BY p.nombre
        """,
        (location_id,),
    ).fetchall()
    return {"ubicacion": location, "productos": products}

@router.post("", status_code=201)
def create_location(payload: LocationCreate, conn=Depends(get_db),
                    _user=Depends(require_roles("admin", "encargado"))):
    try:
        return conn.execute(
            """
            INSERT INTO public.ubicaciones(codigo,pasillo,estanteria,nivel,columna,capacidad_unidades,zona,activo)
            VALUES(%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
            """,
            (payload.codigo.upper(),payload.pasillo.upper(),payload.estanteria.upper(),payload.nivel,
             payload.columna,payload.capacidad_unidades,payload.zona,payload.activo),
        ).fetchone()
    except UniqueViolation:
        raise HTTPException(status_code=409, detail="El código de ubicación ya existe.")

@router.put("/{location_id}")
def update_location(location_id: int, payload: LocationUpdate, conn=Depends(get_db),
                    _user=Depends(require_roles("admin", "encargado"))):
    location_row = conn.execute(
        "SELECT id_ubicacion FROM public.ubicaciones WHERE id_ubicacion=%s FOR UPDATE",
        (location_id,),
    ).fetchone()
    if not location_row:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada.")
    stock_row = conn.execute(
        "SELECT COALESCE(SUM(cantidad_actual),0)::int AS stock FROM public.inventario WHERE id_ubicacion=%s",
        (location_id,),
    ).fetchone()
    if payload.capacidad_unidades < stock_row["stock"]:
        raise HTTPException(status_code=409, detail="La capacidad no puede ser inferior a las existencias actuales.")
    if not payload.activo and stock_row["stock"] > 0:
        raise HTTPException(status_code=409, detail="No puedes desactivar una ubicación que todavía tiene existencias.")
    try:
        row = conn.execute(
            """
            UPDATE public.ubicaciones SET codigo=%s,pasillo=%s,estanteria=%s,nivel=%s,columna=%s,
              capacidad_unidades=%s,zona=%s,activo=%s,updated_at=NOW()
            WHERE id_ubicacion=%s RETURNING *
            """,
            (payload.codigo.upper(),payload.pasillo.upper(),payload.estanteria.upper(),payload.nivel,
             payload.columna,payload.capacidad_unidades,payload.zona,payload.activo,location_id),
        ).fetchone()
    except UniqueViolation:
        raise HTTPException(status_code=409, detail="El código de ubicación ya existe.")
    if not row:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada.")
    return row

@router.delete("/{location_id}")
def deactivate_location(location_id: int, conn=Depends(get_db),
                        _user=Depends(require_roles("admin", "encargado"))):
    location_row = conn.execute(
        "SELECT id_ubicacion FROM public.ubicaciones WHERE id_ubicacion=%s FOR UPDATE",
        (location_id,),
    ).fetchone()
    if not location_row:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada.")
    stock_row = conn.execute(
        "SELECT COALESCE(SUM(cantidad_actual),0)::int AS stock FROM public.inventario WHERE id_ubicacion=%s",
        (location_id,),
    ).fetchone()
    if stock_row["stock"] > 0:
        raise HTTPException(status_code=409, detail="Retira las existencias antes de desactivar la ubicación.")
    row = conn.execute(
        "UPDATE public.ubicaciones SET activo=FALSE,updated_at=NOW() WHERE id_ubicacion=%s RETURNING id_ubicacion",
        (location_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada.")
    return {"message": "Ubicación desactivada.", **row}
