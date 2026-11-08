/** Web stub — native Google Sign-In is unavailable; use expo-auth-session on web. */
export const GoogleSignin = {
  configure: () => undefined,
  hasPlayServices: async () => true,
  signIn: async () => {
    throw new Error('Native Google Sign-In is not available on web')
  },
  signOut: async () => undefined,
  isSignedIn: async () => false,
  getTokens: async () => ({ accessToken: '', idToken: '' }),
  getCurrentUser: async () => null
}

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE'
}
