import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const PromoBanner = () => {
	const handlePress = () => {
		Linking.openURL("https://seiyuu-app.vercel.app");
	};

	return (
		<View style={styles.container}>
			<View style={styles.content}>
				<MaterialCommunityIcons name="rocket-launch" size={20} color="#fff" />
				<View style={styles.textContainer}>
					<Text style={styles.title}>Seiyuu is Coming</Text>
					<Text style={styles.subtitle}>
						Get 80%+ accuracy, merch discovery and many more!
					</Text>
				</View>
			</View>

			<TouchableOpacity style={styles.button} onPress={handlePress}>
				<Text style={styles.buttonText}>Join Waitlist</Text>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: "#1a1a1a",
		borderBottomWidth: 1,
		borderBottomColor: "#333",
		padding: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	content: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	textContainer: {
		marginLeft: 10,
	},
	title: {
		color: "#fff",
		fontWeight: "bold",
		fontSize: 14,
	},
	subtitle: {
		color: "#aaa",
		fontSize: 12,
	},
	
	button: {
		backgroundColor: "#3b82f6",
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 6,
	},
	buttonText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "600",
	},

});

export default PromoBanner;
