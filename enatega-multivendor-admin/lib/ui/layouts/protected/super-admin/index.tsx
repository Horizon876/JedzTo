'use client'

import { useEffect } from 'react'
import { initialize, isFirebaseSupported } from '@/firebase'
import { getToken, onMessage } from 'firebase/messaging'
import { useApolloClient } from '@apollo/client'

import { PanelShell } from '@/lib/ui/screen-components/protected/layout/shared'
import { SUPER_ADMIN_MODULES } from '@/lib/utils/constants/panel-nav'
import { IProvider } from '@/lib/utils/interfaces'
import { useUserContext } from '@/lib/hooks/useUser'
import { useConfiguration } from '@/lib/hooks/useConfiguration'
import { UPLOAD_TOKEN } from '@/lib/api/graphql/queries/token'

const Layout = ({ children }: IProvider) => {
  const client = useApolloClient()
  const { user } = useUserContext()
  const {
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_KEY,
    FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_MSG_SENDER_ID,
    FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID,
    FIREBASE_VAPID_KEY,
  } = useConfiguration()

  useEffect(() => {
    if (!user) return

    const initializeFirebase = async () => {
      if (await isFirebaseSupported()) {
        const messaging = initialize({
          FIREBASE_AUTH_DOMAIN,
          FIREBASE_KEY,
          FIREBASE_PROJECT_ID,
          FIREBASE_STORAGE_BUCKET,
          FIREBASE_MSG_SENDER_ID,
          FIREBASE_APP_ID,
          FIREBASE_MEASUREMENT_ID,
        })

        if (!messaging) return

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        getToken(messaging, { vapidKey: FIREBASE_VAPID_KEY })
          .then((token) => {
            if (!token) return
            localStorage.setItem('messaging-token', token)
            client
              .mutate({
                mutation: UPLOAD_TOKEN,
                variables: { id: user?.userId, pushToken: token },
              })
              .catch(() => undefined)
          })
          .catch(() => undefined)

        onMessage(messaging, (payload) => {
          if (!payload.notification) return
          const { title, body } = payload.notification
          const notification = new Notification(title ?? '', { body })
          notification.onclick = () => {
            window.open('/home', '_blank')
          }
        })
      }
    }

    void initializeFirebase()
  }, [user])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .catch(() => undefined)
    }
  }, [])

  return (
    <PanelShell
      role="super-admin"
      modules={SUPER_ADMIN_MODULES}
      brandFallback="JedzTo Admin"
    >
      {children}
    </PanelShell>
  )
}

export default Layout
