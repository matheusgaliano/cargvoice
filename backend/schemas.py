from pydantic import BaseModel
from typing import Optional

class ProductUpdate(BaseModel):
    erp_code: Optional[str] = None
    name: Optional[str] = None
    factor_pallet: Optional[int] = None
    factor_layer: Optional[int] = None
    factor_box: Optional[int] = None
    keywords: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    pass

class Product(ProductBase):
    id: int

    class Config:
        from_attributes = True
        
class VoiceProduct(BaseModel):
    id: int
    name: str
    code: str
    palete: int
    lastro: int

class VoiceSearchResponse(BaseModel):
    products: list[VoiceProduct]

class VoiceInput(BaseModel):
    text: str
