# Pothole Detection Dashboard

Real-time pothole detection system with a FastAPI backend (YOLO inference) and a React dashboard frontend.

## Overview

This project lets you upload road images, run pothole detection using a trained YOLO model, and inspect detections in an interactive dashboard with overlays, thresholds, and logs.

## Features

- Image upload and preview
- Pothole detection using Ultralytics YOLO model weights
- Adjustable confidence and IoU thresholds
- Bounding box, label, and heatmap overlay controls
- Detection logs and inference timing metrics
- Health check endpoint for backend availability
- Frontend fallback mock detections if backend is unreachable

## Tech Stack

- Backend: FastAPI, Uvicorn, Ultralytics YOLO, Pillow
- Frontend: React, Vite, Tailwind CSS v4
- Training: Jupyter notebook workflow in train.ipynb
- Model artifact: backend/models/best.pt

## Project Structure

```text
pothole/
    backend/
        main.py                # FastAPI app entrypoint
        api/routes.py          # API routes (/ and /detect)
        services/inference.py  # YOLO model loading and prediction logic
        models/best.pt         # Trained model weights
        requirements.txt       # Backend Python dependencies
    frontend/
        src/App.jsx            # Main dashboard UI and control logic
        src/index.css          # Theme and styling
        package.json           # Frontend scripts/dependencies
    train.ipynb              # Model training and dataset prep notebook
    example.png              # Example output image
```

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- Git (optional, for cloning)

## Setup and Run

### 1. Clone and enter project

```bash
git clone <your-repo-url>
cd pothole
```

### 2. Backend setup (FastAPI)

Create and activate a virtual environment:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Start backend server:

```bash
cd ..
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend URL: http://localhost:8000

### 3. Frontend setup (React)

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL (default): http://localhost:5173

### 4. Use the app

- Open the frontend URL
- Upload an image
- Click Run Detection
- Use Controls to toggle overlays and tune thresholds

## API Reference

### GET /

Health check.

Example response:

```json
{
    "status": "ok",
    "message": "Pothole Detection API is running."
}
```

### POST /detect

Runs pothole detection on uploaded image.

Form fields:

- file: image file (required)
- conf_threshold: float, default 0.01
- iou_threshold: float, default 0.45

Example curl:

```bash
curl -X POST "http://localhost:8000/detect" \
    -F "file=@/path/to/image.jpg" \
    -F "conf_threshold=0.25" \
    -F "iou_threshold=0.45"
```

Example success response:

```json
{
    "status": "success",
    "potholes_detected": 2,
    "boxes": [
        {
            "xmin": 120.1,
            "ymin": 200.4,
            "xmax": 260.9,
            "ymax": 320.7,
            "conf": 0.91
        }
    ]
}
```

## Model Notes

- Runtime model path: backend/models/best.pt
- If model loading fails, /detect returns an error indicating model is not loaded
- For GPU acceleration, install a CUDA-compatible PyTorch build as recommended by Ultralytics docs

## Training Notebook

- Notebook: train.ipynb
- Contains dataset prep, annotation conversion, YOLO training, and evaluation workflow

## Troubleshooting

- Backend starts but /detect fails with import errors:
    - Ensure virtual environment is active
    - Reinstall: pip install -r backend/requirements.txt

- Frontend cannot reach backend:
    - Ensure backend is running on port 8000
    - Check browser console/network tab for request errors

- No detections shown:
    - Lower confidence threshold in Controls
    - Verify uploaded image quality and pothole visibility
    - Confirm model file exists at backend/models/best.pt

## Design Assets Folder

The separate folder stitch_pothole_detection_dashboard in your workspace contains Stitch design artifacts (DESIGN.md, code.html, screen.png). It is not used directly by the runtime FastAPI + React app.
