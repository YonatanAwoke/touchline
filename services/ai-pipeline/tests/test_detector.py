"""
Test script to verify YOLOv8 detector works on a sample video.
Run this before starting the full worker.
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from models.detector import PlayerDetector

def test_detector():
    print("Testing YOLOv8 detector...")
    
    # Initialize detector (will download model if not present)
    detector = PlayerDetector()
    
    # Test on a sample video
    # You can replace this with any video path
    video_path = "../../uploads/videos/1_1771239460142_a21174c8.mp4"
    
    if not Path(video_path).exists():
        print(f"❌ Video not found: {video_path}")
        print("Please update the path to an existing video")
        return
    
    print(f"\nProcessing video: {video_path}")
    results = detector.process_video(video_path)
    
    print(f"\n{'='*60}")
    print("RESULTS:")
    print(f"{'='*60}")
    print(f"Total frames: {results['total_frames']}")
    print(f"FPS: {results['fps']}")
    print(f"Detections in first frame: {len(results['detections'][0]['players'])}")
    
    # Show sample detection
    if results['detections'][0]['players']:
        sample = results['detections'][0]['players'][0]
        print(f"\nSample detection:")
        print(f"  Bounding box: {sample['bbox']}")
        print(f"  Confidence: {sample['confidence']:.2f}")
    
    print(f"\n✅ Test completed successfully!")

if __name__ == "__main__":
    test_detector()
