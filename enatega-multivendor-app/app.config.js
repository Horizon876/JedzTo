module.exports = () => {
  const iosGoogleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS
  const androidGoogleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID
  const reversedGoogleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID
  // Local Expo Go works without login when owner/EAS project are omitted.
  const useEasAccount = Boolean(
    process.env.EXPO_TOKEN || process.env.EXPO_PUBLIC_USE_EAS === '1'
  )

  const fallbackUrlTypes = [
    {
      CFBundleURLSchemes: [
        'com.googleusercontent.apps.650001300965-dkji7jutv8gc5m4n7cdg3nft87sauhn7'
      ]
    }
  ]

  const urlTypes = reversedGoogleIosClientId
    ? [
        {
          CFBundleURLSchemes: [reversedGoogleIosClientId]
        }
      ]
    : fallbackUrlTypes

  return {
    name: 'JedzTo',
    scheme: 'enategamultivendor',
    version: '1.1.27',
    description:
      'JedzTo is a food ordering & delivery app built in React Native using Expo for iOS and Android.',
    slug: 'enategamultivendor',
    ...(useEasAccount ? { owner: 'ninjas_code' } : {}),
    ...(useEasAccount
      ? { experiments: { buildCacheProvider: 'eas' } }
      : {}),
    androidStatusBar: {
      backgroundColor: '#00000000',
      translucent: true,
      barStyle: 'dark-content'
    },
    splash: {
      image: './assets/splash.png',
      resizeMode: "cover",
        "backgroundColor": "#000000"
    },
    platforms: ['ios', 'android', 'web'],
    orientation: 'portrait',
    web: {
      bundler: 'metro',
      favicon: './assets/appIcon.png',
      name: 'JedzTo',
      shortName: 'JedzTo',
      lang: 'pl',
      themeColor: '#00A8FF',
      backgroundColor: '#121212',
      description: 'JedzTo — zamawiaj jedzenie online'
    },
    icon: './assets/appIcon.png',
    assetBundlePatterns: ['**/*'],
    userInterfaceStyle: 'automatic',
    ios: {
      splash: {
        image: './assets/splash.png',
        resizeMode: "cover",
          "backgroundColor": "#000000"
      },
      entitlements: {
        'com.apple.developer.networking.wifi-info': true,
        // Store / EAS production builds must use production push environment.
        'aps-environment':
          process.env.APP_ENV === 'production' ||
          process.env.EAS_BUILD_PROFILE === 'production'
            ? 'production'
            : 'development'
      },
      supportsTablet: true,
      userInterfaceStyle: 'automatic',
      bundleIdentifier: 'com.enatega.multivendor',
      icon: './assets/appIcon.png',
      googleServicesFile: './GoogleService-Info.plist',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Allow $(PRODUCT_NAME) to use location to determine the delivery address for your orders.',
        UIBackgroundModes: ['remote-notification', 'remote-notification'],
        NSUserTrackingUsageDescription:
          'Allow this app to collect app-related data that can be used for tracking you or your device.',
        CFBundleURLTypes: urlTypes,
        ITSAppUsesNonExemptEncryption: false
      },
      config: {
        ...(iosGoogleMapsApiKey ? { googleMapsApiKey: iosGoogleMapsApiKey } : {})
      },
      usesAppleSignIn: true
    },
    notification: {
      iosDisplayInForeground: true,
      color: '#00E676',
      icon: './assets/not-icon.png',
      androidMode: 'default',
      androidCollapsedTitle: 'JedzTo'
    },
    android: {
      versionCode: 127,
      package: 'com.enatega.multivendor',
      userInterfaceStyle: 'automatic',
      googleServicesFile: './google-services.json',
      splash: {
        image: './assets/splash.png',
        resizeMode: 'cover',
        backgroundColor: '#000000'
      },
      config: {
        ...(androidGoogleMapsApiKey
          ? {
              googleMaps: {
                apiKey: androidGoogleMapsApiKey
              }
            }
          : {})
      },
      permissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.FOREGROUND_SERVICE'
      ],
      icon: './assets/appIcon.png',
      queries: {
        packages: ['com.whatsapp', 'com.whatsapp.w4b']
      },
      intentFilters: [
        {
          action: 'android.intent.action.VIEW',
          data: [
            {
              scheme: 'whatsapp'
            }
          ],
          category: ['BROWSABLE', 'DEFAULT']
        }
      ],
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000'
      }
    },
    plugins: [
      [
        'expo-tracking-transparency',
        {
          userTrackingPermission:
            'Allow this app to collect app-related data that can be used for tracking you or your device.'
        }
      ],
      [
        'expo-updates',
        {
          username: 'ninjas_code'
        }
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow JedzTo to use your location.'
        }
      ],
      'expo-notifications',
      'expo-font',
      'expo-localization',
      'expo-web-browser',
      'expo-video',
      'expo-apple-authentication',
      '@react-native-community/datetimepicker'
    ],
    extra: useEasAccount
      ? {
          eas: {
            projectId: '331d4e5b-b12a-434a-92ec-d6d283dc0e46'
          }
        }
      : {},
    runtimeVersion: '1.1.27',
    ...(useEasAccount
      ? {
          updates: {
            url: 'https://u.expo.dev/331d4e5b-b12a-434a-92ec-d6d283dc0e46'
          }
        }
      : {})
  }
}
