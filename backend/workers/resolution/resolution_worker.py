from fastapi import FastAPI, UploadFile, File
from fastapi.responses import Response
import cv2
import numpy as np
import io
import time
import random

app = FastAPI()


@app.post("/process/resolution")
async def upscale_resolution(file: UploadFile = File(...)):
    # Simulate real-world processing delay
    time.sleep(random.randint(10, 30))

    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    height, width = image.shape[:2]
    scaled = cv2.resize(image, (width * 2, height * 2), interpolation=cv2.INTER_CUBIC)

    _, buffer = cv2.imencode(".jpg", scaled)
    return Response(content=buffer.tobytes(), media_type="image/jpeg")
