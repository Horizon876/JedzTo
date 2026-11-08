/** Web stub — ATT is iOS-only. */
export async function requestTrackingPermissionsAsync() {
  return { status: 'granted', granted: true, canAskAgain: false }
}

export async function getTrackingPermissionsAsync() {
  return { status: 'granted', granted: true, canAskAgain: false }
}

export function useTrackingPermissions() {
  return [{ status: 'granted', granted: true }, async () => ({ status: 'granted' })]
}
