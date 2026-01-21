from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
import models, schemas, crud, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()
inventory_session = {}


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/products/", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    return crud.create_product(db=db, product=product)

@app.get("/products/", response_model=list[schemas.Product])
def read_products(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    products = crud.get_products(db, skip=skip, limit=limit)
    return products

@app.get("/voice_search/", response_model=schemas.VoiceSearchResponse)
def voice_search(query: str, db: Session = Depends(get_db)):
    products = crud.voice_search(db, query)

    return {
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "code": p.erp_code,
                "palete": p.factor_pallet,
                "lastro": p.factor_layer,
            }
            for p in products
        ]
    }
