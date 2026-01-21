import time
import sys

def process_video(video_id, video_url):
    print(f"--- AI Pipeline Process Started ---")
    print(f"Video ID: {video_id}")
    print(f"Video URL: {video_url}")
    
    # 1. Extract frames
    print("Step 1: Extracting frames...")
    time.sleep(2)
    
    # 2. Pose estimation
    print("Step 2: Running pose estimation (MediaPipe/OpenPose)...")
    time.sleep(3)
    
    # 3. Metric extraction
    print("Step 3: Extracting performance metrics...")
    time.sleep(2)
    
    # 4. Store results to database
    # In a real scenario, we would use a DB client or hit an internal API
    print(f"Step 4: Metrics for {video_id} stored successfully.")
    print(f"--- AI Pipeline Process Completed ---")
    return {"status": "SUCCESS", "metrics": {"speed": 12.5, "agility": 8.2}}

if __name__ == "__main__":
    if len(sys.argv) > 2:
        v_id = sys.argv[1]
        v_url = sys.argv[2]
    else:
        v_id = "test-video-id"
        v_url = "https://example.com/video.mp4"
        
    process_video(v_id, v_url)
