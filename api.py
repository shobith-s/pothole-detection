from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import uvicorn
from PIL import Image
import io
import base64
import os

app = FastAPI()

# Allow frontend to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional: Ensure model exists before loading
MODEL_PATH = "best.pt"

if os.path.exists(MODEL_PATH):
    model = YOLO(MODEL_PATH)
else:
    model = None
    print(f"Warning: Model {MODEL_PATH} not found!")

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Pothole Detection API is running."}

@app.post("/detect")
async def detect_potholes(file: UploadFile = File(...)):
    if model is None:
        return {"error": "Model not loaded. Ensure best.pt is in the project root."}
        
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Run inference
        results = model.predict(source=image, conf=0.25)
        
        # Return plotted BGR numpy array
        res_plotted = results[0].plot()
        
        # Convert BGR (from OpenCV) to RGB
        im_rgb = res_plotted[..., ::-1]
        res_image = Image.fromarray(im_rgb)
        
        # Convert output image to base64 for frontend display
        buffered = io.BytesIO()
        res_image.save(buffered, format="JPEG", quality=85)
        img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        pothole_count = len(results[0].boxes)
        
        return {
            "status": "success",
            "potholes_detected": pothole_count,
            "image_base64": f"data:image/jpeg;base64,{img_base64}"
        }
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
