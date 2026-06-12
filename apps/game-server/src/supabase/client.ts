import { getConfig } from "../config";

export type SupabaseLikeClient = {
  url: string;
  postgresUrl: string;
};

export function getSupabaseClient(): SupabaseLikeClient {
  const config = getConfig();
  return {
    url: "placeholder",
    postgresUrl: config.postgresUrl
  };
}
