from sqlalchemy.orm import Session
import models
import schemas

def create_product(db: Session, product: schemas.ProductCreate):
    keywords_str = product.name.lower()
    
    db_product = models.Product(
        erp_code=product.erp_code,
        name=product.name,
        factor_pallet=product.factor_pallet,
        factor_layer=product.factor_layer,
        factor_box=product.factor_box,
        keywords=keywords_str
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def get_products(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Product).offset(skip).limit(limit).all()
