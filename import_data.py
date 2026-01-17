import csv
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import sys

models.Base.metadata.create_all(bind=engine)

def import_csv(csv_filename: str):
    db = SessionLocal()
    count_success = 0
    count_error = 0
    
    try:
        with open(csv_filename, mode='r', encoding='utf-8') as csv_file:
            sample = csv_file.read(1024)
            csv_file.seek(0)
            sniffer = csv.Sniffer()
            has_header = sniffer.has_header(sample)
            dialect = sniffer.sniff(sample)
            
            reader = csv.reader(csv_file, dialect)
            
            if has_header:
                next(reader)

            print("Iniciando importação...")
            
            for row in reader:
                try:
                    code = row[0].strip()
                    name = row[1].strip()
                    
                    factor_pallet = int(row[2]) if len(row) > 2 and row[2].strip().isdigit() else 0
                    factor_layer  = int(row[3]) if len(row) > 3 and row[3].strip().isdigit() else 0
                    factor_box    = int(row[4]) if len(row) > 4 and row[4].strip().isdigit() else 1
                    
                    existing_product = db.query(models.Product).filter(models.Product.erp_code == code).first()
                    
                    if existing_product:
                        print(f"Atualizando: {name}")
                        existing_product.name = name
                        existing_product.keywords = name.lower()
                        existing_product.factor_pallet = factor_pallet
                        existing_product.factor_layer = factor_layer
                        existing_product.factor_box = factor_box
                    else:
                        print(f"Criando: {name}")
                        new_product = models.Product(
                            erp_code=code,
                            name=name,
                            keywords=name.lower(),
                            factor_pallet=factor_pallet,
                            factor_layer=factor_layer,
                            factor_box=factor_box
                        )
                        db.add(new_product)
                    
                    count_success += 1
                
                except Exception as e:
                    print(f"Erro na linha {row}: {e}")
                    count_error += 1
            
            db.commit()
            print("------------------------------------------------")
            print(f"Concluído! Sucessos: {count_success} | Erros: {count_error}")

    except FileNotFoundError:
        print(f"Erro: O arquivo '{csv_filename}' não foi encontrado na pasta backend.")
    except Exception as e:
        print(f"Erro crítico: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import_csv("produtos.csv")