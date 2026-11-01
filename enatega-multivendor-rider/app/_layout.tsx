/* eslint-disable @typescript-eslint/no-require-imports */
// Polyfill global.crypto.getRandomValues early so secure random is available
// app-wide (e.g. device nonce generation). Must be imported before first use.
import "react-native-get-random-values";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import * as Sentry from "@sentry/react-native";

import FlashMessage from "react-native-flash-message";

// Service
import setupApollo from "@/lib/apollo";
import { initSentry } from "@/lib/utils/service";

// Providers
import { AuthProvider } from "@/lib/context/global/auth.context";
import { ConfigurationProvider } from "@/lib/context/global/configuration.context";
import { LocationProvider } from "@/lib/context/global/location.context";
import { SoundProvider } from "@/lib/context/global/sound.context";
import { UserProvider } from "@/lib/context/global/user.context";
import { WorkModeProvider } from "@/lib/context/global/work-mode.context";
import { ApolloProvider } from "@apollo/client";

// Locale
import "@/i18next";

// Style
import InternetProvider from "@/lib/context/global/internet-provider";
import AppThemeProvidor from "@/lib/context/global/theme.context";
import RootStackLayout from "@/lib/ui/layouts/root-layout";
import { LocationPermissionComp } from "@/lib/ui/useable-components";
import AnimatedSplashScreen from "@/lib/ui/useable-components/splash/AnimatedSplashScreen";
import UnavailableStatus from "@/lib/ui/useable-components/unavailable-status";
import { requestMediaLibraryPermissionsAsync } from "expo-image-picker";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { setKitchenKeepScreenOn, setKitchenKioskMode } from "../modules/sunmi-inner-printer";

import "../global.css";
import PublicAccessTokenService from "@/lib/services/public-access-token.service";

initSentry();

// Disable React Native UI click beeps everywhere. New-order alert uses expo-audio (music stream).
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SoundManager = require("react-native/Libraries/Components/Sound/SoundManager");
  const sm = SoundManager?.default ?? SoundManager;
  if (sm && typeof sm.playTouchSound === "function") {
    sm.playTouchSound = () => {};
  }
} catch {
  // ignore — native mute is the fallback
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen?.preventAutoHideAsync();

function RootLayout() {
  // Hooks
  const [loaded] = useFonts({
    SpaceMono: require("../lib/assets/fonts/SpaceMono-Regular.ttf"),
    Inter: require("../lib/assets/fonts/Inter.ttf"),
  });
  const [isPublicTokenReady, setIsPublicTokenReady] = useState(false);
  const client = setupApollo();

  // Permissions
  async function grantCameraAndGalleryPermissions() {
    await requestMediaLibraryPermissionsAsync();
  }

  // Use Effect
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    PublicAccessTokenService.initialize(client)
      .then(() => {
        setIsPublicTokenReady(true);
      })
      .catch((error) => {
        console.log("Public auth initialization failed:", error);
        setIsPublicTokenReady(true);
      });
  }, [client]);

  useEffect(() => {
    grantCameraAndGalleryPermissions();
  }, []);

  useEffect(() => {
    const enableKiosk = () => {
      void setKitchenKeepScreenOn(true);
      void setKitchenKioskMode(true);
    };
    enableKiosk();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") enableKiosk();
    });
    return () => {
      sub.remove();
      void setKitchenKioskMode(false);
      void setKitchenKeepScreenOn(false);
    };
  }, []);

  useEffect(() => {
    const previousHandler = ErrorUtils.getGlobalHandler?.();

    ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.log("Global Error Caught:", { error, isFatal });
      Sentry.captureException(error);

      if (previousHandler) {
        previousHandler(error, isFatal);
      }
    });

    return () => {
      if (previousHandler) {
        ErrorUtils.setGlobalHandler(previousHandler);
      }
    };
  }, []);

  if (!loaded || !isPublicTokenReady) {
    return null;
  }

  return (
    <AnimatedSplashScreen>
      <AppThemeProvidor>
        <ApolloProvider client={client}>
          <AuthProvider client={client}>
            <WorkModeProvider>
              <UserProvider>
                <InternetProvider>
                  <ConfigurationProvider>
                    <LocationProvider>
                      <SoundProvider>
                        <LocationPermissionComp>
                          <RootStackLayout />
                          <UnavailableStatus />
                        </LocationPermissionComp>
                        <StatusBar hidden />
                        <FlashMessage position="bottom" />
                      </SoundProvider>
                    </LocationProvider>
                  </ConfigurationProvider>
                </InternetProvider>
              </UserProvider>
            </WorkModeProvider>
          </AuthProvider>
        </ApolloProvider>
      </AppThemeProvidor>
    </AnimatedSplashScreen>
  );
}

export default Sentry.wrap(RootLayout);
