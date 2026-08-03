import { loadDevMessages, loadErrorMessages } from "@apollo/client/dev";
import * as Updates from "expo-updates";
import { Platform } from "react-native";

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
  const localHost = process.env.EXPO_PUBLIC_JEDZTO_API_HOST || "192.168.55.107";

  if (env === "production" || env === "staging") {
    return {
      GRAPHQL_URL: "https://aws-server-v2.enatega.com/graphql",
      WS_GRAPHQL_URL: "wss://aws-server-v2.enatega.com/graphql",
      SENTRY_DSN:
        "https://e963731ba0f84e5d823a2bbe2968ea4d@o1103026.ingest.sentry.io/6135261",
      GOOGLE_MAPS_KEY: googleMapsKey,
      ENVIRONMENT: env,
    };
  }

  return {
    GRAPHQL_URL: `http://${localHost}:8001/graphql`,
    WS_GRAPHQL_URL: `ws://${localHost}:8001/graphql`,
    SENTRY_DSN:
      "https://e963731ba0f84e5d823a2bbe2968ea4d@o1103026.ingest.sentry.io/6135261",
    GOOGLE_MAPS_KEY: googleMapsKey,
    ENVIRONMENT: "development",
  };
};

export default getEnvVars;
