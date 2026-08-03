import React, { useContext, useEffect, useState, useCallback } from 'react'
import { View, TouchableOpacity, StatusBar, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ActiveOrders from '../../components/MyOrders/ActiveOrders'
import PastOrders from '../../components/MyOrders/PastOrders'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import styles, { BG } from './styles'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { MaterialIcons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { scale } from '../../utils/scaling'
import Analytics from '../../utils/analytics'
import OrdersContext from '../../context/Orders'
import { useTranslation } from 'react-i18next'
import useNetworkStatus from '../../utils/useNetworkStatus'
import ErrorView from '../../components/ErrorView/ErrorView'

const ACCENT_COLOR = '#00A8FF'
const MUTED_ICON = '#9CA3AF'

function MyOrders(props) {
  const analytics = Analytics()
  const { t, i18n } = useTranslation()
  const {
    activeOrders,
    pastOrders,
    loadingActiveOrders,
    loadingPastOrders,
    errorActiveOrders,
    errorPastOrders,
    reFetchOrders
  } = useContext(OrdersContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }
  const [selectedTab, setSelectedTab] = useState('current')
  const inset = useSafeAreaInsets()
  const showBack = props?.route?.name === 'MyOrders'
  const { isConnected: connect } = useNetworkStatus()

  useEffect(() => {
    async function Track() {
      await analytics.track(analytics.events.NAVIGATE_TO_MYORDERS)
    }
    Track()
  }, [])

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content')
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(BG)
      }
    }, [])
  )

  useEffect(() => {
    props?.navigation.setOptions({
      headerShown: false
    })
  }, [props?.navigation])

  const TabButton = ({ text, onPress, isSelected }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityLabel={t(text)}
      style={[
        styles(currentTheme).toggleSegment,
        isSelected && styles(currentTheme).toggleSegmentActive
      ]}
    >
      <TextDefault bolder small textColor={isSelected ? ACCENT_COLOR : MUTED_ICON} style={styles().toggleLabel}>
        {t(text)}
      </TextDefault>
    </TouchableOpacity>
  )

  if (!connect) return <ErrorView refetchFunctions={[reFetchOrders]} />

  return (
    <View style={styles(currentTheme).container}>
      <View style={[styles(currentTheme).topSurface, { paddingTop: inset.top + scale(8) }]}>
        <View style={styles(currentTheme).headerRow}>
          {showBack ? (
            <TouchableOpacity
              style={styles().backButton}
              onPress={() => props?.navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name='arrow-back' size={24} color='#FFFFFF' />
            </TouchableOpacity>
          ) : null}
          <TextDefault bolder H4 textColor='#FFFFFF' style={styles().headerTitle}>
            {t('titleOrders')}
          </TextDefault>
        </View>

        <View style={styles(currentTheme).tabContainer}>
          <TabButton
            text='current'
            onPress={() => setSelectedTab('current')}
            isSelected={selectedTab === 'current'}
          />
          <TabButton
            text='past'
            onPress={() => setSelectedTab('past')}
            isSelected={selectedTab === 'past'}
          />
        </View>
      </View>

      <View style={styles(currentTheme).listContainer}>
        <View
          pointerEvents={selectedTab === 'current' ? 'auto' : 'none'}
          style={selectedTab === 'current' ? styles(currentTheme).visibleTabContent : styles(currentTheme).hiddenTabContent}
        >
          <ActiveOrders
            navigation={props?.navigation}
            activeOrders={activeOrders}
            loading={loadingActiveOrders}
            error={errorActiveOrders}
          />
        </View>
        <View
          pointerEvents={selectedTab === 'past' ? 'auto' : 'none'}
          style={selectedTab === 'past' ? styles(currentTheme).visibleTabContent : styles(currentTheme).hiddenTabContent}
        >
          <PastOrders
            navigation={props?.navigation}
            pastOrders={pastOrders}
            loading={loadingPastOrders}
            error={errorPastOrders}
          />
        </View>
      </View>
    </View>
  )
}

export default MyOrders
