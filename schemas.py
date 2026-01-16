from pydantic import BaseModel
from typing import Optional

class ProductBase(BaseModel):
    erp_code: str
    name: str
    factor_pallet: int = 0
    factor_layer: int = 0
    factor_box: int = 1

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    keywords: Optional[str] = None

    class Config:
        from_attributes = True