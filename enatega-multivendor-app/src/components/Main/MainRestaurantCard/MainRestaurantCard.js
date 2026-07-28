import React, { useContext, useCallback, useMemo } from 'react'
import { View, TouchableOpacity } from 'react-native'
import styles from './styles'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { alignment } from '../../../utils/alignment'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import { useTranslation } from 'react-i18next'
import NewRestaurantCard from '../RestaurantCard/NewRestaurantCard'
import MainLoadingUI from '../LoadingUI/MainLoadingUI'
import { useNavigation } from '@react-navigation/native'
import { scale } from '../../../utils/scaling'
import { isOpen } from '../../../utils/customFunctions'
import HorizontalFlashList from '../../Lists/HorizontalFlashList'

const ACCENT = '#00A8FF'

function MainRestaurantCard(props) {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = useMemo(
    () => ({
      isRTL: i18n.dir() === 'rtl',
      ...theme[themeContext.ThemeValue]
    }),
    [i18n.language, themeContext.ThemeValue]
  )

  const orders = useMemo(() => props?.orders || [], [props?.orders])

  const renderRestaurantItem = useCallback(({ item }) => {
    const restaurantOpen = isOpen(item)
    return <NewRestaurantCard {...item} isOpen={restaurantOpen} />
  }, [])

  if (props?.loading) return <MainLoadingUI />
  if (props?.error || orders?.length <= 0) return <></>

  return (
    <View style={styles().orderAgainSec}>
      <View style={{ gap: scale(10) }}>
        <View style={styles(currentTheme).header}>
          <TextDefault
            numberOfLines={1}
            textColor={props?.titleColor || '#FFFFFF'}
            bolder
            H4
            style={styles(currentTheme).titleText}
          >
            {t(props?.title)}
          </TextDefault>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              navigation.navigate('Menu', {
                selectedType: props?.selectedType ?? 'restaurant',
                queryType: props?.queryType ?? 'restaurant',
                shopType: props?.shopType ?? 'restaurant'
              })
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <TextDefault small bolder textColor={ACCENT}>
              {t('SeeAll')}
            </TextDefault>
          </TouchableOpacity>
        </View>
        <HorizontalFlashList
          style={styles().offerScroll}
          estimatedItemSize={260}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: scale(4), ...alignment.PRlarge }}
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderRestaurantItem}
          inverted={!!currentTheme?.isRTL}
        />
      </View>
    </View>
  )
}

export default React.memo(MainRestaurantCard)
