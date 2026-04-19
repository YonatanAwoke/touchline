import cv2
import numpy as np
import json
import sys
import os

os.environ["YOLO_VERBOSE"] = "False"
from ultralytics import YOLO

def moving_average(data, window_size=5):
    if len(data) < window_size:
        return data
    return np.convolve(data, np.ones(window_size)/window_size, mode='valid').tolist()

def analyze_video(video_path):
    # Fetch a fresh named model to bypass any corrupted PyTorch archives
    model = YOLO("yolov8n-pose.pt")
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "Could not open video file"}

    w, h, fps = (int(cap.get(x)) for x in (cv2.CAP_PROP_FRAME_WIDTH, cv2.CAP_PROP_FRAME_HEIGHT, cv2.CAP_PROP_FPS))
    if fps == 0 or np.isnan(fps): fps = 30
    
    frame_count = 0
    raw_hip_y = []
    raw_hip_x = []
    times = []
    
    # Simple calibration: pixels to meters. Assume player is 1.8m tall and occupies roughly 1/3 height in video
    px_to_m = 1.8 / (h / 3) 

    while cap.isOpened():
        success, image = cap.read()
        if not success:
            break

        frame_count += 1
        # Track every frame for smooth tracking persistence, but we can still downsample logic
        
        # Lower confidence to 0.3 and use persistent tracking for robust athletic movements
        results = model.track(image, persist=True, conf=0.3, verbose=False)
        
        # We assume the most confident person (class 0 is person in COCO)
        if len(results) > 0 and len(results[0].keypoints) > 0:
            keypoints = results[0].keypoints.xy.cpu().numpy()
            if len(keypoints) > 0:
                person = keypoints[0] # primary target
                
                # YOLOv8 Pose Indices: 5: L-Shoulder, 6: R-Shoulder, 11: L-Hip, 12: R-Hip
                left_hip = person[11]
                right_hip = person[12]

                if left_hip[0] > 0 and right_hip[0] > 0:
                    hip_x = (left_hip[0] + right_hip[0]) / 2
                    hip_y = (left_hip[1] + right_hip[1]) / 2

                    raw_hip_x.append(hip_x)
                    raw_hip_y.append(hip_y)
                    times.append(frame_count / fps)

    cap.release()

    if not raw_hip_y:
        return {"error": "No players reliably tracked in video"}

    # --- CALCULATE METRICS (Instantaneous Pipeline) ---
    
    all_speeds = []
    # Calculate raw frame-to-frame instantaneous speeds
    for i in range(1, len(raw_hip_x)):
        dx = (raw_hip_x[i] - raw_hip_x[i-1]) # removed 1000x scaling factor
        dy = (raw_hip_y[i] - raw_hip_y[i-1])
        dist_meters = np.sqrt(dx**2 + dy**2) * px_to_m
        dt = times[i] - times[i-1]
        
        # m/s instantaneous rate
        inst_speed = dist_meters / dt if dt > 0 else 0
        all_speeds.append(min(inst_speed, 12.0)) # cap realistic burst speed

    if not all_speeds:
        all_speeds = [0]

    # Smooth the speeds to remove bounding box jitter (e.g. 10 frame window)
    smoothed_speeds = moving_average(all_speeds, window_size=10)
    
    top_speed = max(smoothed_speeds) if smoothed_speeds else 0
    avg_speed = np.mean(all_speeds) if all_speeds else 0

    aligned_speed_times = times[-len(smoothed_speeds):] if smoothed_speeds else []

    # 2. Jump Height (Rolling Local Baseline for event detection)
    smoothed_y = moving_average(raw_hip_y, window_size=5)
    baseline_window = int(fps * 2) # roughly 2 seconds
    
    continuous_heights = []
    for i in range(len(smoothed_y)):
        start = max(0, i - baseline_window // 2)
        end = min(len(smoothed_y), i + baseline_window // 2)
        local_ground = max(smoothed_y[start:end])
        height_px = local_ground - smoothed_y[i]
        continuous_heights.append(max(0, height_px))

    # Find distinct jump peaks
    jump_events = []
    for i in range(1, len(continuous_heights) - 1):
        if continuous_heights[i] > continuous_heights[i-1] and continuous_heights[i] > continuous_heights[i+1]:
            if continuous_heights[i] > 15: # threshold for a distinct bound/jump
                jump_events.append(continuous_heights[i] * px_to_m * 100)

    if jump_events:
        max_jump_cm = max(0, min(120, max(jump_events)))
        avg_jump_cm = max(0, min(120, np.mean(jump_events)))
        jump_height_cm = max_jump_cm
    else:
        # Fallback if no specific jump events were detected
        ground_y = max(smoothed_y)
        peak_y = min(smoothed_y)
        fallback_px = (ground_y - peak_y)
        jump_height_cm = max(0, min(120, fallback_px * px_to_m * 100))
        max_jump_cm = jump_height_cm
        avg_jump_cm = jump_height_cm * 0.75

    # 3. Radar Metrics
    agility = min(100, np.std(raw_hip_x))
    stamina = 85 
    technical = 75
    power = min(100, jump_height_cm * 1.5)
    speed_rating = min(100, top_speed * 10)

    result = {
        "summary": {
            "topSpeed": float(top_speed),
            "avgSpeed": float(avg_speed),
            "maxJump": int(max_jump_cm),
            "avgJump": int(avg_jump_cm),
            "distance": int(avg_speed * times[-1] if len(times) > 0 else 0),
            "sprints": int(top_speed > 6)
        },
        "speed": [{"time": f"{t:.1f}s", "value": float(s)} for t, s in zip(aligned_speed_times, smoothed_speeds)][::5],
        "jumpHeight": [{"time": "Peak", "value": int(jump_height_cm)}],
        "movement": [
            {"metric": "Speed", "value": int(speed_rating), "fullMark": 100},
            {"metric": "Power", "value": int(power), "fullMark": 100},
            {"metric": "Agility", "value": int(agility), "fullMark": 100},
            {"metric": "Technical", "value": int(technical), "fullMark": 100},
            {"metric": "Stamina", "value": int(stamina), "fullMark": 100}
        ]
    }
    
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video path provided"}))
        sys.exit(1)
    
    video_path = sys.argv[1]
    if not os.path.exists(video_path):
        print(json.dumps({"error": f"File not found: {video_path}"}))
        sys.exit(1)

    try:
        results = analyze_video(video_path)
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
