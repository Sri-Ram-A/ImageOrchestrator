from fastapi import FastAPI, UploadFile, File
from fastapi.responses import Response
import cv2
import numpy as np
import io
import time
import random

app = FastAPI()


@app.post("/process/grayscale")
async def grayscale_image(file: UploadFile = File(...)):
    # Simulate real-world processing delay
    time.sleep(random.randint(10, 30))

    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray_bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

    _, buffer = cv2.imencode(".jpg", gray_bgr)
    return Response(content=buffer.tobytes(), media_type="image/jpeg")
