from pydantic import BaseModel
from typing import Optional

class ProductBase(BaseModel):
    erp_code: str
    name: str
    factor_pallet: int
    factor_layer: int
    factor_box: int
    keywords: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    pass

class Product(ProductBase):
    id: int

    class Config:
        from_attributes = True