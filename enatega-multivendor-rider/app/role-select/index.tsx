import { useWorkMode } from '@/lib/context/global/work-mode.context'
import { useApptheme } from '@/lib/context/global/theme.context'
import { ROUTES } from '@/lib/utils/constants'
import { Href, Redirect, router } from 'expo-router'
import { useContext } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '@/lib/context/global/auth.context'
import SpinnerComponent from '@/lib/ui/useable-components/spinner'

export default function RoleSelectScreen() {
  const { t } = useTranslation()
  const { appTheme } = useApptheme()
  const insets = useSafeAreaInsets()
  const { token, isAuthReady } = useContext(AuthContext)
  const { workMode, isWorkModeReady, setWorkMode } = useWorkMode()

  if (!isAuthReady || !isWorkModeReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <SpinnerComponent />
      </View>
    )
  }

  if (!token) {
    return <Redirect href={ROUTES.login as Href} />
  }

  if (workMode) {
    return <Redirect href={ROUTES.home as Href} />
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
      <Text
        style={{
          textAlign: 'center',
          fontSize: 28,
          fontWeight: '900',
          color: appTheme.fontMainColor,
          marginBottom: 8,
        }}
      >
        {t('Choose role')}
      </Text>
      <Text
        style={{
          textAlign: 'center',
          fontSize: 15,
          color: '#6B7280',
          marginBottom: 32,
          lineHeight: 22,
        }}
      >
        {t('Select kitchen or delivery for this device')}
      </Text>

      <TouchableOpacity
        onPress={() => choose('kitchen')}
        style={{
          alignItems: 'center',
          borderRadius: 16,
          paddingVertical: 28,
          paddingHorizontal: 16,
          marginBottom: 14,
          backgroundColor: appTheme.primary || '#16a34a',
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>
          {t('Kitchen')}
        </Text>
        <Text
          style={{
            marginTop: 8,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.92)',
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {t('Accept orders and send them for delivery')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => choose('delivery')}
        style={{
          alignItems: 'center',
          borderRadius: 16,
          paddingVertical: 28,
          paddingHorizontal: 16,
          borderWidth: 2,
          borderColor: appTheme.primary || '#16a34a',
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: '800',
            color: appTheme.primary || '#16a34a',
          }}
        >
          {t('Delivery')}
        </Text>
        <Text
          style={{
            marginTop: 8,
            textAlign: 'center',
            color: '#6B7280',
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
