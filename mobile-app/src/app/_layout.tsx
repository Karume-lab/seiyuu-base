import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import PromoBanner from "@/components/PromoBanner";
import "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export const unstable_settings = {
	anchor: "index",
};

const queryClient = new QueryClient();

export default function RootLayout() {
	return (
		<QueryClientProvider client={queryClient}>
			<SafeAreaView style={{ backgroundColor: "#121212", padding: 10 }}>
				<PromoBanner />
			</SafeAreaView>
			<Stack>
				<Stack.Screen name="index" options={{ headerShown: false }} />
				<Stack.Screen name="results" options={{ headerShown: false }} />
			</Stack>
			<StatusBar style="auto" />
		</QueryClientProvider>
	);
}
