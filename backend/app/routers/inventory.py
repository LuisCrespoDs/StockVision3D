from fastapi import APIRouter, Depends, Query
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/inventario", tags=["Inventario"])

@router.get("")
def list_inventory(
    id_producto: int | None = Query(default=None, gt=0),
    id_ubicacion: int | None = Query(default=None, gt=0),
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    filters = []
    params = []
    if id_producto is not None:
        filters.append("i.id_producto=%s")
        params.append(id_producto)
    if id_ubicacion is not None:
        filters.append("i.id_ubicacion=%s")
        params.append(id_ubicacion)
    where = "WHERE " + " AND ".join(filters) if filters else ""
    return conn.execute(
        f"""
        SELECT i.id_inventario,i.id_producto,p.sku,p.nombre AS producto,p.categoria,
               i.id_ubicacion,u.codigo AS ubicacion,u.pasillo,u.estanteria,u.nivel,u.columna,
               i.cantidad_actual,p.stock_minimo,i.updated_at
        FROM public.inventario i
        JOIN public.productos p ON p.id_producto=i.id_producto
        JOIN public.ubicaciones u ON u.id_ubicacion=i.id_ubicacion
        {where}
        ORDER BY p.nombre,u.codigo
        """,
        params,
    ).fetchall()
