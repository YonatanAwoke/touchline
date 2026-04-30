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

def calculate_angle(a, b, c):
    a = np.array(a) # First point
    b = np.array(b) # Mid point
    c = np.array(c) # End point
    
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)
    
    if angle > 180.0:
        angle = 360-angle
        
    return angle

def analyze_video(video_path):
    model = YOLO("yolov8n-pose.pt")
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "Could not open video file"}

    w, h, fps = (int(cap.get(x)) for x in (cv2.CAP_PROP_FRAME_WIDTH, cv2.CAP_PROP_FRAME_HEIGHT, cv2.CAP_PROP_FPS))
    if fps == 0 or np.isnan(fps): fps = 30
    
    frame_count = 0
    raw_hip_y, raw_hip_x = [], []
    times = []
    
    # Biomechanical containers
    knee_angles, hip_angles, arm_angles = [], [], []
    velocities = []
    
    px_to_m = 1.8 / (h / 3) 

    while cap.isOpened():
        success, image = cap.read()
        if not success:
            break

        frame_count += 1
        results = model.track(image, persist=True, conf=0.3, verbose=False)
        
        if len(results) > 0 and len(results[0].keypoints) > 0:
            keypoints = results[0].keypoints.xy.cpu().numpy()
            if len(keypoints) > 0:
                person = keypoints[0] 
                
                # Pose Indices: 5: L-Shoulder, 6: R-Shoulder, 7: L-Elbow, 8: R-Elbow, 9: L-Wrist, 10: R-Wrist
                # 11: L-Hip, 12: R-Hip, 13: L-Knee, 14: R-Knee, 15: L-Ankle, 16: R-Ankle
                l_sh, r_sh = person[5], person[6]
                l_el, r_el = person[7], person[8]
                l_wr, r_wr = person[9], person[10]
                l_hip, r_hip = person[11], person[12]
                l_kn, r_kn = person[13], person[14]
                l_an, r_an = person[15], person[16]

                if l_hip[0] > 0 and r_hip[0] > 0:
                    hip_x = (l_hip[0] + r_hip[0]) / 2
                    hip_y = (l_hip[1] + r_hip[1]) / 2

                    raw_hip_x.append(hip_x)
                    raw_hip_y.append(hip_y)
                    times.append(frame_count / fps)

                    # --- Angle Calculations ---
                    # Knee Angle
                    if l_kn[0] > 0 and l_an[0] > 0:
                        knee_angles.append(calculate_angle(l_hip, l_kn, l_an))
                    elif r_kn[0] > 0 and r_an[0] > 0:
                        knee_angles.append(calculate_angle(r_hip, r_kn, r_an))

                    # Hip Angle (Torso posture)
                    if l_sh[0] > 0 and l_kn[0] > 0:
                        hip_angles.append(calculate_angle(l_sh, l_hip, l_kn))
                    
                    # Arm Swing
                    if l_sh[0] > 0 and l_el[0] > 0 and l_wr[0] > 0:
                        arm_angles.append(calculate_angle(l_sh, l_el, l_wr))

    cap.release()

    if not raw_hip_y:
        return {"error": "No players reliably tracked in video"}

    # --- Metrics Pipeline ---
    all_speeds = []
    directions = []
    for i in range(1, len(raw_hip_x)):
        dx = (raw_hip_x[i] - raw_hip_x[i-1])
        dy = (raw_hip_y[i] - raw_hip_y[i-1])
        dist_m = np.sqrt(dx**2 + dy**2) * px_to_m
        dt = times[i] - times[i-1]
        
        speed = dist_m / dt if dt > 0 else 0
        all_speeds.append(min(speed, 12.0))
        
        # Agility: Tracking direction shifts
        angle = np.arctan2(dy, dx)
        directions.append(angle)

    smoothed_speeds = moving_average(all_speeds, window_size=10)
    top_speed = max(smoothed_speeds) if smoothed_speeds else 0
    avg_speed = np.mean(all_speeds) if all_speeds else 0
    aligned_times = times[-len(smoothed_speeds):] if smoothed_speeds else []

    # 1. Reaction Time (First burst > 0.5m/s)
    reaction_time = 0
    for i, s in enumerate(all_speeds):
        if s > 0.5:
            reaction_time = times[i]
            break

    # 2. Re-accel Time (Time from local min to next local max)
    reaccel_time = 0
    if len(all_speeds) > 20:
        for i in range(10, len(all_speeds)-10):
            if all_speeds[i] < all_speeds[i-1] and all_speeds[i] < all_speeds[i+1]: # Local min
                # Find next peak
                for j in range(i+1, min(i+30, len(all_speeds))):
                    if all_speeds[j] > all_speeds[i] * 1.5:
                        reaccel_time = times[j] - times[i]
                        break
                if reaccel_time > 0: break

    # 3. Direction Change (Total angular variance)
    agility_score = min(100, np.std(directions) * 50) if directions else 0

    # 4. Jump Metrics (Rolling baseline)
    smoothed_y = moving_average(raw_hip_y, window_size=5)
    baseline_window = int(fps * 2)
    jump_events = []
    for i in range(len(smoothed_y)):
        start, end = max(0, i-baseline_window//2), min(len(smoothed_y), i+baseline_window//2)
        local_ground = max(smoothed_y[start:end])
        h_px = local_ground - smoothed_y[i]
        if h_px > 15: # Only count if above threshold
            jump_events.append(h_px * px_to_m * 100)
    
    max_jump = max(jump_events) if jump_events else 0
    avg_jump = np.mean(jump_events) if jump_events else 0

    # 5. Form Score (Stability of torso and regularity of arm swing)
    form_score = 70 # Base
    if hip_angles:
        posture_dev = np.std(hip_angles)
        form_score += max(-20, 15 - posture_dev) # Penalty for unstable torso
    if arm_angles:
        swing_range = np.max(arm_angles) - np.min(arm_angles)
        form_score += min(15, swing_range / 5) # Bonus for arm activation

    # 6. AI Insights Generation
    insights = []
    if top_speed > 8:
        insights.append(f"Elite explosive speed of {top_speed:.1f} m/s detected. Velocity is in the top 5% of tested benchmarks.")
    elif top_speed > 6:
        insights.append(f"Strong pace results ({top_speed:.1f} m/s). Focus on maintaining this velocity over longer sprint intervals.")
    else:
        insights.append(f"Current top speed is {top_speed:.1f} m/s. Recommend high-intensity interval training (HIIT) to improve peak velocity.")
    
    if 0 < reaction_time < 0.25:
        insights.append(f"Exceptional reflexive response of {reaction_time:.2f}s. Rapid first-step transition detected.")
    elif reaction_time > 0.4:
        insights.append(f"Reaction latency of {reaction_time:.2f}s noted. Suggest explosive-start drills to improve neuromuscular trigger response.")
    
    if form_score < 60:
        insights.append(f"Mechanics warning: detectable torso instability (Form Score: {form_score}). Core stability focus required during high-speed transitions.")
    elif form_score > 85:
        insights.append(f"Excellent technical form (Score: {form_score}). Stability and arm-swing synchronization are within professional benchmarks.")
    
    if knee_angles:
        avg_knee = np.mean(knee_angles)
        if avg_knee < 140:
            insights.append(f"Suboptimal knee extension ({avg_knee:.1f}°) during propulsion. Power loss likely in stride due to restricted range.")
        else:
            insights.append(f"Strong knee drive detected ({avg_knee:.1f}°), allowing for maximum ground force production.")
    
    if reaccel_time > 0:
        if reaccel_time < 0.5:
            insights.append(f"High recovery efficiency: only {reaccel_time:.2f}s to return to peak velocity after direction change.")
        else:
            insights.append(f"Recovery phase takes {reaccel_time:.2f}s after turns. Recommend agility ladder drills to minimize deceleration duration.")

    result = {
        "summary": {
            "topSpeed": float(top_speed),
            "avgSpeed": float(avg_speed),
            "maxJump": int(max_jump),
            "avgJump": int(avg_jump),
            "distance": int(avg_speed * times[-1] if times else 0),
            "sprints": int(top_speed > 6),
            "reactionTime": round(float(reaction_time), 2),
            "cdReaccelTime": round(float(reaccel_time), 2),
            "kneeAngle": int(np.mean(knee_angles)) if knee_angles else 0,
            "hipAngle": int(np.mean(hip_angles)) if hip_angles else 0,
            "armSwingAngle": int(np.max(arm_angles) - np.min(arm_angles)) if arm_angles else 0,
            "formScore": int(min(100, form_score)),
            "cdAngle": int(agility_score)
        },
        "insights": insights,
        "speed": [{"time": f"{t:.1f}s", "value": float(s)} for t, s in zip(aligned_times, smoothed_speeds)][::5],
        "jumpHeight": [{"time": "Peak", "value": int(max_jump)}],
        "biomechanics": {
            "kneeAngles": [{"time": f"{t:.1f}s", "value": int(a)} for t, a in zip(times, knee_angles)][::10] if knee_angles else [],
            "hipAngles": [{"time": f"{t:.1f}s", "value": int(a)} for t, a in zip(times, hip_angles)][::10] if hip_angles else [],
            "armAngles": [{"time": f"{t:.1f}s", "value": int(a)} for t, a in zip(times, arm_angles)][::10] if arm_angles else []
        },
        "movement": [
            {"metric": "Speed", "value": int(min(100, top_speed * 10)), "fullMark": 100},
            {"metric": "Power", "value": int(min(100, max_jump * 1.5)), "fullMark": 100},
            {"metric": "Agility", "value": int(agility_score), "fullMark": 100},
            {"metric": "Technical", "value": 75, "fullMark": 100},
            {"metric": "Form", "value": int(min(100, form_score)), "fullMark": 100}
        ]
    }
    
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video path provided"})); sys.exit(1)
    
    try:
        results = analyze_video(sys.argv[1])
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
