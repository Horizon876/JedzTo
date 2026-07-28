import { useWorkMode } from '@/lib/context/global/work-mode.context'
import { useApptheme } from '@/lib/context/global/theme.context'
import { Tabs, router, usePathname } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'

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
        borderBottomWidth: 1,
        borderBottomColor: appTheme.borderLineColor || '#e5e7eb',
      }}
    >
      <Text
        style={{
          color: appTheme.fontMainColor,
          fontSize: 20,
          fontWeight: '800',
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 10,
        }}
      >
        {isDelivery ? t('Delivery') : t('Kitchen')}
      </Text>
      <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
        {tabs.map((tab) => {
          const active = isActive(tab.key)
          return (
            <Pressable
              key={tab.key}
              onPress={() => router.replace(tab.href as never)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: active
                  ? appTheme.primary || '#16a34a'
                  : 'transparent',
              }}
            >
              <Text
                style={{
                  color: active ? appTheme.fontMainColor : '#6B7280',
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
