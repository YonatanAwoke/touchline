# Python CV Service

This service processes football videos using YOLOv8 for player detection.

## Setup

1. **Install Python 3.10+** (if not already installed)

2. **Create virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Linux/Mac
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set environment variables:**
   Create a `.env` file in this directory:
   ```env
   REDIS_URL=redis://localhost:6379
   DATABASE_URL=postgresql://user:password@localhost:5432/touchline
   UPLOAD_DIR=../../uploads/videos
   MODEL_PATH=yolov8n.pt
   CONFIDENCE_THRESHOLD=0.5
   ```

## Usage

### Test Detector (Standalone)
```bash
python tests/test_detector.py
```

### Start Worker (Production)
```bash
python worker.py
```

## Current Status (Phase 1)

- ✅ YOLOv8 player detection
- ✅ Redis job consumer
- ✅ Database integration
- ⏳ Player tracking (Phase 2)
- ⏳ Metrics calculation (Phase 3)
