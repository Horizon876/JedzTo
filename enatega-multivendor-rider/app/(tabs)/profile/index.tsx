import { AuthContext } from '@/lib/context/global/auth.context'
import { useWorkMode } from '@/lib/context/global/work-mode.context'
import { useApptheme } from '@/lib/context/global/theme.context'
import { ROUTES } from '@/lib/utils/constants'
import { Href, router } from 'expo-router'
import { useContext } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

export default function Profile() {
  const { t } = useTranslation()
  const { appTheme } = useApptheme()
  const insets = useSafeAreaInsets()
  const { logout } = useContext(AuthContext)
  const { workMode, clearWorkMode } = useWorkMode()

  const switchRole = async () => {
    await clearWorkMode()
    router.replace(ROUTES.roleSelect as Href)
  }

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 80,
        backgroundColor: appTheme.themeBackground,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: '900',
          color: appTheme.fontMainColor,
          marginBottom: 8,
        }}
      >
        {t('Settings')}
      </Text>
      <Text style={{ fontSize: 15, color: '#6B7280', marginBottom: 28 }}>
        {t('Current role')}:{' '}
        <Text style={{ fontWeight: '700', color: appTheme.fontMainColor }}>
          {workMode === 'delivery' ? t('Delivery') : t('Kitchen')}
        </Text>
      </Text>

      <TouchableOpacity
        onPress={switchRole}
        style={{
          alignItems: 'center',
          borderRadius: 12,
          borderWidth: 2,
          borderColor: appTheme.primary || '#16a34a',
          paddingVertical: 16,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: appTheme.primary || '#16a34a',
          }}
        >
          {t('Switch role')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => logout?.()}
        style={{
          alignItems: 'center',
          borderRadius: 12,
          paddingVertical: 16,
          backgroundColor: '#dc2626',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
          {t('Logout')}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
