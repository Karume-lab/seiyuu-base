# MOBILE APP

This directory contains the React Native Expo application for **Seiyuu**, focused on high-performance audio recording and on-device inference.

## Prerequisites

This project uses **[Bun](https://bun.sh/)** as the JavaScript runtime and package manager for faster dependency installation and script execution.

* **Bun**: `v1.x` or newer
* **Node.js**: Required by React Native tooling (LTS recommended)
* **Android Studio / Xcode**: For native compilation

## Installation

Install project dependencies using Bun:

```bash
cd mobile-app
bun install

```

---

## Available Scripts

This project includes a comprehensive set of scripts for development, building, and code quality maintenance.

### Development

| Script | Description |
| --- | --- |
| `bun run dev` | Starts the Expo development server (specifically for **Dev Client** builds). |
| `bun run android` | Cleans the native android folder (`expo prebuild --clean`) and compiles the app for Android emulator/device. |
| `bun run ios` | Compiles and runs the app on the iOS Simulator or device. |

### Building & Deployment (Android)

These scripts handle the creation and installation of the **Release** APK.

| Script | Description |
| --- | --- |
| `bun run build` | Performs a clean prebuild and runs `./gradlew assembleRelease` to generate a production `.apk`. |
| `bun run install-apk` | Uses `adb` to install the generated release APK directly onto a connected device. |
| `bun run build:install-apk` | **Chain Command**: Runs the full build process and immediately installs the APK upon success. |

### Code Quality & Formatting (Biome)

I use **[Biome](https://biomejs.dev/)** for fast linting and formatting.

| Script | Description |
| --- | --- |
| `bun run lint` | Checks code quality rules. |
| `bun run format` | Checks formatting rules (does not write). |
| `bun run check` | Runs both linting and formatting checks. |
| `bun run clean` | **Fixes** linting and formatting issues automatically (`--write`). |

### Maintenance & Utilities

| Script | Description |
| --- | --- |
| `bun run codegen` | Generates TypeScript types from GraphQL schema (via `graphql-codegen`). |
| `bun run doctor` | Runs `expo-doctor` to diagnose common project issues. |
| `bun run update-packages` | Upgrades Expo-related packages to compatible versions. |
| `bun run reinstall-packages` | **Hard Reset**: Deletes `node_modules` and lockfiles, then runs a fresh `bun install`. |

---

## Technical Implementation & Logic

This application performs end-to-end speaker verification on the device without sending audio data to the cloud.

### 1. Audio Acquisition

The app uses `react-native-audio-record` to capture raw PCM data.

* **Sample Rate:** 16,000 Hz (Standard for speech recognition models)
* **Channels:** 1 (Mono)
* **Bit Depth:** 16-bit PCM

### 2. Preprocessing & Feature Extraction

Before inference, raw audio buffers are converted into features the neural network can understand.

* **WAV Decoding:** The raw buffer is verified and decoded using `wav-decoder`.
* **Fbank Computation:** The `computeFbank` utility converts PCM data into filter bank features.
* **Input Tensor:** The features are reshaped into a `[1, num_frames, 80]` Float32 tensor.

### 3. Inference Engine

* **Runtime:** `onnxruntime-react-native`
* **Model:** `campplus.onnx`
* **Execution Provider:** CPU (Default for broad compatibility)

### 4. Vector Matching & Acceptance Thresholds

The core identification logic happens in `HomeScreen.tsx`.

1. **Embedding Generation:** The model outputs a high-dimensional vector (embedding) representing the voice characteristics.
2. **Comparison:** This vector is compared against a pre-loaded JSON database (`actor-memory.json`) containing known actor vectors.
3. **Algorithm:** **Cosine Similarity** is used to measure the distance between the input vector and the stored vectors.
4. **Acceptance Threshold:**
* **Current Threshold:** `> 0.3`
* **Logic:** If the calculated similarity score exceeds **0.3**, the app considers it a match and navigates to the results screen.
* **Rejection:** If the score is **0.3 or lower**, the app triggers a "No Match" alert.



```typescript
// Code Reference: HomeScreen.tsx
(actorDatabase as Actor[]).forEach((actor) => {
  const score = cosineSimilarity(embedding, actor.vector);
  if (score > bestScore) {
    bestScore = score;
    bestMatch = actor.name;
  }
});

// Strict threshold enforcement
if (bestScore > 0.3) {
  router.push({ pathname: "/results", params: { detectedName: bestMatch } });
} else {
  Alert.alert("No Match", "Voice not recognized");
}

```

### 5. Results & Data Fetching

Upon a successful match, the app navigates to `ResultsScreen.tsx`.

* **Data Source:** Fetches detailed actor metadata (images, roles) via a generated GraphQL hook (`useGetActorInfoQuery`).
* **UI State:** Handles loading (Skeleton screens) and error states gracefully.
* **Deep Linking:** External links (e.g., search queries) are constructed dynamically based on the Anime title.
