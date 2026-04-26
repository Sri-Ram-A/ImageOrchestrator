import threading
import requests
import time

# Worker pool with 2 containers per process
worker_pool = {
    "grayscale": {"8001": "free", "8003": "free"},
    "resolution": {"8002": "free", "8004": "free"},
}

lock = threading.Lock()


def assign_worker(process_type, wait_timeout=600):
    """Wait until a free worker is available or timeout occurs."""
    start_time = time.time()
    while time.time() - start_time < wait_timeout:
        with lock:
            for port, status in worker_pool[process_type].items():
                if status == "free":
                    worker_pool[process_type][port] = "busy"
                    return port
        time.sleep(1)

    return None


def release_worker(process_type, port):
    """Mark a worker as free after processing is done."""
    with lock:
        worker_pool[process_type][port] = "free"


def send_to_worker(process_type, file_bytes, filename):
    """Send the image to an available worker and return the processed result."""
    port = assign_worker(process_type)
    if not port:
        return None, "No free worker available"
    try:
        print(
            f"[{process_type.upper()}] ✅ Assigned worker at port {port} for file '{filename}'"
        )
        start = time.time()

        url = f"http://localhost:{port}/process/{process_type}"
        files = {"file": (filename, file_bytes, "image/jpeg")}
        res = requests.post(url, files=files, timeout=90)
        end = time.time()
        print(
            f"[{process_type.upper()}] ⏱️ Time taken by worker {port}: {end - start:.2f} seconds"
        )
        if res.status_code == 200:
            return res.content, port
        else:
            return None, f"Worker error: {res.status_code} {res.text}"
    except Exception as e:
        return None, str(e)
