import os
from dotenv import load_dotenv

load_dotenv()

# Redis Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
QUEUE_NAME = "analysis"

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL")

# Model Configuration
MODEL_PATH = os.getenv("MODEL_PATH", "yolov8n.pt")  # nano model for speed
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))

# Video Processing
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "../../uploads/videos")
