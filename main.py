from fastapi import FastAPI

app = FastAPI(title="CargVoice API")

@app.get("/")
def read_root():
    return {"message": "CargVoice Backend está rodando na porta 8000!"}