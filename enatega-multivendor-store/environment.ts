/*****************************
 * environment.js
 * path: '/environment.js' (root of your project)
 ******************************/

import * as Updates from "expo-updates";
import { useContext } from "react";
import { ConfigurationContext } from "./lib/context/global/configuration.context";

const getEnvVars = (env = Updates.channel) => {
  const configuration = useContext(ConfigurationContext);

  const localHost = process.env.EXPO_PUBLIC_JEDZTO_API_HOST || "10.18.254.25";

  if (env === "production" || env === "staging") {
    return {
      GRAPHQL_URL: "https://aws-server-v2.enatega.com/graphql",
      WS_GRAPHQL_URL: "wss://aws-server-v2.enatega.com/graphql",
    };
  }
  return {
    GRAPHQL_URL: `http://${localHost}:8001/graphql`,
    WS_GRAPHQL_URL: `ws://${localHost}:8001/graphql`,
  };
};

export default getEnvVars;
