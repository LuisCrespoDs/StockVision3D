import httpx
from uuid import UUID
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .config import SUPABASE_URL, SUPABASE_ANON_KEY
from .database import get_db

bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    conn=Depends(get_db),
):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Debes iniciar sesión.")
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=503, detail="La autenticación Supabase no está configurada.")
    try:
        response = httpx.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {credentials.credentials}"},
            timeout=10.0,
        )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="No se pudo verificar la sesión con Supabase Auth.")
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada.")
    auth_user = response.json()
    user_id = auth_user.get("id")
    email = auth_user.get("email") or ""
    profile = conn.execute(
        "SELECT user_id,email,nombre,rol FROM public.perfiles WHERE user_id=%s",
        (UUID(user_id),),
    ).fetchone()
    if not profile:
        profile = conn.execute(
            """
            INSERT INTO public.perfiles(user_id,email,nombre,rol)
            VALUES(%s,%s,%s,'consulta')
            ON CONFLICT(user_id) DO UPDATE SET email=EXCLUDED.email
            RETURNING user_id,email,nombre,rol
            """,
            (UUID(user_id), email, auth_user.get("user_metadata", {}).get("full_name")),
        ).fetchone()
    return {"id": str(profile["user_id"]), "email": profile["email"], "nombre": profile["nombre"], "rol": profile["rol"]}

def require_roles(*allowed_roles: str):
    def checker(current_user=Depends(get_current_user)):
        if current_user["rol"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta operación.")
        return current_user
    return checker
