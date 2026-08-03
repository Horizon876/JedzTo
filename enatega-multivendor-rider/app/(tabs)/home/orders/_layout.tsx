import { useWorkMode } from '@/lib/context/global/work-mode.context'
import { useApptheme } from '@/lib/context/global/theme.context'
import NewOrderOverlay from '@/lib/ui/screen-components/home/orders/new-order-overlay'
import KitchenEtaTopControl from '@/lib/ui/screen-components/home/orders/main/kitchen-eta-top-control'
import { Tabs, router, usePathname } from 'expo-router'
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'

const ACCENT = '#00A8FF'
const MUTED = '#8E8E93'
const HAIRLINE = '#2C2C2E'
const SEGMENT_TRACK = '#333333'
const SEGMENT_BORDER = '#404040'

function OrdersTopBar() {
  const { t } = useTranslation()
  const { appTheme } = useApptheme()
  const { workMode } = useWorkMode()
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const isDelivery = workMode === 'delivery'

  const tabs = useMemo(() => {
    if (isDelivery) {
      return [
        { key: 'index', href: '/(tabs)/home/orders', label: t('For delivery') },
        {
          key: 'delivered',
          href: '/(tabs)/home/orders/delivered',
          label: t('Delivered'),
        },
      ]
    }
    return [
      { key: 'index', href: '/(tabs)/home/orders', label: t('In progress') },
      {
        key: 'processing',
        href: '/(tabs)/home/orders/processing',
        label: t('Out for delivery'),
      },
    ]
  }, [isDelivery, t])

  const isActive = (key: string) => {
    if (key === 'index') {
      return (
        pathname === '/home/orders' ||
        pathname === '/(tabs)/home/orders' ||
        pathname.endsWith('/orders') ||
        pathname.endsWith('/orders/')
      )
    }
    return pathname.includes(`/orders/${key}`)
  }

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: appTheme.themeBackground,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: HAIRLINE,
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor={appTheme.themeBackground} />
      <Text style={styles.title} numberOfLines={1}>
        {isDelivery ? t('Delivery') : t('Kitchen')}
      </Text>
      {!isDelivery ? (
        <View style={styles.etaRow}>
          <KitchenEtaTopControl />
        </View>
      ) : null}
      <View style={styles.segmentTrack}>
        {tabs.map((tab) => {
          const active = isActive(tab.key)
          return (
            <Pressable
              key={tab.key}
              onPress={() => router.replace(tab.href as never)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text
                style={{
                  color: active ? ACCENT : MUTED,
                  fontWeight: active ? '700' : '500',
                  fontSize: 14,
                }}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export default function OrdersLayout() {
  const { workMode } = useWorkMode()
  const { appTheme } = useApptheme()
  const isDelivery = workMode === 'delivery'

  return (
    <View style={{ flex: 1, backgroundColor: appTheme.themeBackground }}>
      {workMode === 'kitchen' ? <NewOrderOverlay /> : null}
      <OrdersTopBar />
      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen
          name="processing"
          options={{ href: isDelivery ? null : undefined }}
        />
        <Tabs.Screen
          name="delivered"
          options={{ href: isDelivery ? undefined : null }}
        />
      </Tabs>
    </View>
  )
}

const styles = StyleSheet.create({
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    textAlign: 'center',
  },
  etaRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  segmentTrack: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
    borderRadius: 12,
    backgroundColor: SEGMENT_TRACK,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SEGMENT_BORDER,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
  },
})
