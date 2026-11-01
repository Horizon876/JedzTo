import { loadDevMessages, loadErrorMessages } from "@apollo/client/dev";
import * as Updates from "expo-updates";
import { Platform } from "react-native";

// Kitchen + rider apps share this package. Role is locked by EXPO_PUBLIC_APP_ROLE
// (kitchen | delivery). Use npm run start:kitchen / start:rider.
const PROD_API_HTTP = (
  process.env.EXPO_PUBLIC_JEDZTO_API_URL || "https://jedzto-api.onrender.com"
).replace(/\/$/, "");
const PROD_API_WS = PROD_API_HTTP.replace(/^https:/, "wss:").replace(
  /^http:/,
  "ws:"
);

const localHost = process.env.EXPO_PUBLIC_JEDZTO_API_HOST || "192.168.55.107";
const LOCAL_API_HTTP = `http://${localHost}:8001`;
const LOCAL_API_WS = `ws://${localHost}:8001`;

const resolveEnv = (env?: string | null) => {
  const resolved =
    env ||
    process.env.APP_ENV ||
    process.env.EXPO_PUBLIC_APP_ENV ||
    "production";
  if (resolved === "development") return "development";
  if (resolved === "staging") return "staging";
  return "production";
};

// Keep this free of React hooks — setupApollo caches the client on first call
// and must not depend on ConfigurationContext being mounted yet.
const getEnvVars = (env = Updates.channel) => {
  const googleMapsKey =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS
      : process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID;
  if (__DEV__) {
    loadDevMessages();
    loadErrorMessages();
  }

  const mode = resolveEnv(env);

  if (mode === "development") {
    return {
      GRAPHQL_URL: `${LOCAL_API_HTTP}/graphql`,
      WS_GRAPHQL_URL: `${LOCAL_API_WS}/graphql`,
      SENTRY_DSN:
        "https://e963731ba0f84e5d823a2bbe2968ea4d@o1103026.ingest.sentry.io/6135261",
      GOOGLE_MAPS_KEY: googleMapsKey,
      ENVIRONMENT: "development" as const,
    };
  }

  return {
    GRAPHQL_URL: `${PROD_API_HTTP}/graphql`,
    WS_GRAPHQL_URL: `${PROD_API_WS}/graphql`,
    SENTRY_DSN:
      "https://e963731ba0f84e5d823a2bbe2968ea4d@o1103026.ingest.sentry.io/6135261",
    GOOGLE_MAPS_KEY: googleMapsKey,
    ENVIRONMENT: mode,
  };
};

export default getEnvVars;
