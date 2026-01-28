from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import CONFIG
from .schemas import CollectionCalculationRequest, CollectionCalculationResponse
from .services.collection_logic import calculate_collection

app = FastAPI(title=CONFIG.app_name, debug=CONFIG.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": CONFIG.app_name}


@app.post("/collections/calculate", response_model=CollectionCalculationResponse)
async def calculate_collection_route(payload: CollectionCalculationRequest):
    try:
        return calculate_collection(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - unexpected errors
        raise HTTPException(status_code=500, detail="Failed to calculate collection") from exc
