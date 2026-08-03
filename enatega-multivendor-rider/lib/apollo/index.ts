import {
  ApolloClient,
  ApolloLink,
  createHttpLink,
  InMemoryCache,
  NormalizedCacheObject,
  Observable,
  Operation,
  split,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import {
  getMainDefinition,
  offsetLimitPagination,
} from "@apollo/client/utilities";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "graphql-ws";
import { router } from "expo-router";
import { Platform } from "react-native";
import { DefinitionNode, FragmentDefinitionNode } from "graphql";
import { Subscription } from "zen-observable-ts";
import useEnvVars from "../../environment";
import { RIDER_ID, RIDER_TOKEN } from "../utils/constants";
import { getSecureItem, removeSecureItem } from "../services/secure-storage";
import { IRestaurantLocation } from "../utils/interfaces";
import { calculateDistance } from "../utils/methods/custom-functions";
import PublicAccessTokenService from "../services/public-access-token.service";

let isAuthRedirecting = false;

async function handleInvalidSession(): Promise<void> {
  if (isAuthRedirecting) return;
  isAuthRedirecting = true;

  try {
    await Promise.all([
      removeSecureItem(RIDER_TOKEN),
      AsyncStorage.removeItem(RIDER_ID),
    ]);
    router.replace("/login");
  } finally {
    setTimeout(() => {
      isAuthRedirecting = false;
    }, 1000);
  }
}

// The whole app must share a single client (one cache, one WS connection),
// so the client is created once and reused on subsequent calls.
let apolloClient: ApolloClient<NormalizedCacheObject> | null = null;

const setupApollo = () => {
  // useEnvVars uses useContext, so it must run on every render to keep hook
  // order stable — only the client construction below is skipped when cached.
  const { GRAPHQL_URL, WS_GRAPHQL_URL } = useEnvVars();

  if (apolloClient) {
    return apolloClient;
  }

  const cache = new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          _id: {
            keyArgs: ["string"],
          },
          orders: offsetLimitPagination(),
        },
      },
      Category: {
        fields: {
          foods: {
            merge(_existing, incoming) {
              return incoming;
            },
          },
        },
      },
      Food: {
        fields: {
          variations: {
            merge(_existing, incoming) {
              return incoming;
            },
          },
        },
      },
      // Some legacy order items come back without an `image` field (undefined
      // rather than null). A `read` policy marks the field optional, which
      // silences the "Missing field 'image'" cache warnings and normalizes the
      // absent value to null.
      Item: {
        fields: {
          image: {
            read(existing = null) {
              return existing;
            },
          },
        },
      },
      Order: {
        fields: {
          deliveryAddress: {
            merge(_existing, incoming) {
              return incoming;
            },
          },
        },
      },
      // Order polls request ETA on nested restaurant; missing/null values must
      // not wipe the kitchen timer fields written by KitchenRestaurantTimes.
      Restaurant: {
        fields: {
          defaultEta: {
            merge(existing, incoming) {
              return incoming != null ? incoming : existing;
            },
          },
          currentEta: {
            merge(existing, incoming) {
              return incoming != null ? incoming : existing;
            },
          },
          pickupTime: {
            merge(existing, incoming) {
              return incoming != null ? incoming : existing;
            },
          },
          deliveryTime: {
            merge(existing, incoming) {
              return incoming != null ? incoming : existing;
            },
          },
        },
      },
      DeliveryAddress: {
        keyFields: ["id"],
        fields: {
          location: {
            merge(_existing, incoming) {
              return incoming;
            },
          },
        },
      },
      RestaurantPreview: {
        fields: {
          distanceWithCurrentLocation: {
            read(_existing: IRestaurantLocation, { variables, readField }) {
              const restaurantLocation: IRestaurantLocation | undefined =
                readField("location");
              if (
                !restaurantLocation?.coordinates[0] ||
                !restaurantLocation?.coordinates[1]
              )
                return;
              const distance = calculateDistance(
                restaurantLocation.coordinates[0][0][0],
                restaurantLocation.coordinates[0][0][1],
                variables?.latitude,
                variables?.longitude,
              );
              return distance;
            },
          },
        },
      },
    },
  });

  const httpLink = createHttpLink({
    uri: GRAPHQL_URL,
  });

  // Match jedzto-local-api's graphql-ws server (subscriptions-transport-ws
  // never connected, so kitchen/customer never got live order pushes).
  const wsLink = new GraphQLWsLink(
    createClient({
      url: WS_GRAPHQL_URL,
      lazy: true,
      retryAttempts: Infinity,
      shouldRetry: () => true,
      connectionParams: async () => {
        const token = await getSecureItem(RIDER_TOKEN);
        const nonce = PublicAccessTokenService.getNonce();
        let publicToken: string | null = null;

        try {
          publicToken = await PublicAccessTokenService.getToken(client);
        } catch {
          publicToken = null;
        }

        return {
          authorization: token ? `Bearer ${token}` : "",
          "bop-auth": publicToken ? `Bearer ${publicToken}` : "",
          nonce: nonce || "",
        };
      },
      on: {
        error: () => {
          if (__DEV__) {
            console.warn("WebSocket connection error");
          }
        },
      },
    })
  );

  const request = async (operation: Operation) => {
    const skipPublicAuth =
      operation.getContext().headers?.["x-skip-public-auth"];
    // Prefer secure storage, fall back to AsyncStorage (Expo Go edge cases).
    const token =
      (await getSecureItem(RIDER_TOKEN)) ||
      (await AsyncStorage.getItem(RIDER_TOKEN));
    const nonce = PublicAccessTokenService.getNonce();

    const platform = Platform.OS;
    const locale = (await AsyncStorage.getItem("lang")) || "en";

    const headers: Record<string, string> = {
      authorization: token ? `Bearer ${token}` : "",
      nonce: nonce || "",
      "x-platform": platform,
      "accept-language": locale,
      "user-agent": `Yalla-Rider-App/${platform}`,
      ...operation.getContext().headers,
    };

    if (!skipPublicAuth) {
      try {
        const publicToken = await PublicAccessTokenService.getToken(client);
        if (publicToken) {
          headers["bop-auth"] = `Bearer ${publicToken}`;
        }
      } catch (error) {
        if (__DEV__) {
          console.warn(
            "Public access token unavailable; continuing without bop-auth",
            error
          );
        }
      }
    }

    operation.setContext({
      headers,
    });
  };

  const requestLink = new ApolloLink(
    (operation, forward) =>
      new Observable((observer) => {
        let handle: Subscription;
        Promise.resolve(operation)
          .then((oper) => request(oper))
          .then(() => {
            handle = forward(operation).subscribe({
              next: observer.next.bind(observer),
              error: observer.error.bind(observer),
              complete: observer.complete.bind(observer),
            });
          })
          .catch(observer.error.bind(observer));

        return () => {
          if (handle) handle.unsubscribe();
        };
      }),
  );

  const errorLink = onError(({ graphQLErrors, networkError }) => {
    // Only force logout for explicit session-invalid codes — never for a
    // transient UNAUTHENTICATED race (e.g. query before token hydrate).
    const hasInvalidSession = (graphQLErrors || []).some((graphQLError) => {
      const code = graphQLError?.extensions?.code;
      return code === "TOKEN_EXPIRED" || code === "INVALID_TOKEN";
    });

    if (hasInvalidSession) {
      void handleInvalidSession();
      return;
    }

    if (graphQLErrors && __DEV__) {
      graphQLErrors.forEach(({ message, extensions }) => {
        console.warn("GraphQL error", message, extensions?.code);
      });
    }
    if (networkError && __DEV__) {
      console.warn(
        "Network error while processing GraphQL request",
        networkError.message
      );
    }
  });

  const client = new ApolloClient({
    link: ApolloLink.from([
      errorLink,
      requestLink,
      split(
        ({ query }) => {
          const definition = getMainDefinition(query) as
            | DefinitionNode
            | (FragmentDefinitionNode & {
                kind: string;
                operation?: string;
              });
          return (
            definition.kind === "OperationDefinition" &&
            definition.operation === "subscription"
          );
        },
        wsLink,
        httpLink
      ),
    ]),
    cache,
    resolvers: {},
  });

  apolloClient = client;
  return client;
};

export default setupApollo;
