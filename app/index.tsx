import { Asset } from "expo-asset";
// 1. New API Imports (SDK 52+)
import { File, Paths } from "expo-file-system";
import { useRouter } from "expo-router";
import { InferenceSession, Tensor } from "onnxruntime-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AudioRecord from "react-native-audio-record";
import { decode } from "wav-decoder";

import actorDatabase from "@/assets/actor-memory.json";
import { computeFbank, cosineSimilarity } from "@/lib/utils";

interface Actor {
  name: string;
  vector: number[];
}

type RecordingState = "IDLE" | "RECORDING" | "PAUSED";

export default function HomeScreen() {
  const router = useRouter();
  const [modelReady, setModelReady] = useState(false);
  const [recState, setRecState] = useState<RecordingState>("IDLE");
  const [isProcessing, setIsProcessing] = useState(false);

  const sessionRef = useRef<InferenceSession | null>(null);
  const startTimeRef = useRef<number>(0);

  // 1. Load ONNX Model
  useEffect(() => {
    (async () => {
      try {
        console.log("Loading Model...");
        const modelAsset = Asset.fromModule(require("@/assets/model.onnx"));
        await modelAsset.downloadAsync();

        if (!modelAsset.localUri) {
          throw new Error("Model asset has no localUri");
        }

        // ---------------------------------------------------------
        // FIX: Modern Expo FileSystem API (SDK 52+)
        // ---------------------------------------------------------

        // Define destination file using the new 'File' class and 'Paths.document'
        const destFile = new File(Paths.document, "model.onnx");

        // Check if it exists (synchronous property)
        if (!destFile.exists) {
          console.log("Copying model to document directory...");

          // Create a File reference for the asset
          const sourceFile = new File(modelAsset.localUri);

          // Synchronous copy (JSI)
          sourceFile.copy(destFile);
        }

        // Get the valid URI from the File object
        const modelPath = destFile.uri;

        sessionRef.current = await InferenceSession.create(modelPath, {
          executionProviders: ["cpu"],
        });

        console.log("✅ ONNX Runtime Ready");
        setModelReady(true);
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to load model");
      }
    })();
  }, []);

  // 2. Setup Recorder
  useEffect(() => {
    const setupAudio = async () => {
      try {
        if (Platform.OS === "android") {
          // 1. Ask for permission FIRST
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              "Permission Denied",
              "Microphone permission is required.",
            );
            return;
          }
        }

        // 2. ONLY Initialize after permission is confirmed
        AudioRecord.init({
          sampleRate: 16000,
          channels: 1,
          bitsPerSample: 16,
          audioSource: 6,
          wavFile: "input.wav",
        });

        console.log("Audio Recorder Initialized");
      } catch (e) {
        console.error("Failed to init recorder:", e);
      }
    };

    setupAudio();
  }, []);

  // --- Handlers ---
  const handleStart = () => {
    if (!modelReady) return;
    startTimeRef.current = Date.now();
    AudioRecord.start();
    setRecState("RECORDING");
  };

  const handlePause = async () => {
    await AudioRecord.stop();
    setRecState("PAUSED");
  };

  const handleResume = () => {
    startTimeRef.current = Date.now();
    AudioRecord.start();
    setRecState("RECORDING");
  };

  const handleStopAndAnalyze = async () => {
    let audioPath = "";

    // 1. Stop Recording (or just get path if paused)
    if (recState === "RECORDING") {
      // Prevent accidental taps (debounce)
      if (Date.now() - startTimeRef.current < 1000) {
        await AudioRecord.stop();
        setRecState("IDLE");
        return Alert.alert("Too Short", "Speak longer");
      }
      audioPath = await AudioRecord.stop();
    } else {
      // If IDLE or PAUSED, stop() simply returns the path of the last file
      audioPath = await AudioRecord.stop();
    }

    setRecState("IDLE");
    setIsProcessing(true);

    try {
      // ---------------------------------------------------------
      // FIX: FORCE 'file://' SCHEME FOR ANDROID
      // ---------------------------------------------------------
      // Expo's 'File' class throws "URI is not absolute" if this is missing.
      if (Platform.OS === "android" && !audioPath.startsWith("file://")) {
        audioPath = `file://${audioPath}`;
      }

      console.log("Analyzing file at:", audioPath); // Debug Log

      // 2. Load File using Expo SDK 52+ API
      const audioFile = new File(audioPath);

      if (!audioFile.exists) {
        throw new Error("Audio file not found at " + audioPath);
      }

      // 3. Read directly into ArrayBuffer (Native JSI)
      // This is much faster/safer than fetch()
      const buffer = await audioFile.arrayBuffer();

      // 4. Decode WAV
      const decoded = await decode(buffer);
      const pcm = decoded.channelData[0];

      // 5. Compute Fbank
      console.log(`Computing Fbank for ${pcm.length} samples...`);
      const feats = computeFbank(pcm);
      const numFrames = feats.length / 80;

      // 6. ONNX Inference
      if (!sessionRef.current) throw new Error("Model not loaded");

      const inputTensor = new Tensor("float32", feats, [1, numFrames, 80]);
      const inputName = sessionRef.current.inputNames[0];

      const results = await sessionRef.current.run({
        [inputName]: inputTensor,
      });

      const outputName = sessionRef.current.outputNames[0];
      const embedding = Array.from(results[outputName].data as Float32Array);

      // 7. Matching
      let bestMatch = "";
      let bestScore = -1;

      (actorDatabase as Actor[]).forEach((actor) => {
        const score = cosineSimilarity(embedding, actor.vector);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = actor.name;
        }
      });

      console.log(`Match: ${bestMatch} (${bestScore.toFixed(4)})`);

      if (bestScore > 0.3) {
        router.push({
          pathname: "/results",
          params: { detectedName: bestMatch },
        });
      } else {
        Alert.alert("No Match", "Voice not recognized");
      }
    } catch (e) {
      console.error("Analysis Error:", e);
      Alert.alert("Error", "Analysis Failed. See logs.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seiyuu</Text>

      <Text style={styles.status}>
        {recState === "IDLE"
          ? "Ready"
          : recState === "PAUSED"
            ? "Paused"
            : "Recording..."}
      </Text>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.btn,
            styles.mainBtn,
            (!modelReady || isProcessing) && { opacity: 0.5 },
          ]}
          onPress={() => {
            if (recState === "IDLE") handleStart();
            else if (recState === "RECORDING") handlePause();
            else if (recState === "PAUSED") handleResume();
          }}
          disabled={!modelReady || isProcessing}
        >
          <Text style={styles.btnText}>
            {recState === "IDLE"
              ? "Record"
              : recState === "RECORDING"
                ? "Pause"
                : "Resume"}
          </Text>
        </TouchableOpacity>

        {recState !== "IDLE" && (
          <TouchableOpacity
            style={[styles.btn, styles.stopBtn]}
            onPress={handleStopAndAnalyze}
            disabled={isProcessing}
          >
            <Text style={styles.btnText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>

      {isProcessing && (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
  },
  title: { fontSize: 32, fontWeight: "bold", marginBottom: 10 },
  status: { fontSize: 18, marginBottom: 50, color: "#666" },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  btn: {
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  mainBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#007AFF",
  },
  stopBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FF3B30",
  },
  btnText: { color: "white", fontWeight: "bold", fontSize: 18 },
});
