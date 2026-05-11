from fastapi import APIRouter, UploadFile, File
from backend.services.inference import detection_service

router = APIRouter()

@router.get("/")
def health_check():
    return {"status": "ok", "message": "Pothole Detection API is running."}

@router.post("/detect")
async def detect_potholes(file: UploadFile = File(...), conf_threshold: float = 0.25):
    try:
        contents = await file.read()
        
        # Call inference service
        result = detection_service.predict(contents, conf_threshold=conf_threshold)
        
        return {
            "status": "success",
            **result
        }
    except ValueError as ve:
        return {"error": str(ve)}
    except Exception as e:
        return {"error": str(e)}
