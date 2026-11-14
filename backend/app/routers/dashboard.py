from fastapi import APIRouter, Depends
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def summary(conn=Depends(get_db), _user=Depends(get_current_user)):
    row = conn.execute(
        """
        SELECT COUNT(DISTINCT p.id_producto) FILTER (WHERE p.activo=TRUE)::int AS total_productos,
               COALESCE(SUM(i.cantidad_actual),0)::int AS total_unidades,
               COALESCE(SUM(i.cantidad_actual*p.precio_referencia),0)::numeric(14,2) AS valor_inventario,
               COUNT(DISTINCT p.id_producto) FILTER (
                 WHERE COALESCE(stock.stock,0)<=p.stock_minimo AND p.activo=TRUE
               )::int AS productos_stock_bajo,
               (SELECT COUNT(*)::int FROM public.ubicaciones WHERE activo=TRUE) AS total_ubicaciones,
               (SELECT COUNT(DISTINCT id_ubicacion)::int FROM public.inventario WHERE cantidad_actual>0) AS ubicaciones_ocupadas
        FROM public.productos p
        LEFT JOIN public.inventario i ON i.id_producto=p.id_producto
        LEFT JOIN (SELECT id_producto,SUM(cantidad_actual)::int AS stock FROM public.inventario GROUP BY id_producto) stock
          ON stock.id_producto=p.id_producto
        """
    ).fetchone()
    monthly = conn.execute(
        """
        SELECT TO_CHAR(date_trunc('month',fecha_movimiento),'YYYY-MM') AS mes,
               COUNT(*) FILTER(WHERE tipo='ENTRADA')::int AS entradas,
               COUNT(*) FILTER(WHERE tipo='SALIDA')::int AS salidas
        FROM public.movimientos
        WHERE fecha_movimiento>=date_trunc('month',NOW())-INTERVAL '5 months'
        GROUP BY date_trunc('month',fecha_movimiento)
        ORDER BY date_trunc('month',fecha_movimiento)
        """
    ).fetchall()
    recent = conn.execute(
        """
        SELECT m.id_movimiento,m.tipo,m.cantidad,m.fecha_movimiento,m.observacion,
               p.nombre AS producto,p.sku,u.codigo AS ubicacion,
               COALESCE(per.nombre,per.email) AS registrado_por
        FROM public.movimientos m
        JOIN public.productos p ON p.id_producto=m.id_producto
        JOIN public.ubicaciones u ON u.id_ubicacion=m.id_ubicacion
        LEFT JOIN public.perfiles per ON per.user_id=m.registrado_por
        ORDER BY m.fecha_movimiento DESC LIMIT 7
        """
    ).fetchall()
    return {**row, "movimientos_mensuales": monthly, "movimientos_recientes": recent}
