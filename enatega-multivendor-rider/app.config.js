const iosGoogleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS ||
  process.env.IOS_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY
const androidGoogleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID ||
  process.env.ANDROID_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY

const rawRole = String(process.env.EXPO_PUBLIC_APP_ROLE || '')
  .trim()
  .toLowerCase()
const isDelivery =
  rawRole === 'delivery' || rawRole === 'rider' || rawRole === 'kierowca'

const appIdentity = isDelivery
  ? {
      name: 'JedzTo Kierowca',
      slug: 'jedzto-rider',
      scheme: 'jedztorider',
      // New package so kitchen + rider can sit side by side.
      packageName: 'com.jedzto.rider',
    }
  : {
      name: 'JedzTo Kuchnia',
      slug: 'jedzto-kitchen',
      scheme: 'jedztokitchen',
      // Keep existing Sunmi / google-services package so kitchen updates in place.
      packageName: 'com.enatega.multirider',
    }

module.exports = {
  expo: {
    name: appIdentity.name,
    description:
      "Enatega is a starter kit food ordering app built in React Native using Expo for IOS and Android. It's made keeping good aesthetics in mind as well keeping the best coding practices in mind. Its fully customisable to easily help you in your next food delivery project. https://market.nativebase.io/view/react-native-food-delivery-backend-app",
    version: '1.1.113',
    slug: appIdentity.slug,
    orientation: 'portrait',
    androidStatusBar: {
      hidden: true,
      translucent: true,
      backgroundColor: '#00000000',
    },
    androidNavigationBar: {
      visible: 'immersive',
      backgroundColor: '#000000',
    },
    splash: {
      image: './lib/assets/images/black.png',
      resizeMode: 'cover',
      backgroundColor: '#000000'
    },
    icon: './lib/assets/images/icon.png',
    assetBundlePatterns: ['lib/assets/**/*'],
    scheme: appIdentity.scheme,
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    plugins: [
      'expo-router',
      [
        'expo-image-picker',
        {
          photosPermission:
            'The app accesses your photos for license, vehicle plate and profile image. Please allow these to continue using the app.'
        }
      ],
      'expo-font',
      [
        'expo-video',
        {
          supportsBackgroundPlayback: true,
          supportsPictureInPicture: true
        }
      ],
      'expo-secure-store',
      [
        'expo-audio',
        {
          microphonePermission: false,
          enableBackgroundPlayback: true
        }
      ],
      [
        'expo-build-properties',
        {
          android: {
            minSdkVersion: 24,
            // Sunmi V2 is Android 7.1.2 and often 32-bit userspace.
            buildArchs: ['armeabi-v7a', 'arm64-v8a'],
            useLegacyPackaging: true,
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true
          }
        }
      ]
    ],
    platforms: ['ios', 'android'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: appIdentity.packageName,
      config: {
        ...(iosGoogleMapsApiKey ? { googleMapsApiKey: iosGoogleMapsApiKey } : {})
      },
      icon: './lib/assets/images/icon.png',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          '$(PRODUCT_NAME) uses your location for features like finding orders nearby and tracking customer orders!',
        UIBackgroundModes: ['location', 'fetch', 'remote-notification', 'audio'],
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      versionCode: 113,
      googleServicesFile: './google-services.json',
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'MODIFY_AUDIO_SETTINGS',
        'FOREGROUND_SERVICE',
        'RECEIVE_BOOT_COMPLETED'
      ],
      config: {
        googleMaps: {
          ...(androidGoogleMapsApiKey ? { apiKey: androidGoogleMapsApiKey } : {})
        }
      },
      package: appIdentity.packageName,
      icon: './lib/assets/images/appIcon.png',
      adaptiveIcon: {
        foregroundImage: './lib/assets/images/appIcon.png',
        backgroundColor: '#ffffff'
      }
    },
    extra: {
      appRole: isDelivery ? 'delivery' : 'kitchen',
      eas: {
        projectId: '9144a7fc-b205-464a-8fb6-64eb66fc8743'
      }
    },
    experiments: {
      typedRoutes: true
    }
  }
}
