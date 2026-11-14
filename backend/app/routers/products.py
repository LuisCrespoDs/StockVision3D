from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.errors import UniqueViolation
from ..database import get_db
from ..auth import get_current_user, require_roles
from ..schemas import ProductCreate, ProductUpdate

router = APIRouter(prefix="/productos", tags=["Productos"])

@router.get("")
def list_products(search: str | None = Query(default=None, max_length=100),
                  conn=Depends(get_db), _user=Depends(get_current_user)):
    params = []
    where = ""
    if search:
        where = "WHERE p.sku ILIKE %s OR p.nombre ILIKE %s OR p.categoria ILIKE %s"
        term = f"%{search}%"
        params = [term, term, term]
    return conn.execute(
        f"""
        SELECT p.id_producto,p.sku,p.nombre,p.categoria,p.precio_referencia,p.activo,
               p.descripcion,p.stock_minimo,p.created_at,
               COALESCE(SUM(i.cantidad_actual),0)::int AS stock_actual
        FROM public.productos p LEFT JOIN public.inventario i ON i.id_producto=p.id_producto
        {where} GROUP BY p.id_producto ORDER BY p.nombre
        """,
        params,
    ).fetchall()

@router.post("", status_code=201)
def create_product(payload: ProductCreate, conn=Depends(get_db),
                   _user=Depends(require_roles("admin", "encargado"))):
    try:
        return conn.execute(
            """
            INSERT INTO public.productos(sku,nombre,categoria,precio_referencia,descripcion,stock_minimo,activo)
            VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING *
            """,
            (payload.sku.strip().upper(),payload.nombre,payload.categoria,payload.precio_referencia,
             payload.descripcion,payload.stock_minimo,payload.activo),
        ).fetchone()
    except UniqueViolation:
        raise HTTPException(status_code=409, detail="Ya existe un producto con ese SKU.")

@router.put("/{product_id}")
def update_product(product_id: int, payload: ProductUpdate, conn=Depends(get_db),
                   _user=Depends(require_roles("admin", "encargado"))):
    product_row = conn.execute(
        "SELECT id_producto FROM public.productos WHERE id_producto=%s FOR UPDATE",
        (product_id,),
    ).fetchone()
    if not product_row:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")
    stock_row = conn.execute(
        "SELECT COALESCE(SUM(cantidad_actual),0)::int AS stock FROM public.inventario WHERE id_producto=%s",
        (product_id,),
    ).fetchone()
    if not payload.activo and stock_row["stock"] > 0:
        raise HTTPException(status_code=409, detail="No puedes desactivar un producto que todavía tiene existencias.")
    try:
        row = conn.execute(
            """
            UPDATE public.productos SET sku=%s,nombre=%s,categoria=%s,precio_referencia=%s,
              descripcion=%s,stock_minimo=%s,activo=%s,updated_at=NOW()
            WHERE id_producto=%s RETURNING *
            """,
            (payload.sku.strip().upper(),payload.nombre,payload.categoria,payload.precio_referencia,
             payload.descripcion,payload.stock_minimo,payload.activo,product_id),
        ).fetchone()
    except UniqueViolation:
        raise HTTPException(status_code=409, detail="Ya existe otro producto con ese SKU.")
    if not row:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")
    return row

@router.delete("/{product_id}")
def deactivate_product(product_id: int, conn=Depends(get_db),
                       _user=Depends(require_roles("admin", "encargado"))):
    product_row = conn.execute(
        "SELECT id_producto FROM public.productos WHERE id_producto=%s FOR UPDATE",
        (product_id,),
    ).fetchone()
    if not product_row:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")
    stock_row = conn.execute(
        "SELECT COALESCE(SUM(cantidad_actual),0)::int AS stock FROM public.inventario WHERE id_producto=%s",
        (product_id,),
    ).fetchone()
    if stock_row["stock"] > 0:
        raise HTTPException(status_code=409, detail="Registra primero la salida de las existencias antes de desactivar el producto.")
    row = conn.execute(
        "UPDATE public.productos SET activo=FALSE,updated_at=NOW() WHERE id_producto=%s RETURNING id_producto,activo",
        (product_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")
    return {"message": "Producto desactivado.", **row}
