import cv2
import os
import time
import json
import uuid
import datetime
import threading
from flask import Flask, Response, request, render_template_string, jsonify, send_from_directory

app = Flask(__name__, static_folder='.', static_url_path='')

# Directories
DATASET_DIR = "dataset/authorized_faces"
INTRUDER_DIR = "intruders"
VIDEO_PATH = "video/camera.mp4"

os.makedirs(DATASET_DIR, exist_ok=True)
os.makedirs(INTRUDER_DIR, exist_ok=True)

# Cascade for face detection
face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
# Try to load it, if it fails maybe internet isn't there but cv2 bundles it
try:
    face_cascade = cv2.CascadeClassifier(face_cascade_path)
except Exception as e:
    print(f"Cannot load cascade: {e}")

logs_list = []
def add_log(event_type, msg, confidence, img_url):
    now = datetime.datetime.now().strftime("%H:%M:%S")
    logs_list.append({
        "time": now,
        "type": event_type, 
        "message": msg,
        "confidence": confidence,
        "snapshot": img_url
    })
    # Keep only recent logs
    if len(logs_list) > 50:
        logs_list.pop(0)

# Background Face Recognition Simulation Task
# In real prod, this runs DeepFace or FaceNet.
app_model_name = "FaceNet"

def process_frame(frame):
    if frame is None:
        return frame
        
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    for (x, y, w, h) in faces:
        # Simulate AI Extraction & Comparison
        # To make it interactive: faces with larger widths or specific random seeds simulate "Unknown"
        is_owner = (w % 2 == 0) # Deterministic mock for recognition simulation
        
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 0, 255) if not is_owner else (0, 255, 0), 2)
        
        # Save snapshot logic (debounce to not spam)
        snapshot_name = f"snapshot_{uuid.uuid4().hex[:6]}.jpg"
        
        if not is_owner:
            cv2.putText(frame, "UNKNOWN", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
            # Intruder alert
            if w > 100 and getattr(process_frame, "last_alert", 0) + 3 < time.time():
                cv2.imwrite(os.path.join(INTRUDER_DIR, snapshot_name), frame[y:y+h, x:x+w])
                add_log("danger", "Unknown Person Detected", "0.0%", f"/intruders/{snapshot_name}")
                process_frame.last_alert = time.time()
        else:
            cv2.putText(frame, "AUTHORIZED", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            if w > 100 and getattr(process_frame, "last_auth", 0) + 10 < time.time():
                add_log("success", "Resident 01 Entered", "98.5%", "")
                process_frame.last_auth = time.time()

    return frame

def generate_frames():
    # Load video once
    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        print(f"Error opening video {VIDEO_PATH}")
    
    while True:
        success, frame = cap.read()
        if not success:
            # Loop video
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue
            
        # Process Deep Learning Simulation
        frame = process_frame(frame)
        
        # Encode to JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
               
        time.sleep(0.04) # roughly 25 FPS throttle to simulate inference time

@app.route('/')
def index():
    return send_from_directory('.', 'dashboard.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/upload_faces', methods=['POST'])
def upload_faces():
    files = request.files.getlist("images")
    owner_name = request.form.get("name", "Unknown")
    role = request.form.get("role", "Resident")
    
    saved_count = 0
    for f in files:
        if f.filename:
            path = os.path.join(DATASET_DIR, f"{owner_name}_{role}_{uuid.uuid4().hex[:4]}.jpg")
            f.save(path)
            saved_count += 1
            
    return jsonify({"success": True, "saved": saved_count, "message": f"{saved_count} images secured in Authorized Database."})

@app.route('/api/database')
def get_database():
    files = []
    if os.path.exists(DATASET_DIR):
        for img in os.listdir(DATASET_DIR):
            if img.endswith('.jpg') or img.endswith('.png'):
                files.append(f"/dataset/authorized_faces/{img}")
    return jsonify({"images": files})

@app.route('/api/status')
def get_status():
    dataset_size = len(os.listdir(DATASET_DIR)) if os.path.exists(DATASET_DIR) else 0
    return jsonify({
        "ai_model": app_model_name,
        "dataset_size": dataset_size,
        "active_cameras": 3,
        "status": "ONLINE"
    })

@app.route('/stream_logs')
def stream_logs():
    def event_stream():
        last_index = 0
        while True:
            if len(logs_list) > last_index:
                new_logs = logs_list[last_index:]
                last_index = len(logs_list)
                yield f"data: {json.dumps(new_logs)}\n\n"
            time.sleep(1)
    return Response(event_stream(), mimetype="text/event-stream")

if __name__ == '__main__':
    print("Starting Security OS Backend...")
    app.run(port=5000, debug=False, threaded=True)
