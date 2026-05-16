FROM python:3.9-slim

# 1. Set environment variables
ENV PYTHONUNBUFFERED=1 \
    HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# 2. Create a non-root user
RUN useradd -m -u 1000 user

# 3. Install system dependencies (Updated libgl1)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 4. Switch to the non-root user
USER user
WORKDIR $HOME/app

# 5. Copy requirements and install
COPY --chown=user requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# 6. Pre-download YOLOv8 model
ENV YOLO_CONFIG_DIR=$HOME/.config/Ultralytics
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n-pose.pt')"

# 7. Copy application code
COPY --chown=user . .

# 8. Start application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
