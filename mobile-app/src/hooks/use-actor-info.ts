import { useQuery } from '@tanstack/react-query';

const ANILIST_API = 'https://graphql.anilist.co';

// 1. Define strict interfaces for the API Response
interface AniListResponse {
  data: {
    Staff: {
      name: {
        full: string;
      };
      image: {
        large: string;
      };
      characterMedia: {
        edges: Array<{
          node: {
            title: {
              romaji: string;
              english: string | null;
            };
            coverImage: {
              medium: string;
            };
          };
          characters: Array<{
            name: {
              full: string;
            };
            image: {
              medium: string;
            };
          }>;
        }>;
      };
    };
  };
  errors?: { message: string }[];
}

// 2. Define the return type for your hook
export interface ActorRole {
  animeTitle: string;
  animeImage: string;
  characterName: string;
  characterImage: string;
}

export interface ActorInfo {
  name: string;
  image: string;
  roles: ActorRole[];
}

const QUERY = `
query ($name: String) {
  Staff(search: $name) {
    name { full }
    image { large }
    characterMedia(sort: POPULARITY_DESC, perPage: 5) {
      edges {
        node {
          title { romaji english }
          coverImage { medium }
        }
        characters {
          name { full }
          image { medium }
        }
      }
    }
  }
}
`;

export const useActorInfo = (actorName: string | null) => {
  return useQuery<ActorInfo | null, Error>({
    queryKey: ['actor', actorName],
    queryFn: async () => {
      if (!actorName) return null;

      const response = await fetch(ANILIST_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: QUERY,
          variables: { name: actorName }
        })
      });

      // 3. Type the raw JSON response
      const json: AniListResponse = await response.json();
      
      // Error handling
      if (!response.ok || json.errors) {
        throw new Error(json.errors?.[0]?.message || 'Network error');
      }

      const staff = json.data.Staff;
      
      // 4. Map with type safety
      return {
        name: staff.name.full,
        image: staff.image.large,
        roles: staff.characterMedia.edges.map((edge) => {
          // Safe access to nested properties
          const anime = edge.node;
          const character = edge.characters[0]; // Characters is an array

          return {
            animeTitle: anime.title.english || anime.title.romaji,
            animeImage: anime.coverImage.medium,
            characterName: character?.name.full || "Unknown",
            characterImage: character?.image.medium || "" // Fallback if image missing
          };
        })
      };
    },
    enabled: !!actorName, 
  });
};