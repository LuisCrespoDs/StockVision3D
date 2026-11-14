from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from ..database import get_db
from ..auth import require_roles
from ..schemas import RoleUpdate

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

@router.get("")
def list_users(conn=Depends(get_db), _admin=Depends(require_roles("admin"))):
    return conn.execute(
        "SELECT user_id::text AS id,email,nombre,rol,created_at FROM public.perfiles ORDER BY created_at DESC"
    ).fetchall()

@router.patch("/{user_id}/rol")
def update_user_role(user_id: UUID, payload: RoleUpdate, conn=Depends(get_db),
                     admin=Depends(require_roles("admin"))):
    if str(user_id) == admin["id"] and payload.rol != "admin":
        raise HTTPException(status_code=400, detail="No puedes quitarte el rol de administrador desde tu propia sesión.")
    row = conn.execute(
        """
        UPDATE public.perfiles SET rol=%s,updated_at=NOW()
        WHERE user_id=%s RETURNING user_id::text AS id,email,nombre,rol
        """,
        (payload.rol,user_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return row
