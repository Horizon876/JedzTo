import * as Notifications from 'expo-notifications'

export function useLastNotificationResponseSafe() {
  return Notifications.useLastNotificationResponse()
}
