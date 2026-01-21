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

def update_product(db: Session, product_id: int, product: schemas.ProductUpdate):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    
    if db_product is None:
        return None

    update_data = product.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_product, key, value)

    if 'name' in update_data:
        db_product.keywords = update_data['name'].lower()

    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def voice_search(db: Session, query: str):
    return (
        db.query(models.Product)
        .filter(models.Product.keywords.ilike(f"%{query.lower()}%"))
        .limit(5)
        .all()
    )
