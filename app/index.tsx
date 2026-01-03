import {
  AudioModule,
  AudioQuality,
  IOSOutputFormat,
  useAudioRecorder,
} from "expo-audio";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import actorDatabase from "@/assets/actor-memory.json";
import { cosineSimilarity } from "@/lib/utils";

interface Actor {
  name: string;
  vector: number[];
}

// 1. Removed 'REVIEW' state
type RecordingState = "IDLE" | "RECORDING" | "PAUSED";

export default function RecordingScreen() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [recState, setRecState] = useState<RecordingState>("IDLE");

  const startTimeRef = useRef<number>(0);

  // --- RECORDER ---
  const audioRecorder = useAudioRecorder({
    extension: ".wav",
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    android: {
      extension: ".wav",
      outputFormat: "default",
      audioEncoder: "default",
    },
    ios: {
      extension: ".wav",
      audioQuality: AudioQuality.MAX,
      outputFormat: IOSOutputFormat.LINEARPCM,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: "audio/wav",
      bitsPerSecond: 256000,
    },
  });

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setHasPermission(status.granted);
    })();
  }, []);

  const handleStartRecording = async () => {
    try {
      if (!hasPermission) {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) {
          Alert.alert("Permission Required", "Microphone access is needed.");
          return;
        }
      }

      if (recState === "IDLE") {
        startTimeRef.current = Date.now();
        await audioRecorder.prepareToRecordAsync();
      }

      audioRecorder.record();
      setRecState("RECORDING");
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Could not start recording.");
    }
  };

  const handlePauseRecording = async () => {
    if (recState === "RECORDING") {
      await audioRecorder.pause();
      setRecState("PAUSED");
    }
  };

  // 2. Merged Stop + Analysis into one function
  const handleStopAndAnalyze = async () => {
    const durationMs = Date.now() - startTimeRef.current;

    if (durationMs < 1000) {
      await audioRecorder.stop();
      setRecState("IDLE");
      Alert.alert("Too Short", "Please speak for at least 1 second.");
      return;
    }

    // Immediately update UI to processing state
    setIsProcessing(true);
    setRecState("IDLE");

    try {
      // Stop and get URI
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) throw new Error("No audio file generated");

      // --- MOCK INFERENCE ---
      const userVector: number[] = Array(192)
        .fill(0)
        .map(() => Math.random());
      await new Promise((r) => setTimeout(r, 1000));
      // ---------------------

      let bestMatchName = "";
      let bestScore = -1;

      (actorDatabase as Actor[]).forEach((actor) => {
        const score = cosineSimilarity(userVector, actor.vector);
        if (score > bestScore) {
          bestScore = score;
          bestMatchName = actor.name;
        }
      });

      if (bestScore > 0.5) {
        router.push({
          pathname: "/results",
          params: { detectedName: bestMatchName || "Unknown" },
        });
      } else {
        Alert.alert("Not Found", "No matching voice actor found.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Analysis failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seiyuu</Text>

      <Text style={styles.subtitle}>
        {isProcessing
          ? "Analyzing..."
          : recState === "RECORDING"
            ? "Listening..."
            : recState === "PAUSED"
              ? "Paused"
              : "Tap below to start"}
      </Text>

      {/* --- IDLE --- */}
      {recState === "IDLE" && !isProcessing && (
        <TouchableOpacity
          style={styles.recordButton}
          onPress={handleStartRecording}
        >
          <View style={styles.recordIcon} />
        </TouchableOpacity>
      )}

      {/* --- RECORDING CONTROLS --- */}
      {(recState === "RECORDING" || recState === "PAUSED") && !isProcessing && (
        <View style={styles.controlsRow}>
          {/* Pause / Resume */}
          <TouchableOpacity
            style={[styles.controlButton, styles.pauseButton]}
            onPress={
              recState === "RECORDING"
                ? handlePauseRecording
                : handleStartRecording
            }
          >
            <View
              style={
                recState === "RECORDING" ? styles.pauseIcon : styles.playIcon
              }
            />
            <Text style={styles.buttonText}>
              {recState === "RECORDING" ? "Pause" : "Resume"}
            </Text>
          </TouchableOpacity>

          {/* Stop & Analyze Immediately */}
          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton]}
            onPress={handleStopAndAnalyze}
          >
            <View style={styles.stopIcon} />
            <Text style={styles.buttonText}>Stop</Text>
          </TouchableOpacity>
        </View>
      )}

      {isProcessing && <ActivityIndicator size="large" color="#007AFF" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 50,
    height: 24,
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 6,
    borderColor: "#E5E5EA",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  recordIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FF3B30",
  },
  controlsRow: {
    flexDirection: "row",
    gap: 30,
    alignItems: "center",
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  pauseButton: { backgroundColor: "#FF9500" },
  stopButton: { backgroundColor: "#FF3B30" },
  buttonText: {
    color: "white",
    fontWeight: "600",
    marginTop: 4,
    fontSize: 12,
  },
  pauseIcon: {
    width: 20,
    height: 20,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderColor: "white",
    backgroundColor: "transparent",
  },
  playIcon: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 16,
    borderRightWidth: 0,
    borderBottomWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: "white",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    borderTopColor: "transparent",
    marginLeft: 4,
  },
  stopIcon: {
    width: 20,
    height: 20,
    backgroundColor: "white",
    borderRadius: 3,
  },
});
