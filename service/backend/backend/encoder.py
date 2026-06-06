"""
encoder.py

Loads Florence-2 for image captioning and all-mpnet-base-v2 for text embeddings.
Florence-2 generates a detailed natural language description of an image.
That description is then encoded into a 768-d vector for semantic similarity search.
"""

from pathlib import Path

import numpy as np
import torch
from huggingface_hub import snapshot_download
from loguru import logger
from transformers import AutoModel, AutoModelForCausalLM, AutoProcessor
import torch.nn.functional as F

# Model paths
BASE_DIR = Path(__file__).resolve().parent.parent
FLORENCE_MODEL_ID = "microsoft/Florence-2-base"
FLORENCE_MODEL_PATH = BASE_DIR / "models" / "florence"
SENTENCE_MODEL_ID = "sentence-transformers/all-mpnet-base-v2"
SENTENCE_MODEL_PATH = BASE_DIR / "models" / "mpnet"

if not FLORENCE_MODEL_PATH.exists():
    logger.info(f"Florence-2 not found locally. Downloading '{FLORENCE_MODEL_ID}' ...")
    snapshot_download(
        repo_id=FLORENCE_MODEL_ID,
        local_dir=str(FLORENCE_MODEL_PATH),
        local_dir_use_symlinks=False,
    )
    logger.success(f"Downloaded Florence-2 to '{FLORENCE_MODEL_PATH}'")
else:
    logger.debug(f"Florence-2 already present at '{FLORENCE_MODEL_PATH}'")

if not SENTENCE_MODEL_PATH.exists():
    logger.info(
        f"SentenceTransformer not found locally. Downloading '{SENTENCE_MODEL_ID}' ..."
    )
    snapshot_download(
        repo_id=SENTENCE_MODEL_ID,
        local_dir=str(SENTENCE_MODEL_PATH),
        local_dir_use_symlinks=False,
    )
    logger.success(f"Downloaded SentenceTransformer to '{SENTENCE_MODEL_PATH}'")
else:
    logger.debug(f"SentenceTransformer already present at '{SENTENCE_MODEL_PATH}'")


# Encoder class
class ImageSemanticEncoder:
    """
    Two-stage encoder:
      1. Florence-2  →  detailed image caption (natural language)
      2. all-mpnet   →  768-d semantic embedding of that caption
    """

    def __init__(self) -> None:
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        logger.info(f"Loading models on device='{self.device}', dtype={self.dtype}")

        # Florence-2 (caption generation)
        logger.debug(f"Loading Florence-2 model from '{FLORENCE_MODEL_PATH}' ...")
        self.florence_model = AutoModelForCausalLM.from_pretrained(
            str(FLORENCE_MODEL_PATH),
            torch_dtype=self.dtype,
            trust_remote_code=True,
            local_files_only=True,
        ).to(self.device)

        self.florence_processor = AutoProcessor.from_pretrained(
            str(FLORENCE_MODEL_PATH),
            trust_remote_code=True,
            local_files_only=True,
        )
        logger.success("Florence-2 loaded successfully.")

        # Sentence Transformer (text to vector)
        logger.debug("Loading SentenceTransformer 'all-mpnet-base-v2' ...")
        self.text_tokenizer = AutoProcessor.from_pretrained(
            str(SENTENCE_MODEL_PATH),
            trust_remote_code=True,
            local_files_only=True,
        )
        self.text_model = AutoModel.from_pretrained(
            str(SENTENCE_MODEL_PATH),
            trust_remote_code=True,
            local_files_only=True,
        )
        logger.success(
            "SentenceTransformer (Tokenizer & AutoModel) loaded successfully."
        )

    def generate_description(self, image) -> str:
        """
        Runs Florence-2 on a PIL image and returns a detailed natural language caption.

        Args:
            image: PIL.Image (RGB)

        Returns:
            str: Detailed image description produced by Florence-2.
        """
        task_prompt = "<MORE_DETAILED_CAPTION>"
        logger.debug(
            f"Running Florence-2 caption generation (task='{task_prompt}') ..."
        )
        # 1. Prepare inputs for Florence-2
        inputs = self.florence_processor(
            text=task_prompt,
            images=image,
            return_tensors="pt",
        ).to(self.device, self.dtype)
        logger.debug(f"Shape of pixel_values: {inputs['pixel_values'].shape}")
        # 2. Generate caption ids and decode to text
        generated_ids = self.florence_model.generate(
            input_ids=inputs["input_ids"],
            pixel_values=inputs["pixel_values"],
            max_new_tokens=1024,
            num_beams=3,
            do_sample=False,
        )
        logger.debug(f"Shape of generated_ids: {generated_ids.shape}")
        # 3. Decode and post-process the raw text output
        raw_text = self.florence_processor.batch_decode(
            generated_ids,
            skip_special_tokens=False,
        )[0]
        # 4. Post-process to extract the final description (handles any special tokens or formatting)
        parsed = self.florence_processor.post_process_generation(
            raw_text,
            task=task_prompt,
            image_size=(image.width, image.height),
        )
        description = parsed[task_prompt]
        logger.debug(
            f"Generated description ({len(description)} chars): '{description[:30]}...'"
        )
        return description

    def generate_embedding(self, text: str) -> np.ndarray:
        """
        `https://huggingface.co/sentence-transformers/all-mpnet-base-v2`
        Encodes an input string into an L2-normalized 768-d float32 vector
        using pure Hugging Face Transformers and PyTorch calculations.
        """
        logger.debug(f"Encoding text (length={len(text)}) ...")

        # 1. Tokenize input string
        encoded_input = self.text_tokenizer(
            text, padding=True, truncation=True, return_tensors="pt"
        ).to(self.device)
        # 2. Compute token embeddings without calculating gradients
        with torch.no_grad():
            model_output = self.text_model(**encoded_input)
        # 3. Perform pooling using the Hugging Face logic
        sentence_embeddings = self._mean_pooling(
            model_output, encoded_input["attention_mask"]
        )
        # 4. L2 Normalize embeddings (crucial for Qdrant cosine similarity)
        sentence_embeddings = F.normalize(sentence_embeddings, p=2, dim=1)
        # 5. Convert to 1D NumPy array for Qdrant compatibility
        return sentence_embeddings.cpu().squeeze(0).numpy().astype(np.float32)

    def _mean_pooling(self, model_output, attention_mask):
        """Official Hugging Face Mean Pooling implementation."""
        token_embeddings = model_output[0]
        input_mask_expanded = (
            attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        )
        return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(
            input_mask_expanded.sum(1), min=1e-9
        )
