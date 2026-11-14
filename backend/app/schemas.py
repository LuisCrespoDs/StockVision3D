from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field

class ProductCreate(BaseModel):
    sku: str = Field(min_length=2, max_length=30)
    nombre: str = Field(min_length=2, max_length=120)
    categoria: str = Field(min_length=2, max_length=60)
    precio_referencia: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    descripcion: str | None = None
    stock_minimo: int = Field(default=5, ge=0, le=1000000)
    activo: bool = True

class ProductUpdate(ProductCreate):
    pass

class LocationCreate(BaseModel):
    codigo: str = Field(min_length=2, max_length=20)
    pasillo: str = Field(min_length=1, max_length=20)
    estanteria: str = Field(min_length=1, max_length=20)
    nivel: int = Field(ge=1, le=50)
    columna: int = Field(default=1, ge=1, le=100)
    capacidad_unidades: int = Field(default=50, ge=1, le=100000)
    zona: str = Field(default="ALMACEN", max_length=30)
    activo: bool = True

class LocationUpdate(LocationCreate):
    pass

class MovementCreate(BaseModel):
    id_producto: int = Field(gt=0)
    id_ubicacion: int = Field(gt=0)
    tipo: Literal["ENTRADA", "SALIDA"]
    cantidad: int = Field(gt=0, le=1000000)
    observacion: str | None = Field(default=None, max_length=250)
    referencia: str | None = Field(default=None, max_length=80)

class RoleUpdate(BaseModel):
    rol: Literal["admin", "encargado", "consulta"]
