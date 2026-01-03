export const fetcher = <TData, TVariables>(
  query: string,
  variables?: TVariables,
  options?: RequestInit["headers"],
) => {
  return async (): Promise<TData> => {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const json = await response.json();

    if (json.errors) {
      const { message } = json.errors[0] || {};
      throw new Error(message || "Error..");
    }

    return json.data;
  };
};
