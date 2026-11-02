import React, { useCallback, useContext, useState } from 'react'
import { Platform, StatusBar, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { statusBarStyleForTheme } from '../../utils/statusBar'
import { scale } from '../../utils/scaling'
import Favourite from '../Favourite/Favourite'
import Account from '../Account/Account'
import styles, { ACCENT } from './styles'

const MUTED_ICON = '#9CA3AF'

export default function AccountHub(props) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ThemeValue: themeContext.ThemeValue,
    ...theme[themeContext.ThemeValue]
  }
  const themed = styles(currentTheme)
  const { SURFACE, text } = themed.colors
  const [selectedTab, setSelectedTab] = useState('account')

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(statusBarStyleForTheme(themeContext.ThemeValue))
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(SURFACE)
      }
    }, [SURFACE, themeContext.ThemeValue])
  )

  const TabButton = ({ labelKey, value }) => {
    const isSelected = selectedTab === value
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setSelectedTab(value)}
        accessibilityLabel={t(labelKey)}
        style={[themed.toggleSegment, isSelected && themed.toggleSegmentActive]}
      >
        <TextDefault bolder small textColor={isSelected ? ACCENT : MUTED_ICON} style={themed.toggleLabel}>
          {t(labelKey)}
        </TextDefault>
      </TouchableOpacity>
    )
  }

  return (
    <View style={themed.container}>
      <View style={[themed.topSurface, { paddingTop: insets.top + scale(8) }]}>
        <View style={themed.headerRow}>
          <TextDefault bolder H4 textColor={text} style={themed.headerTitle}>
            {t('Account')}
          </TextDefault>
        </View>

        <View style={themed.tabContainer}>
          <TabButton labelKey='Favourite' value='favourites' />
          <TabButton labelKey='Account' value='account' />
        </View>
      </View>

      <View style={themed.listContainer}>
        <View
          pointerEvents={selectedTab === 'favourites' ? 'auto' : 'none'}
          style={selectedTab === 'favourites' ? themed.visibleTabContent : themed.hiddenTabContent}
        >
          <Favourite {...props} embedded />
        </View>
        <View
          pointerEvents={selectedTab === 'account' ? 'auto' : 'none'}
          style={selectedTab === 'account' ? themed.visibleTabContent : themed.hiddenTabContent}
        >
          <Account {...props} embedded />
        </View>
      </View>
    </View>
  )
}
