import os
import io
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

    def predict(self, image_bytes: bytes, conf_threshold: float = 0.05, iou_threshold: float = 0.45):
        if self.model is None:
            raise ValueError("Model not loaded. Ensure best.pt is in backend/models/.")

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Keep inference bounded for free-tier CPU instances.
        results = self.model.predict(
            source=image,
            conf=conf_threshold,
            iou=iou_threshold,
            imgsz=640,
            device="cpu",
            verbose=False,
        )
        
        boxes_data = []
        if len(results) > 0 and results[0].boxes:
            for box in results[0].boxes:
                b = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                boxes_data.append({
                    "xmin": b[0],
                    "ymin": b[1],
                    "xmax": b[2],
                    "ymax": b[3],
                    "conf": conf
                })
        
        return {
            "potholes_detected": len(boxes_data),
            "boxes": boxes_data
        }

# Instantiate a global service
detection_service = DetectionService()
