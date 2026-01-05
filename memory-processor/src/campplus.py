import os
import json
import wave
import numpy as np
import sherpa_onnx

# --- CONFIGURATION ---
MODEL_FILE = "models/campplus.onnx"
AUDIO_FOLDER = "voice-clips"
OUTPUT_FILE = "output/actor-memory.json"

# Mapping of filename to Actor Name
# Ensure these files exist in the AUDIO_FOLDER
ACTOR_MAP = {
    "diavolo.wav": "Katsuyuki Konishi",
    "toji.wav": "Takehito Koyasu",
    "daki.wav": "Miyuki Sawashiro",
}


def read_wave(filename):
    """
    Reads a WAV file and prepares it for processing.

    Performs the following operations:
    1. Checks for 16-bit sample width.
    2. Converts Stereo (2 channels) to Mono (1 channel) by averaging.
    3. Normalizes integer samples to float32 range [-1, 1].

    Args:
        filename (str): Path to the WAV file.

    Returns:
        tuple: (samples_float32, sample_rate) or (None, error_message)
    """
    try:
        with wave.open(filename, "rb") as f:
            if f.getsampwidth() != 2:
                return (
                    None,
                    f"Error: {filename} is {f.getsampwidth()*8}-bit. Must be 16-bit.",
                )

            num_channels = f.getnchannels()
            num_samples = f.getnframes()
            raw_data = f.readframes(num_samples)

            samples_int16 = np.frombuffer(raw_data, dtype=np.int16)

            # Convert Stereo to Mono if needed
            if num_channels == 2:
                samples_int16 = samples_int16.reshape(-1, 2).mean(axis=1)
            elif num_channels > 2:
                return None, f"Error: {filename} has {num_channels} channels."

            # Normalize to float32 [-1, 1]
            samples_float32 = samples_int16.astype(np.float32) / 32768.0
            return samples_float32, f.getframerate()
    except Exception as e:
        return None, str(e)


def main():
    """
    Main execution routine.
    Loads the model, processes audio files, generates embeddings, and saves to JSON.
    """

    # 1. Validate Model Existence
    if not os.path.exists(MODEL_FILE):
        print(f"CRITICAL ERROR: Model file not found: {MODEL_FILE}")
        print("Please download the CAM++ ONNX model and place it in this directory.")
        exit(1)

    print(f"Loading CAM++ Model: {MODEL_FILE}...")

    # 2. Initialize Sherpa ONNX Extractor
    config = sherpa_onnx.SpeakerEmbeddingExtractorConfig(
        model=MODEL_FILE,
        num_threads=4,
        debug=False,
    )
    extractor = sherpa_onnx.SpeakerEmbeddingExtractor(config)

    database = []

    # 3. Validate Audio Folder
    print(f"\nScanning folder: {os.path.abspath(AUDIO_FOLDER)}")
    if not os.path.exists(AUDIO_FOLDER):
        os.makedirs(AUDIO_FOLDER)
        print(
            f"Created '{AUDIO_FOLDER}'. Please place your .wav files here and run again."
        )
        exit(0)

    print("-" * 40)

    # 4. Process Audio Files
    for filename, actor_name in ACTOR_MAP.items():
        full_path = os.path.join(AUDIO_FOLDER, filename)

        if not os.path.exists(full_path):
            print(f"SKIPPING: '{filename}' (File not found)")
            continue

        samples, sample_rate = read_wave(full_path)

        if samples is None:
            print(
                f"FAILED: '{filename}' - {sample_rate}"
            )  # sample_rate contains error msg here
            continue

        # Create stream for inference
        stream = extractor.create_stream()
        stream.accept_waveform(sample_rate=sample_rate, waveform=samples)
        stream.input_finished()

        # Compute embedding (Vector generation)
        embedding = extractor.compute(stream)

        # Store result
        database.append({"name": actor_name, "vector": embedding})
        print(f"SUCCESS: Processed {actor_name} (Vector dim: {len(embedding)})")

    # 5. Save Output
    print("-" * 40)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(database, f)

    print(f"DONE: Saved {len(database)} actors to '{OUTPUT_FILE}'")
    print("Copy this JSON file to your mobile app's assets folder.")


if __name__ == "__main__":
    main()
