import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "https://graphql.anilist.co",
  documents: "graphql/**/*.graphql",
  generates: {
    "__generated__/graphql.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-query",
      ],
      config: {
        // 1. Ensure the export name in your file is actually 'fetcher'
        // If your function is named 'fetchData', change this to: "@/hooks/fetcher#fetchData"
        fetcher: "@/hooks/fetcher#fetcher",

        // 2. This enforces the v5 Object Syntax (Fixes the "Bad Argument" error)
        reactQueryVersion: 5,

        exposeQueryKeys: true,
        addInfiniteQuery: true,

        pureMagicComment: true,
      },
    },
  },
};

export default config;
