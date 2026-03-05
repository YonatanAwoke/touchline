import redis
import json
import psycopg2
from psycopg2.extras import Json
import os
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent))

import config
from models.detector import PlayerDetector
from pipeline import process_video_with_tracking

class AnalysisWorker:
    """
    Redis worker that processes video analysis jobs.
    Listens to the 'analysis' queue and runs YOLOv8 detection.
    """
    
    def __init__(self):
        # Connect to Redis
        self.redis_client = redis.from_url(config.REDIS_URL)
        print(f"Connected to Redis: {config.REDIS_URL}")
        
        # Connect to PostgreSQL
        # Strip query params (psycopg2 does not accept ?schema=... in DSN)
        dsn = config.DATABASE_URL
        if '?' in dsn:
            dsn = dsn.split('?')[0]
        self.db_conn = psycopg2.connect(dsn)
        print("Connected to PostgreSQL")
        
        # Initialize detector
        self.detector = PlayerDetector()
    
    def get_video_path(self, storage_path: str) -> str:
        """Convert storage path to absolute path."""
        upload_dir = Path(config.UPLOAD_DIR).resolve()
        return str(upload_dir / storage_path)
    
    def update_job_status(self, video_id: int, model_version: str, status: str, **kwargs):
        """Update analysis job status in database."""
        cursor = self.db_conn.cursor()
        set_fields = [f'"{key}" = %s' for key in kwargs.keys()]
        set_fields.append("status = %s")
        values = list(kwargs.values()) + [status, video_id, model_version]

        query = f"""
            UPDATE "AnalysisJob"
            SET {', '.join(set_fields)}
            WHERE "videoId" = %s AND "modelVersion" = %s
        """

        cursor.execute(query, values)
        self.db_conn.commit()
        cursor.close()
    
    def store_detection_results(self, job_id: int, detections: dict):
        """
        Store raw detection data in AnalysisResult table.
        
        For Phase 1, we store frame-by-frame detections as TRACKING type.
        """
        cursor = self.db_conn.cursor()
        # Store as AnalysisResult with given payload type
        query = """
            INSERT INTO "AnalysisResult" ("analysisJobId", type, payload)
            VALUES (%s, %s, %s)
        """

        # detections should contain 'type' and payload
        result_type = detections.get('type', 'TRACKING')
        payload = detections

        cursor.execute(query, (job_id, result_type, Json(payload)))
        self.db_conn.commit()
        cursor.close()
    
    def get_analysis_job(self, video_id: int, model_version: str) -> int:
        """Get analysis job ID from database."""
        cursor = self.db_conn.cursor()
        cursor.execute(
            'SELECT id FROM "AnalysisJob" WHERE "videoId" = %s AND "modelVersion" = %s',
            (video_id, model_version)
        )
        result = cursor.fetchone()
        cursor.close()
        return result[0] if result else None
    
    def process_job(self, job_data: dict):
        """
        Process a single analysis job.
        
        Job data format:
        {
            'videoId': 5,
            'storagePath': '1_1770722596039_cda134a4.mp4',
            'modelVersion': 'yolov8n',
            'organizationId': 1
        }
        """
        video_id = job_data['videoId']
        storage_path = job_data['storagePath']
        model_version = job_data['modelVersion']
        
        print(f"\n{'='*60}")
        print(f"Processing analysis job for video {video_id}")
        print(f"Storage path: {storage_path}")
        print(f"{'='*60}\n")
        
        try:
            # Update status to PROCESSING
            self.update_job_status(
                video_id, 
                model_version, 
                'PROCESSING',
                startedAt=datetime.now()
            )
            
            # Get full video path
            video_path = self.get_video_path(storage_path)
            
            if not os.path.exists(video_path):
                raise FileNotFoundError(f"Video not found: {video_path}")
            
            # Run detection -> tracking -> metrics pipeline
            print("Running detection -> tracking -> metrics pipeline...")
            pipeline_results = process_video_with_tracking(video_path, model_version=model_version)
            
            # Get job ID
            job_id = self.get_analysis_job(video_id, model_version)
            
            if not job_id:
                raise ValueError(f"Analysis job not found for video {video_id}")
            
            # Store TRACKING result
            print("Storing TRACKING results...")
            tracking_payload = pipeline_results.get('tracking')
            # attach type key
            if tracking_payload is not None:
                tracking_payload['type'] = 'TRACKING'
                self.store_detection_results(job_id, tracking_payload)

            # Store METRICS result
            print("Storing METRICS results...")
            metrics_payload = pipeline_results.get('metrics')
            if metrics_payload is not None:
                metrics_payload['type'] = 'METRICS'
                self.store_detection_results(job_id, metrics_payload)
            
            # Update status to COMPLETED
            self.update_job_status(
                video_id,
                model_version,
                'COMPLETED',
                finishedAt=datetime.now()
            )
            
            print(f"\n✅ Job completed successfully!")
            if tracking_payload is not None:
                total_frames = tracking_payload.get('total_frames')
                print(f"Detected players in {total_frames} frames\n")
            
        except Exception as e:
            print(f"\n❌ Job failed: {str(e)}\n")
            
            # Update status to FAILED
            self.update_job_status(
                video_id,
                model_version,
                'FAILED',
                finishedAt=datetime.now()
            )
            
            raise
    
    def start(self):
        """Start listening to Redis queue."""
        print(f"\n🚀 Analysis worker started")
        print(f"Listening to queue: {config.QUEUE_NAME}")
        print(f"Press Ctrl+C to stop\n")
        
        try:
            while True:
                # Blocking pop from queue (timeout 1 second)
                result = self.redis_client.blpop(f"bull:{config.QUEUE_NAME}:wait", timeout=1)
                
                if result:
                    queue_name, job_json = result
                    job_data = json.loads(job_json)
                    
                    # Extract actual job data from BullMQ format
                    if 'data' in job_data:
                        self.process_job(job_data['data'])
                    else:
                        self.process_job(job_data)
                        
        except KeyboardInterrupt:
            print("\n\n👋 Worker stopped by user")
        finally:
            self.redis_client.close()
            self.db_conn.close()
            print("Connections closed")

if __name__ == "__main__":
    worker = AnalysisWorker()
    worker.start()
