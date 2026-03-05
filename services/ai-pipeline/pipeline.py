import cv2
from models.detector import PlayerDetector
from models.tracker import TrackerWrapper
from metrics import compute_player_metrics
import config


def process_video_with_tracking(video_path: str, model_version: str = 'yolov8n'):
    """
    Runs detection -> tracking -> metrics on a video file.

    Returns a dict with 'tracking' and 'metrics' payloads.
    """
    det = PlayerDetector(model_path=config.MODEL_PATH)
    tracker = TrackerWrapper()

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    # store trajectories: track_id -> list of {frame, bbox}
    trajectories = {}

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # run detection per frame
        dets = det.detect_frame(frame)  # list of {'bbox', 'confidence', 'class'}

        # update tracker
        tracks = tracker.update(dets, frame=frame)

        # store per-track bbox center/frame
        for t in tracks:
            tid = t['track_id']
            bbox = t['bbox']
            if tid not in trajectories:
                trajectories[tid] = []
            trajectories[tid].append({'frame': frame_idx, 'bbox': bbox})

        frame_idx += 1

    cap.release()

    # compute metrics
    meters_per_pixel = getattr(config, 'METERS_PER_PIXEL', None)
    metrics = compute_player_metrics(trajectories, fps, meters_per_pixel)

    tracking_payload = {
        'type': 'TRACKING',
        'fps': fps,
        'total_frames': total_frames,
        'trajectories': trajectories,
    }

    metrics_payload = {
        'type': 'METRICS',
        'fps': fps,
        'players': metrics,
    }

    return {
        'tracking': tracking_payload,
        'metrics': metrics_payload,
    }
