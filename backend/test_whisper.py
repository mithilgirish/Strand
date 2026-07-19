import whisper
import sys

print("Loading model...")
try:
    model = whisper.load_model("base")
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    sys.exit(1)

print("Whisper setup seems correct!")
