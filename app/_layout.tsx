import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // 1. Import this
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";


export const unstable_settings = {
  anchor: "index",
};

// 2. Initialize the client (outside the component to keep it stable)
const queryClient = new QueryClient();

export default function RootLayout() {

  return (
    <QueryClientProvider client={queryClient}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="results" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
