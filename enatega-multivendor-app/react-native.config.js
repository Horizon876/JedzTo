// Old transitive deps ship Android Gradle/Java that break on RN 0.81.
// Icons already come from @expo/vector-icons; clipboard paste in OTP is optional.
module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        android: null,
        ios: null
      }
    },
    '@react-native-community/clipboard': {
      platforms: {
        android: null,
        ios: null
      }
    }
  }
}
