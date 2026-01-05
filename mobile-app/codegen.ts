import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "https://graphql.anilist.co",
  documents: "graphql/**/*.graphql",
  generates: {
    "src/__generated__/graphql.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-query",
      ],
      config: {
        fetcher: "@/hooks/fetcher#fetcher",
        reactQueryVersion: 5,
        exposeQueryKeys: true,
        addInfiniteQuery: true,
        pureMagicComment: true,
      },
    },
  },
};

export default config;
