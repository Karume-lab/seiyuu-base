import { useLocalSearchParams } from "expo-router"; // 1. Import the hook
import { FlatList, Image, Text, View } from "react-native";
import { useGetActorInfoQuery } from "@/__generated__/graphql";

export default function ResultsScreen() {
  // 2. Read the params from the URL
  // We type it as { detectedName: string } to satisfy TypeScript
  const { detectedName } = useLocalSearchParams<{ detectedName: string }>();

  const { data, isLoading, error } = useGetActorInfoQuery(
    { name: detectedName },
    {
      enabled: !!detectedName,
      // 3. Use the helper so you don't have to type the array manually
      queryKey: useGetActorInfoQuery.getKey({ name: detectedName }),
    },
  );

  if (isLoading) return <Text>Loading Info...</Text>;
  if (error) return <Text>Error loading data.</Text>;

  const staff = data?.Staff;

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>
        {staff?.name?.full ?? "Unknown Name"}
      </Text>

      {staff?.image?.large && (
        <Image
          source={{ uri: staff.image.large }}
          style={{ width: 100, height: 100, borderRadius: 50 }}
        />
      )}

      <Text style={{ marginTop: 20, fontSize: 18 }}>Popular Roles:</Text>

      <FlatList
        data={staff?.characterMedia?.edges}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => {
          const anime = item?.node;
          const character = item?.characters?.[0];

          return (
            <View
              style={{
                flexDirection: "row",
                marginTop: 10,
                alignItems: "center",
              }}
            >
              {anime?.coverImage?.medium && (
                <Image
                  source={{ uri: anime.coverImage.medium }}
                  style={{ width: 50, height: 70 }}
                />
              )}

              <View style={{ marginLeft: 10 }}>
                <Text style={{ fontWeight: "bold" }}>
                  {character?.name?.full ?? "Unknown Character"}
                </Text>
                <Text>
                  {anime?.title?.english ??
                    anime?.title?.romaji ??
                    "Unknown Anime"}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
