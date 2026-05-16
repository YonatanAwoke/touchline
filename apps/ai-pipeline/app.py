from fastapi import FastAPI, UploadFile, File, HTTPException
import shutil
import os
import json
import numpy as np
import cv2
from ultralytics import YOLO
import tempfile

app = FastAPI()

# Load model globally to cache it
model = YOLO("yolov8n-pose.pt")

def moving_average(data, window_size=5):
    if len(data) < window_size:
        return data
    return np.convolve(data, np.ones(window_size)/window_size, mode='valid').tolist()

def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)
    if angle > 180.0:
        angle = 360-angle
    return angle

@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    # Create temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        shutil.copyfileobj(file.file, tmp)
        temp_path = tmp.name

    try:
        cap = cv2.VideoCapture(temp_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video file")

        w, h, fps = (int(cap.get(x)) for x in (cv2.CAP_PROP_FRAME_WIDTH, cv2.CAP_PROP_FRAME_HEIGHT, cv2.CAP_PROP_FPS))
        if fps == 0 or np.isnan(fps): fps = 30
        
        frame_count = 0
        raw_hip_y, raw_hip_x = [], []
        times = []
        knee_angles, hip_angles, arm_angles = [], [], []
        
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

                        if l_kn[0] > 0 and l_an[0] > 0: knee_angles.append(calculate_angle(l_hip, l_kn, l_an))
                        elif r_kn[0] > 0 and r_an[0] > 0: knee_angles.append(calculate_angle(r_hip, r_kn, r_an))
                        if l_sh[0] > 0 and l_kn[0] > 0: hip_angles.append(calculate_angle(l_sh, l_hip, l_kn))
                        if l_sh[0] > 0 and l_el[0] > 0 and l_wr[0] > 0: arm_angles.append(calculate_angle(l_sh, l_el, l_wr))

        cap.release()

        if not raw_hip_y:
            return {"error": "No players reliably tracked in video"}

        # Metrics Pipeline
        all_speeds = []
        directions = []
        for i in range(1, len(raw_hip_x)):
            dx = (raw_hip_x[i] - raw_hip_x[i-1])
            dy = (raw_hip_y[i] - raw_hip_y[i-1])
            dist_m = np.sqrt(dx**2 + dy**2) * px_to_m
            dt = times[i] - times[i-1]
            speed = dist_m / dt if dt > 0 else 0
            all_speeds.append(min(speed, 12.0))
            directions.append(np.arctan2(dy, dx))

        smoothed_speeds = moving_average(all_speeds, window_size=10)
        top_speed = max(smoothed_speeds) if smoothed_speeds else 0
        avg_speed = np.mean(all_speeds) if all_speeds else 0
        aligned_times = times[-len(smoothed_speeds):] if smoothed_speeds else []

        reaction_time = 0
        for i, s in enumerate(all_speeds):
            if s > 0.5:
                reaction_time = times[i]
                break

        reaccel_time = 0
        if len(all_speeds) > 20:
            for i in range(10, len(all_speeds)-10):
                if all_speeds[i] < all_speeds[i-1] and all_speeds[i] < all_speeds[i+1]:
                    for j in range(i+1, min(i+30, len(all_speeds))):
                        if all_speeds[j] > all_speeds[i] * 1.5:
                            reaccel_time = times[j] - times[i]
                            break
                    if reaccel_time > 0: break

        agility_score = min(100, np.std(directions) * 50) if directions else 0
        smoothed_y = moving_average(raw_hip_y, window_size=5)
        baseline_window = int(fps * 2)
        jump_events = []
        for i in range(len(smoothed_y)):
            start, end = max(0, i-baseline_window//2), min(len(smoothed_y), i+baseline_window//2)
            local_ground = max(smoothed_y[start:end])
            h_px = local_ground - smoothed_y[i]
            if h_px > 15: jump_events.append(h_px * px_to_m * 100)
        
        max_jump = max(jump_events) if jump_events else 0
        avg_jump = np.mean(jump_events) if jump_events else 0

        form_score = 70
        if hip_angles: form_score += max(-20, 15 - np.std(hip_angles))
        if arm_angles: form_score += min(15, (np.max(arm_angles) - np.min(arm_angles)) / 5)

        insights = []
        if top_speed > 8: insights.append(f"Elite explosive speed of {top_speed:.1f} m/s detected.")
        elif top_speed > 6: insights.append(f"Strong pace results ({top_speed:.1f} m/s).")
        else: insights.append(f"Current top speed is {top_speed:.1f} m/s. Recommend HIIT.")
        
        result = {
            "summary": {
                "topSpeed": float(top_speed), "avgSpeed": float(avg_speed),
                "maxJump": int(max_jump), "avgJump": int(avg_jump),
                "distance": int(avg_speed * times[-1] if times else 0), "sprints": int(top_speed > 6),
                "reactionTime": round(float(reaction_time), 2), "cdReaccelTime": round(float(reaccel_time), 2),
                "kneeAngle": int(np.mean(knee_angles)) if knee_angles else 0,
                "hipAngle": int(np.mean(hip_angles)) if hip_angles else 0,
                "armSwingAngle": int(np.max(arm_angles) - np.min(arm_angles)) if arm_angles else 0,
                "formScore": int(min(100, form_score)), "cdAngle": int(agility_score)
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
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/")
def health():
    return {"status": "healthy"}
