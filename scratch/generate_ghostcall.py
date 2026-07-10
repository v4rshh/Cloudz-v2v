import os
import sys

# Ensure gtts is installed
try:
    from gtts import gTTS
except ImportError:
    print("gtts not installed. Installing it now...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "gtts"])
    from gtts import gTTS

# Create target directory
os.makedirs("public/audio", exist_ok=True)

# Generate the natural voice line ahead of time
text = "Hey! I'm right outside, I can see you now. Just walk towards the street corner, I am waiting near the tram station. Stay on the line."
print("Generating speech audio for text:", text)

tts = gTTS(text=text, lang='en', tld='co.uk') # Using co.uk dialect for clear vocal articulation
tts.save("public/audio/ghostcall.mp3")

print("Successfully generated pre-rendered clip at: public/audio/ghostcall.mp3")
