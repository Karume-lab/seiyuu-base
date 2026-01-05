# MEMORY PROCESSOR

This utility processes reference audio clips to generate a **Speaker Recognition Memory Bank**. It extracts unique voice embeddings using the CAM++ model and exports them into a JSON format compatible with the Seiyuu mobile application.

## Project Structure

* **`models/`**: Contains the AI model (`campplus.onnx`).
* **`voice-clips/`**: Input folder for reference WAV files.
* **`output/`**: Destination for the generated JSON memory bank.
* **`src/`**: Contains the processing script (`campplus.py`).

---

## Setup & Installation

### 1. Prerequisites

Ensure you have **Python 3.8+** installed.

### 2. Environment Setup

It is recommended to use the virtual environment provided (or create a new one).

```bash
# Activate the virtual environment
# Windows:
.\venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate

```

### 3. Install Dependencies

Install the required libraries (`numpy`, `sherpa-onnx`) using the requirements file:

```bash
pip install -r requirements.txt

```

---

## How to Add More Voice Actors

To register a new voice actor into the memory bank, follow these steps:

1. **Prepare the Audio**:
* Find a clear audio clip of the voice actor.
* Ensure it is in **.wav** format (16-bit PCM is preferred, but the script handles most conversions).
* *Tip: Short, clean clips (15-20 seconds) work best.*


2. **Add File**:
Place the `.wav` file inside the `voice-clips/` folder.
3. **Register in Code**:
Open `src/campplus.py` and add the filename to the `ACTOR_MAP` dictionary:
```python
ACTOR_MAP = {
    "diavolo.wav": "Katsuyuki Konishi",
    "toji.wav": "Takehito Koyasu",
    # Add your new actor here:
    "filename.wav": "Actor Name", 
}

```



---

## Running the Processor

From the root `memory-processor` folder, run the script:

```bash
python src/campplus.py

```

**What happens next?**

1. The script scans `voice-clips/`.
2. It loads the model from `models/campplus.onnx`.
3. It converts audio into 512-dimensional vector embeddings.
4. It saves the result to `output/actor-memory.json`.

---

## Integration with Mobile App

Once the script finishes successfully:

1. Navigate to the `output/` folder.
2. Locate **`actor-memory.json`**.
3. Copy this file into your React Native project's assets directory:
* **Destination:** `mobile-app/assets/actor-memory.json`


4. Rebuild or reload your mobile app to update the database.
