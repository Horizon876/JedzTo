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

const RootLayout = () => {
  const { t } = useTranslation()
  const { appTheme } = useApptheme()
  const insets = useSafeAreaInsets()
  const { token, isAuthReady } = useContext(AuthContext)
  const { workMode } = useWorkMode()

  if (!isAuthReady) {
    return <SpinnerComponent />
  }

  if (!token) {
    return <Redirect href="/login" />
  }

  const homeTitle = workMode === 'delivery' ? t('Delivery') : t('Kitchen')
  const tabBarHeight = 68

  return (
    <Tabs
      key={workMode}
      safeAreaInsets={{ bottom: 0, top: 0, left: 0, right: insets.right }}
      screenOptions={{
        tabBarActiveTintColor: appTheme.primary,
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 8,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: '#2C2C2E',
          height: tabBarHeight,
          paddingTop: 4,
          paddingBottom: 14,
          marginBottom: 0,
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
            <HomeIcon color={color} width={22} height={22} />
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
            <PersonIcon color={color} width={22} height={22} />
          ),
        }}
      />
    </Tabs>
  )
}

export default RootLayout
