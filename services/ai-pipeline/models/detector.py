from ultralytics import YOLO
import cv2
import numpy as np
from typing import List, Dict, Tuple
import config

class PlayerDetector:
    """
    Wrapper for YOLOv8 model to detect players in football videos.
    """
    
    def __init__(self, model_path: str = config.MODEL_PATH):
        """
        Initialize the YOLO model.
        
        Args:
            model_path: Path to YOLO model weights
        """
        print(f"Loading YOLO model from {model_path}...")
        self.model = YOLO(model_path)
        self.confidence_threshold = config.CONFIDENCE_THRESHOLD
        print("Model loaded successfully!")
    
    def detect_frame(self, frame: np.ndarray) -> List[Dict]:
        """
        Detect players in a single frame.
        
        Args:
            frame: Video frame as numpy array (BGR format)
            
        Returns:
            List of detections with format:
            [
                {
                    'bbox': [x1, y1, x2, y2],
                    'confidence': 0.95,
                    'class': 'person'
                },
                ...
            ]
        """
        results = self.model(frame, verbose=False)[0]
        
        detections = []
        for box in results.boxes:
            # Filter for 'person' class (class_id = 0 in COCO dataset)
            if int(box.cls[0]) == 0:
                confidence = float(box.conf[0])
                
                if confidence >= self.confidence_threshold:
                    bbox = box.xyxy[0].cpu().numpy().tolist()
                    detections.append({
                        'bbox': bbox,
                        'confidence': confidence,
                        'class': 'person'
                    })
        
        return detections
    
    def process_video(self, video_path: str) -> Dict:
        """
        Process entire video and return frame-by-frame detections.
        
        Args:
            video_path: Path to video file
            
        Returns:
            Dictionary with video metadata and detections:
            {
                'total_frames': 500,
                'fps': 30,
                'detections': [
                    {'frame': 0, 'players': [...]},
                    {'frame': 1, 'players': [...]},
                    ...
                ]
            }
        """
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"Processing video: {total_frames} frames @ {fps} FPS")
        
        all_detections = []
        frame_idx = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            detections = self.detect_frame(frame)
            all_detections.append({
                'frame': frame_idx,
                'players': detections
            })
            
            frame_idx += 1
            
            # Progress update every 30 frames
            if frame_idx % 30 == 0:
                print(f"Processed {frame_idx}/{total_frames} frames...")
        
        cap.release()
        
        return {
            'total_frames': total_frames,
            'fps': fps,
            'detections': all_detections
        }
