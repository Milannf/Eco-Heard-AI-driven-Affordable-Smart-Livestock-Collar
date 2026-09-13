from fastapi import FastAPI, UploadFile, File
from services.vision import process_image

app = FastAPI(title="Cattle Tracking API")

@app.get("/")
def read_root():
    return {"message": "YOLOv8 Backend is running!"}

@app.post("/predict")
async def predict_image(file: UploadFile = File(...)):
    # Read the incoming image file
    image_bytes = await file.read()
    
    # Pass it to our vision service
    result = process_image(image_bytes)
    
    return result