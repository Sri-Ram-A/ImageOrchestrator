import cv2
import numpy as np
from scipy.fftpack import dct
from PIL import Image, ImageOps


def dct2(img):
    return dct(dct(img.T, norm="ortho").T, norm="ortho")


def generate_phash(img: np.ndarray, hash_size: int = 8) -> str:
    # Convert OpenCV image to PIL Image
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(img)

    # Define the orientations to test
    orientations = [
        ("Original", pil_img.copy()),
        ("Rotated 90", pil_img.copy().rotate(90, expand=True)),
        ("Mirrored", ImageOps.mirror(pil_img.copy())),
    ]

    candidate_hashes = []

    for name, img_obj in orientations:
        # Process each orientation
        resize_dim = hash_size * 4
        img_resized = img_obj.resize((resize_dim, resize_dim), Image.Resampling.LANCZOS)
        img_gray = img_resized.convert("L")

        # Convert to numpy array for DCT
        img_array = np.array(img_gray, dtype=float)
        dct_coeffs = dct2(img_array)
        dct_reduced = dct_coeffs[:hash_size, :hash_size]

        # Compute hash
        ac_coeffs = dct_reduced.flatten()[1:]
        median_val = np.median(ac_coeffs)
        binary_matrix = dct_reduced >= median_val
        binary_str = "".join(binary_matrix.flatten().astype(int).astype(str))
        hex_hash = hex(int(binary_str, 2))[2:]
        candidate_hashes.append(hex_hash)

    # Return the smallest hash as canonical
    return min(candidate_hashes)


def compute_blur_score(img: np.ndarray) -> float:
    """
    Estimate sharpness using the variance of the Laplacian.
    Higher value = sharper image.
    A common threshold for "blurry" is < 100, but this depends on image size.
    Args:
        img: BGR image as a NumPy array.
    Returns:
        Laplacian variance as a float.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    return float(laplacian.var())
