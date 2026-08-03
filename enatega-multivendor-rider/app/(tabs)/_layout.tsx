import { AuthContext } from '@/lib/context/global/auth.context'
import { useWorkMode } from '@/lib/context/global/work-mode.context'
import SpinnerComponent from '@/lib/ui/useable-components/spinner'
import { Redirect, Tabs } from 'expo-router'
import { Platform, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HapticTab } from '@/lib/ui/useable-components/HapticTab'
import { HomeIcon, PersonIcon } from '@/lib/ui/useable-components/svg'
import { useApptheme } from '@/lib/context/global/theme.context'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/lib/utils/constants'

const RootLayout = () => {
  const { t } = useTranslation()
  const { appTheme } = useApptheme()
  const insets = useSafeAreaInsets()
  const { token, isAuthReady } = useContext(AuthContext)
  const { workMode, isWorkModeReady } = useWorkMode()

  if (!isAuthReady || !isWorkModeReady) {
    return <SpinnerComponent />
  }

  if (!token) {
    return <Redirect href="/login" />
  }

  if (!workMode) {
    return <Redirect href={ROUTES.roleSelect} />
  }

  const homeTitle = workMode === 'delivery' ? t('Delivery') : t('Kitchen')
  const tabBarHeight = 56 + Math.max(insets.bottom, 8)

  return (
    <Tabs
      key={workMode}
      screenOptions={{
        tabBarActiveTintColor: appTheme.primary,
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarStyle: {
          position: 'relative',
          backgroundColor: '#121212',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: '#2C2C2E',
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
            },
            android: {
              elevation: 8,
            },
          }),
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          href: '/(tabs)/home/orders',
          title: homeTitle,
          tabBarIcon: ({ color }) => (
            <HomeIcon color={color} width={24} height={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          href: null,
          title: t('Wallet'),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          href: null,
          title: t('Earnings'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('Settings'),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <PersonIcon color={color} width={24} height={24} />
          ),
        }}
      />
    </Tabs>
  )
}

export default RootLayout
