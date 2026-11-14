from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg import Error as PsycopgError
from uuid import UUID
from ..database import get_db
from ..auth import require_roles
from ..schemas import MovementCreate

router = APIRouter(prefix="/movimientos", tags=["Movimientos"])

@router.get("")
def list_movements(limit: int = Query(default=100, ge=1, le=500),
                   tipo: str | None = Query(default=None, pattern="^(ENTRADA|SALIDA)$"),
                   conn=Depends(get_db), _user=Depends(require_roles('admin','encargado'))):
    params = []
    where = ""
    if tipo:
        where = "WHERE m.tipo=%s"
        params.append(tipo)
    params.append(limit)
    return conn.execute(
        f"""
        SELECT m.id_movimiento,m.tipo,m.cantidad,m.fecha_movimiento,m.observacion,m.referencia,
               p.id_producto,p.sku,p.nombre AS producto,u.id_ubicacion,u.codigo AS ubicacion,
               COALESCE(per.nombre,per.email) AS registrado_por
        FROM public.movimientos m JOIN public.productos p ON p.id_producto=m.id_producto
        JOIN public.ubicaciones u ON u.id_ubicacion=m.id_ubicacion
        LEFT JOIN public.perfiles per ON per.user_id=m.registrado_por
        {where} ORDER BY m.fecha_movimiento DESC LIMIT %s
        """,
        params,
    ).fetchall()

@router.post("", status_code=201)
def create_movement(payload: MovementCreate, conn=Depends(get_db),
                    _user=Depends(require_roles("admin", "encargado"))):
    try:
        with conn.transaction():
            row = conn.execute(
                """
                INSERT INTO public.movimientos(id_producto,id_ubicacion,tipo,cantidad,observacion,referencia,registrado_por)
                VALUES(%s,%s,%s,%s,%s,%s,%s)
                RETURNING id_movimiento,id_producto,id_ubicacion,tipo,cantidad,fecha_movimiento,observacion,referencia
                """,
                (payload.id_producto,payload.id_ubicacion,payload.tipo,payload.cantidad,payload.observacion,payload.referencia,UUID(_user["id"])),
            ).fetchone()
    except PsycopgError as exc:
        if any(code in str(exc) for code in ("STOCK_INSUFICIENTE", "CAPACIDAD_EXCEDIDA")):
            raise HTTPException(status_code=409, detail=str(exc).splitlines()[0])
        if any(code in str(exc) for code in ("PRODUCTO_INACTIVO", "UBICACION_INACTIVA")):
            raise HTTPException(status_code=400, detail=str(exc).splitlines()[0])
        if "foreign key" in str(exc).lower():
            raise HTTPException(status_code=404, detail="Producto o ubicación inexistente.")
        raise HTTPException(status_code=400, detail=f"No se pudo registrar el movimiento: {str(exc).splitlines()[0]}")
    return {"message": "Movimiento registrado y existencias actualizadas.", **row}
