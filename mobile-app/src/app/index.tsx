import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import { File, Paths } from "expo-file-system";
import { useRouter } from "expo-router";
import { InferenceSession, Tensor } from "onnxruntime-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AudioRecord from "react-native-audio-record";
import { decode } from "wav-decoder";
import { computeFbank, cosineSimilarity } from "@/lib/utils";
import actorDatabase from "~/assets/actor-memory.json";

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
        const modelAsset = Asset.fromModule(
          require("~/assets/models/campplus.onnx"),
        );
        await modelAsset.downloadAsync();

        if (!modelAsset.localUri) {
          throw new Error("Model asset has no localUri");
        }

        const destFile = new File(Paths.document, "campplus.onnx");

        if (!destFile.exists) {
          console.log("Copying model to document directory...");
          const sourceFile = new File(modelAsset.localUri);
          sourceFile.copy(destFile);
        }

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

    if (recState === "RECORDING") {
      if (Date.now() - startTimeRef.current < 1000) {
        await AudioRecord.stop();
        setRecState("IDLE");
        return Alert.alert("Too Short", "Speak longer");
      }
      audioPath = await AudioRecord.stop();
    } else {
      audioPath = await AudioRecord.stop();
    }

    setRecState("IDLE");
    setIsProcessing(true);

    try {
      if (Platform.OS === "android" && !audioPath.startsWith("file://")) {
        audioPath = `file://${audioPath}`;
      }

      const audioFile = new File(audioPath);

      if (!audioFile.exists) {
        throw new Error(`Audio file not found at ${audioPath}`);
      }

      const buffer = await audioFile.arrayBuffer();
      const decoded = await decode(buffer);
      const pcm = decoded.channelData[0];

      console.log(`Computing Fbank for ${pcm.length} samples...`);
      const feats = computeFbank(pcm);
      const numFrames = feats.length / 80;

      if (!sessionRef.current) throw new Error("Model not loaded");

      const inputTensor = new Tensor("float32", feats, [1, numFrames, 80]);
      const inputName = sessionRef.current.inputNames[0];

      const results = await sessionRef.current.run({
        [inputName]: inputTensor,
      });

      const outputName = sessionRef.current.outputNames[0];
      const embedding = Array.from(results[outputName].data as Float32Array);

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

  // Helper to determine status text
  const getStatusText = () => {
    if (isProcessing) return "Analyzing Voice...";
    if (recState === "IDLE") return "Tap to Record";
    if (recState === "PAUSED") return "Paused";
    return "Listening...";
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Header Area */}
      <View style={styles.header}>
        <Text style={styles.title}>Seiyuu</Text>
      </View>

      <Text style={styles.status}>{getStatusText()}</Text>

      {/* Main Controls */}
      <View style={styles.controls}>
        {/* Toggle Button: Start / Pause / Resume / Loading */}
        <TouchableOpacity
          style={[
            styles.btn,
            styles.mainBtn,
            (!modelReady || isProcessing) && styles.disabledBtn,
          ]}
          onPress={() => {
            if (recState === "IDLE") handleStart();
            else if (recState === "RECORDING") handlePause();
            else if (recState === "PAUSED") handleResume();
          }}
          disabled={!modelReady || isProcessing}
        >
          {isProcessing ? (
            // LOADING SPINNER inside the button
            <ActivityIndicator size="large" color="#FFF" />
          ) : (
            // Dynamic Icon
            <Ionicons
              name={
                recState === "IDLE"
                  ? "mic"
                  : recState === "RECORDING"
                    ? "pause"
                    : "play"
              }
              size={50}
              color="#FFF"
            />
          )}
        </TouchableOpacity>

        {/* Stop Button (Hidden when processing or idle) */}
        {!isProcessing && recState !== "IDLE" && (
          <TouchableOpacity
            style={[styles.btn, styles.stopBtn]}
            onPress={handleStopAndAnalyze}
          >
            <Ionicons name="stop" size={50} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    top: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  status: {
    fontSize: 16,
    marginBottom: 60,
    color: "#8E8E93",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30,
  },
  btn: {
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  mainBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#0A84FF",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.1)",
  },
  stopBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FF453A",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.1)",
  },
  disabledBtn: {
    opacity: 0.8,
    backgroundColor: "#0A84FF",
  },
});
