from fastapi import APIRouter, Depends
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/reportes", tags=["Reportes"])

@router.get("/stock-por-categoria")
def stock_by_category(conn=Depends(get_db), _user=Depends(get_current_user)):
    return conn.execute(
        """
        SELECT p.categoria,COALESCE(SUM(i.cantidad_actual),0)::int AS unidades,
               COALESCE(SUM(i.cantidad_actual*p.precio_referencia),0)::numeric(14,2) AS valor
        FROM public.productos p LEFT JOIN public.inventario i ON i.id_producto=p.id_producto
        WHERE p.activo=TRUE GROUP BY p.categoria ORDER BY unidades DESC
        """
    ).fetchall()

@router.get("/stock-bajo")
def low_stock(conn=Depends(get_db), _user=Depends(get_current_user)):
    return conn.execute(
        """
        SELECT p.id_producto,p.sku,p.nombre,p.categoria,p.stock_minimo,
               COALESCE(SUM(i.cantidad_actual),0)::int AS stock_actual
        FROM public.productos p LEFT JOIN public.inventario i ON i.id_producto=p.id_producto
        WHERE p.activo=TRUE GROUP BY p.id_producto
        HAVING COALESCE(SUM(i.cantidad_actual),0)<=p.stock_minimo
        ORDER BY stock_actual,p.nombre
        """
    ).fetchall()

@router.get("/movimientos-mensuales")
def monthly_movements(conn=Depends(get_db), _user=Depends(get_current_user)):
    return conn.execute(
        """
        SELECT TO_CHAR(date_trunc('month',fecha_movimiento),'YYYY-MM') AS mes,
               SUM(CASE WHEN tipo='ENTRADA' THEN cantidad ELSE 0 END)::int AS entradas,
               SUM(CASE WHEN tipo='SALIDA' THEN cantidad ELSE 0 END)::int AS salidas
        FROM public.movimientos GROUP BY date_trunc('month',fecha_movimiento)
        ORDER BY date_trunc('month',fecha_movimiento)
        """
    ).fetchall()
