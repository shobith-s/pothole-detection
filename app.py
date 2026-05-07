import streamlit as st
from ultralytics import YOLO
from PIL import Image
import numpy as np
import os

st.set_page_config(layout="wide", page_title="Pothole Detection AI")

st.title("🛧️ Pothole Detection System")
st.markdown("""
This application uses a fine-tuned **YOLOv8 Nano** model to identify road hazards.
Simply upload an image of a road, and the AI will highlight any potholes it detects.
""")

# Load model
model_path = '/home/shobiths/projects/pothole/best.pt'
@st.cache_resource
def load_model():
    return YOLO(model_path)

if os.path.exists(model_path):
    model = load_model()
    
    uploaded_file = st.file_uploader("Choose a road image...", type=["jpg", "jpeg", "png"])

    if uploaded_file is not None:
        image = Image.open(uploaded_file)
        
        # Run inference
        results = model.predict(source=image, conf=0.25)
        
        # Process results
        for r in results:
            im_array = r.plot()
            res_image = Image.fromarray(im_array[..., ::-1])

        # Display Side by Side
        col1, col2 = st.columns(2)
        with col1:
            st.header("Original Image")
            st.image(image, use_container_width=True)
        with col2:
            st.header("AI Detection")
            st.image(res_image, use_container_width=True)
else:
    st.error("Model weights not found. Please ensure the training cell was run successfully.")
