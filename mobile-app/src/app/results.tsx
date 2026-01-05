import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  type DimensionValue,
  FlatList,
  Image,
  Linking,
  StatusBar,
  type StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { useGetActorInfoQuery } from "@/__generated__/graphql";

// --- Skeleton Component ---
const Skeleton = ({
  width,
  height,
  borderRadius = 4,
  style,
}: {
  width: DimensionValue;
  height: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#2C2C2E",
          opacity,
        },
        style,
      ]}
    />
  );
};

export default function ResultsScreen() {
  const router = useRouter();
  const { detectedName } = useLocalSearchParams<{ detectedName: string }>();

  const { data, isLoading, error } = useGetActorInfoQuery(
    { name: detectedName },
    {
      enabled: !!detectedName,
      queryKey: useGetActorInfoQuery.getKey({ name: detectedName }),
    },
  );

  // --- SKELETON LOADING STATE ---
  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <View style={styles.header}>
          <View style={styles.iconBtn}>
            <Skeleton width={24} height={24} borderRadius={12} />
          </View>
          <Skeleton width={100} height={20} />
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.scrollContent}>
          <View style={styles.profileSection}>
            <Skeleton
              width={140}
              height={140}
              borderRadius={70}
              style={{ marginBottom: 20 }}
            />
            <Skeleton width={200} height={32} style={{ marginBottom: 10 }} />
            <Skeleton
              width={120}
              height={20}
              style={{ marginBottom: 30, alignSelf: "flex-start" }}
            />
          </View>
          {[1, 2, 3].map((key) => (
            <View key={key} style={styles.card}>
              <Skeleton width={60} height={80} borderRadius={8} />
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={14} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // --- ERROR STATE ---
  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={50} color="#FF453A" />
        <Text style={styles.errorText}>Could not load data.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const staff = data?.Staff;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Main Content */}
      <FlatList
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={() => (
          <View style={styles.profileSection}>
            <View style={styles.imageContainer}>
              {staff?.image?.large ? (
                <Image
                  source={{ uri: staff.image.large }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Ionicons name="person" size={50} color="#555" />
                </View>
              )}
            </View>

            <Text style={styles.actorName}>
              {staff?.name?.full ?? "Unknown Name"}
            </Text>

            <View style={styles.sectionHeader}>
              <Ionicons name="film-outline" size={20} color="#0A84FF" />
              <Text style={styles.sectionTitle}>Popular Roles</Text>
            </View>
          </View>
        )}
        data={staff?.characterMedia?.edges}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => {
          const anime = item?.node;
          const character = item?.characters?.[0];

          // Function to handle URL opening
          const handlePress = () => {
            const title = anime?.title?.english ?? anime?.title?.romaji;
            if (title) {
              const query = encodeURIComponent(title);
              const url = `https://aniwatchtv.to/search?keyword=${query}`;
              Linking.openURL(url).catch((err) =>
                console.error("Failed to open URL:", err),
              );
            }
          };

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={handlePress}
              activeOpacity={0.7}
            >
              {anime?.coverImage?.medium ? (
                <Image
                  source={{ uri: anime.coverImage.medium }}
                  style={styles.cardImage}
                />
              ) : (
                <View style={[styles.cardImage, styles.placeholderCard]} />
              )}

              <View style={styles.cardInfo}>
                <Text style={styles.characterName} numberOfLines={1}>
                  {character?.name?.full ?? "Unknown Character"}
                </Text>
                <Text style={styles.animeTitle} numberOfLines={2}>
                  {anime?.title?.english ??
                    anime?.title?.romaji ??
                    "Unknown Anime"}
                </Text>
              </View>

              <Ionicons name="open-outline" size={20} color="#0A84FF" />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#FF453A",
    marginTop: 12,
    fontSize: 18,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#121212",
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#1C1C1E",
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  imageContainer: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 20,
  },
  profileImage: {
    width: 150,
    height: 200,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#1C1C1E",
  },
  placeholderImage: {
    backgroundColor: "#2C2C2E",
    justifyContent: "center",
    alignItems: "center",
  },
  actorName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 30,
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  cardImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#2C2C2E",
  },
  placeholderCard: {
    backgroundColor: "#333",
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  characterName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  animeTitle: {
    color: "#8E8E93",
    fontSize: 14,
    lineHeight: 20,
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#1C1C1E",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFF",
  },
});
