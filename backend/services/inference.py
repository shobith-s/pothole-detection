import os
import io
import base64
from PIL import Image
from ultralytics import YOLO

class DetectionService:
    def __init__(self, model_path: str = "backend/models/best.pt"):
        self.model_path = model_path
        self.model = None
        self._load_model()
        
    def _load_model(self):
        if os.path.exists(self.model_path):
            self.model = YOLO(self.model_path)
            print(f"Successfully loaded model from {self.model_path}")
        else:
            print(f"Warning: Model {self.model_path} not found!")

    def predict(self, image_bytes: bytes, conf_threshold: float = 0.25):
        if self.model is None:
            raise ValueError("Model not loaded. Ensure best.pt is in backend/models/.")

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Run inference
        results = self.model.predict(source=image, conf=conf_threshold)
        
        # Return plotted BGR numpy array
        res_plotted = results[0].plot()
        
        # Convert BGR (from OpenCV) to RGB
        im_rgb = res_plotted[..., ::-1]
        res_image = Image.fromarray(im_rgb)
        
        # Convert output image to base64
        buffered = io.BytesIO()
        res_image.save(buffered, format="JPEG", quality=85)
        img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        pothole_count = len(results[0].boxes)
        
        return {
            "potholes_detected": pothole_count,
            "image_base64": f"data:image/jpeg;base64,{img_base64}"
        }

# Instantiate a global service
detection_service = DetectionService()
