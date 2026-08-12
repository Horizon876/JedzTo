import { useWorkMode } from '@/lib/context/global/work-mode.context'
import { useApptheme } from '@/lib/context/global/theme.context'
import { ROUTES } from '@/lib/utils/constants'
import { Href, Redirect, router } from 'expo-router'
import { useContext } from 'react'
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '@/lib/context/global/auth.context'
import SpinnerComponent from '@/lib/ui/useable-components/spinner'

const ACCENT = '#00A8FF'
const MUTED = '#8E8E93'
const SURFACE = '#1C1C1E'
const HAIRLINE = '#2C2C2E'

export default function RoleSelectScreen() {
  const { t } = useTranslation()
  const { appTheme } = useApptheme()
  const insets = useSafeAreaInsets()
  const { token, isAuthReady } = useContext(AuthContext)
  const { workMode, isWorkModeReady, setWorkMode } = useWorkMode()

  if (!isAuthReady || !isWorkModeReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: appTheme.themeBackground,
        }}
      >
        <SpinnerComponent />
      </View>
    )
  }

  if (!token) {
    return <Redirect href={ROUTES.login as Href} />
  }

  const choose = async (mode: 'kitchen' | 'delivery') => {
    await setWorkMode(mode)
    router.replace(ROUTES.home as Href)
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 16,
        backgroundColor: appTheme.themeBackground,
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor={appTheme.themeBackground} />
      <Text
        style={{
          textAlign: 'center',
          fontSize: 28,
          fontWeight: '800',
          color: '#FFFFFF',
          marginBottom: 8,
        }}
      >
        {t('Choose role')}
      </Text>
      <Text
        style={{
          textAlign: 'center',
          fontSize: 15,
          color: MUTED,
          marginBottom: 32,
          lineHeight: 22,
        }}
      >
        {t('Select kitchen or delivery for this device')}
      </Text>

      <TouchableOpacity
        onPress={() => choose('kitchen')}
        activeOpacity={0.85}
        style={{
          alignItems: 'center',
          borderRadius: 14,
          paddingVertical: 28,
          paddingHorizontal: 16,
          marginBottom: 14,
          backgroundColor: workMode === 'kitchen' ? ACCENT : SURFACE,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: workMode === 'kitchen' ? 'transparent' : HAIRLINE,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '800', color: workMode === 'kitchen' ? '#FFFFFF' : ACCENT }}>
          {t('Kitchen')}
        </Text>
        <Text
          style={{
            marginTop: 8,
            textAlign: 'center',
            color: workMode === 'kitchen' ? 'rgba(255,255,255,0.92)' : MUTED,
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {t('Accept orders and send them for delivery')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => choose('delivery')}
        activeOpacity={0.85}
        style={{
          alignItems: 'center',
          borderRadius: 14,
          paddingVertical: 28,
          paddingHorizontal: 16,
          backgroundColor: workMode === 'delivery' ? ACCENT : SURFACE,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: workMode === 'delivery' ? 'transparent' : HAIRLINE,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: '800',
            color: workMode === 'delivery' ? '#FFFFFF' : ACCENT,
          }}
        >
          {t('Delivery')}
        </Text>
        <Text
          style={{
            marginTop: 8,
            textAlign: 'center',
            color: workMode === 'delivery' ? 'rgba(255,255,255,0.92)' : MUTED,
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {t('Pick up ready orders and mark them delivered')}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
