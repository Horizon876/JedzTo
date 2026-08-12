import { useContext } from 'react'
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Href, router } from 'expo-router'

import { AuthContext } from '@/lib/context/global/auth.context'
import { useWorkMode } from '@/lib/context/global/work-mode.context'
import { useApptheme } from '@/lib/context/global/theme.context'
import { ROUTES } from '@/lib/utils/constants'

const ACCENT = '#00A8FF'
const MUTED = '#8E8E93'
const SURFACE = '#1C1C1E'
const HAIRLINE = '#2C2C2E'
const DESTRUCTIVE = '#FF453A'
const PAGE = '#121212'

export default function Profile() {
  const { t } = useTranslation()
  const { appTheme } = useApptheme()
  const insets = useSafeAreaInsets()
  const { logout } = useContext(AuthContext)
  const { workMode, clearWorkMode } = useWorkMode()

  const switchRole = async () => {
    router.replace(ROUTES.roleSelect as Href)
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: appTheme.themeBackground || PAGE,
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor={PAGE} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 100,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('Settings')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={[styles.subtitle, { marginBottom: 0 }]}>
            {t('Current role')}:{' '}
          </Text>
          <View style={{ backgroundColor: ACCENT, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 }}>
            <Text style={styles.roleValue}>
              {workMode === 'delivery' ? t('Delivery') : t('Kitchen')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={switchRole}
          activeOpacity={0.85}
          style={styles.outlineBtn}
        >
          <Text style={styles.outlineBtnText}>{t('Switch role')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => logout?.()}
          activeOpacity={0.85}
          style={styles.logoutBtn}
        >
          <Text style={styles.logoutBtnText}>{t('Logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 15,
    color: MUTED,
    marginBottom: 8,
  },
  roleValue: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  outlineBtn: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    backgroundColor: SURFACE,
    paddingVertical: 16,
  },
  outlineBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
  },
  logoutBtn: {
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    backgroundColor: DESTRUCTIVE,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
