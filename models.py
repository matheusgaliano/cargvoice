from sqlalchemy import Column, Integer, String
from database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    erp_code = Column(String, unique=True, index=True)
    name = Column(String)
    keywords = Column(String)
    factor_pallet = Column(Integer, default=0)
    factor_layer = Column(Integer, default=0)
    factor_box = Column(Integer, default=1)