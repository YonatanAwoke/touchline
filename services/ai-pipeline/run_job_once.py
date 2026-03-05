import os
import sys
from pathlib import Path
import psycopg2
import time

# ensure local package imports work
sys.path.append(str(Path(__file__).parent))

import config
from worker import AnalysisWorker


def ensure_analysis_job(video_id: int, model_version: str):
    # psycopg2 does not accept query params in the DSN (e.g., ?schema=public)
    dsn = config.DATABASE_URL
    if '?' in dsn:
        dsn = dsn.split('?')[0]
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    cur.execute(
        'SELECT id FROM "AnalysisJob" WHERE "videoId" = %s AND "modelVersion" = %s',
        (video_id, model_version)
    )
    r = cur.fetchone()
    if r:
        job_id = r[0]
        cur.close()
        conn.close()
        return job_id

    cur.execute(
        'INSERT INTO "AnalysisJob" ("videoId", "modelVersion", status, "createdAt") VALUES (%s, %s, %s, NOW()) RETURNING id',
        (video_id, model_version, 'QUEUED')
    )
    job_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return job_id


if __name__ == '__main__':
    # Example usage: python run_job_once.py 6 1_1771239460142_a21174c8.mp4 yolov8n 1
    if len(sys.argv) < 5:
        print('Usage: python run_job_once.py <videoId> <storagePath> <modelVersion> <organizationId>')
        sys.exit(1)

    video_id = int(sys.argv[1])
    storage_path = sys.argv[2]
    model_version = sys.argv[3]
    org_id = int(sys.argv[4])

    print(f"Ensuring AnalysisJob exists for video {video_id}, model {model_version}...")
    job_id = ensure_analysis_job(video_id, model_version)
    print(f"AnalysisJob id: {job_id}")

    worker = AnalysisWorker()

    job_data = {
        'videoId': video_id,
        'storagePath': storage_path,
        'modelVersion': model_version,
        'organizationId': org_id,
    }

    print('Starting processing...')
    start = time.time()
    worker.process_job(job_data)
    print('Finished processing in', time.time() - start)
