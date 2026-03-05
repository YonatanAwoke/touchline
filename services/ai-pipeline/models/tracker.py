try:
    from deep_sort_realtime.deepsort_tracker import DeepSort
    DEEP_SORT_AVAILABLE = True
except Exception:
    DEEP_SORT_AVAILABLE = False

import numpy as np


class IOUTracker:
    """
    Simple IOU-based tracker as a fallback when DeepSORT isn't available.
    Not robust but works for prototyping.
    """
    def __init__(self, iou_threshold=0.3):
        self.next_id = 1
        self.tracks = {}  # id -> bbox
        self.iou_threshold = iou_threshold

    @staticmethod
    def iou(boxA, boxB):
        # boxes in [x1,y1,x2,y2]
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interW = max(0, xB - xA)
        interH = max(0, yB - yA)
        interArea = interW * interH

        boxAArea = max(0, boxA[2] - boxA[0]) * max(0, boxA[3] - boxA[1])
        boxBArea = max(0, boxB[2] - boxB[0]) * max(0, boxB[3] - boxB[1])

        denom = float(boxAArea + boxBArea - interArea)
        if denom <= 0:
            return 0.0
        return interArea / denom

    def update(self, detections):
        # detections: list of dicts {'bbox':[x1,y1,x2,y2], 'confidence':float}
        assigned = {}
        dets_left = []
        for d in detections:
            best_id = None
            best_iou = 0
            for tid, tb in self.tracks.items():
                i = self.iou(d['bbox'], tb)
                if i > best_iou:
                    best_iou = i
                    best_id = tid

            if best_iou >= self.iou_threshold and best_id is not None and best_id not in assigned:
                assigned[best_id] = d
            else:
                dets_left.append(d)

        # update assigned
        for tid, d in assigned.items():
            self.tracks[tid] = d['bbox']

        # create new tracks for remaining
        created = []
        for d in dets_left:
            tid = self.next_id
            self.next_id += 1
            self.tracks[tid] = d['bbox']
            created.append((tid, d))

        # Prepare output: list of tracks with id and bbox
        output = []
        # include assigned
        for tid, d in assigned.items():
            output.append({'track_id': tid, 'bbox': d['bbox'], 'confidence': d.get('confidence', 1.0)})
        for tid, d in created:
            output.append({'track_id': tid, 'bbox': d['bbox'], 'confidence': d.get('confidence', 1.0)})

        return output


class TrackerWrapper:
    def __init__(self, max_age=30, iou_threshold=0.3):
        if DEEP_SORT_AVAILABLE:
            try:
                # attempt to create DeepSort tracker; if it fails, fallback to IOUTracker
                self.tracker = DeepSort(max_age=max_age)
                self.use_deepsort = True
            except Exception:
                self.tracker = IOUTracker(iou_threshold=iou_threshold)
                self.use_deepsort = False
        else:
            self.tracker = IOUTracker(iou_threshold=iou_threshold)
            self.use_deepsort = False

    def update(self, detections, frame=None):
        """
        Update tracker with current frame detections.
        detections: list of dicts with bbox [x1,y1,x2,y2], confidence, class
        Returns list of tracks: {'track_id', 'bbox', 'confidence'}
        """
        if self.use_deepsort:
            # DeepSort expects format [[x,y,w,h,confidence,class], ...]
            ds_inputs = []
            for d in detections:
                x1, y1, x2, y2 = d['bbox']
                w = x2 - x1
                h = y2 - y1
                ds_inputs.append([int(x1), int(y1), int(w), int(h), float(d.get('confidence', 1.0)), d.get('class', 'person')])

            tracks = self.tracker.update_tracks(ds_inputs, frame=frame)
            out = []
            for t in tracks:
                if not t.is_confirmed():
                    continue
                tid = t.track_id
                ltrb = t.to_ltrb()
                out.append({'track_id': tid, 'bbox': [ltrb[0], ltrb[1], ltrb[2], ltrb[3]], 'confidence': t.det_conf})
            return out
        else:
            return self.tracker.update(detections)
"""
Placeholder for ByteTrack/DeepSORT tracker.
Will be implemented in Phase 2.
"""

class PlayerTracker:
    def __init__(self):
        raise NotImplementedError("Tracker will be implemented in Phase 2")
