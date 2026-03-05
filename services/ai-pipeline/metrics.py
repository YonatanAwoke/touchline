import math
from typing import List, Dict


def bbox_center(bbox):
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)


def euclidean(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def compute_player_metrics(trajectories: Dict[int, List[Dict]], fps: float, meters_per_pixel: float = None):
    """
    trajectories: {track_id: [{'frame': int, 'bbox': [x1,y1,x2,y2]}...]}
    fps: frames per second
    meters_per_pixel: optional scale to convert pixels -> meters

    Returns metrics per player.
    """
    results = {}
    for tid, frames in trajectories.items():
        if not frames:
            continue
        total_dist_px = 0.0
        max_speed_m_s = 0.0
        prev_center = None
        prev_time = None
        for f in frames:
            c = bbox_center(f['bbox'])
            t = f['frame'] / fps if fps and fps > 0 else 0
            if prev_center is not None:
                d_px = euclidean(c, prev_center)
                dt = t - prev_time if prev_time is not None else 1.0 / fps
                total_dist_px += d_px
                # compute speed in m/s if scale provided, else px/s
                if meters_per_pixel:
                    speed = (d_px * meters_per_pixel) / dt if dt > 0 else 0
                    max_speed_m_s = max(max_speed_m_s, speed)
                else:
                    speed = (d_px) / dt if dt > 0 else 0
                    max_speed_m_s = max(max_speed_m_s, speed)

            prev_center = c
            prev_time = t

        if meters_per_pixel:
            total_dist = total_dist_px * meters_per_pixel
            max_speed = max_speed_m_s
        else:
            total_dist = total_dist_px
            max_speed = max_speed_m_s

        # sprint detection: naive threshold on instantaneous speed (>6 m/s if scale known, else >50 px/s)
        sprint_threshold = 6.0 if meters_per_pixel else 50.0
        sprints = 0
        prev_center = None
        prev_time = None
        for f in frames:
            c = bbox_center(f['bbox'])
            t = f['frame'] / fps if fps and fps > 0 else 0
            if prev_center is not None:
                d_px = euclidean(c, prev_center)
                dt = t - prev_time if prev_time is not None else 1.0 / fps
                speed = (d_px * meters_per_pixel) / dt if meters_per_pixel and dt > 0 else (d_px) / dt if dt > 0 else 0
                if speed >= sprint_threshold:
                    sprints += 1
            prev_center = c
            prev_time = t

        results[tid] = {
            'total_distance': total_dist,
            'max_speed': max_speed,
            'sprints': sprints,
            'frames': len(frames),
        }

    return results
