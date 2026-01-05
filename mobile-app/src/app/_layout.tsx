import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; 
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";


export const unstable_settings = {
  anchor: "index",
};

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
