from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .config import CORS_ORIGINS
from .database import open_pool, close_pool
from .auth import get_current_user
from .routers import dashboard, products, locations, movements, reports, users, inventory

@asynccontextmanager
async def lifespan(app: FastAPI):
    open_pool()
    yield
    close_pool()

app = FastAPI(
    title="StockVision 3D API",
    description="API REST para gestión de inventario tecnológico y visualización de almacén 3D.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allow_headers=["Authorization","Content-Type"],
)
app.include_router(dashboard.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(locations.router, prefix="/api")
app.include_router(movements.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")

@app.get("/")
def root():
    return {"name":"StockVision 3D API","status":"running","docs":"/docs","api_prefix":"/api"}

@app.get("/health")
def health():
    return {"status":"ok"}

@app.get("/api/auth/me", tags=["Autenticación"])
def me(user=Depends(get_current_user)):
    return user
