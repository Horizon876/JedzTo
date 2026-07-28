import React, { memo, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import TextDefault from '../../Text/TextDefault/TextDefault'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import { scale } from '../../../utils/scaling'
import styles from './styles'
import { resolveLogoImage } from '../../../utils/resolveImageUrl'

const CATEGORY_RAIL_HEIGHT = scale(48)
const CATEGORY_ACCENT = '#00A8FF'
const CATEGORY_MUTED = '#8E8E93'

function normalizeCategories({ categories = [], topBarData = [], updatedDeals = [] }) {
  if (categories.length > 0) return categories

  const source = Array.isArray(updatedDeals) && updatedDeals.length > 0 ? updatedDeals : topBarData
  return (source ?? []).map((section, index) => ({
    key: `category-${section?.index ?? index}`,
    title: section?.title,
    categoryIndex: section?.index ?? index
  }))
}

function CategoryTabsBase({ categories, activeCategoryIndex, onPressCategory, currentTheme, t }) {
  const categoryListRef = useRef(null)
  const categoryLayoutsRef = useRef(new Map())
  const categoryContentWidthRef = useRef(0)
  const [categoryListWidth, setCategoryListWidth] = useState(0)
  const [layoutVersion, setLayoutVersion] = useState(0)

  useEffect(() => {
    if (!categoryListRef.current || categoryListWidth === 0) return
    const activeLayout = categoryLayoutsRef.current.get(activeCategoryIndex)
    if (!activeLayout) return

    const maxOffset = Math.max(0, categoryContentWidthRef.current - categoryListWidth)
    const centeredOffset = activeLayout.x + activeLayout.width / 2 - categoryListWidth / 2
    const offset = Math.min(Math.max(0, centeredOffset), maxOffset)

    categoryListRef.current.scrollTo({
      animated: false,
      x: offset,
      y: 0
    })
  }, [activeCategoryIndex, categoryListWidth, layoutVersion])

  if (!categories.length) return null

  return (
    <View
      style={styles(currentTheme).categoriesContainer}
      onLayout={(event) => {
        setCategoryListWidth(event.nativeEvent.layout.width)
      }}
    >
      <ScrollView
        ref={categoryListRef}
        horizontal
        inverted={currentTheme.isRTL}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles(currentTheme).categoriesContent}
        keyboardShouldPersistTaps='handled'
        onContentSizeChange={(width) => {
          categoryContentWidthRef.current = width
          setLayoutVersion((value) => value + 1)
        }}
      >
        {categories.map((item) => {
          const isActive = item.categoryIndex === activeCategoryIndex

          return (
            <View
              key={item.key}
              onLayout={(event) => {
                categoryLayoutsRef.current.set(item.categoryIndex, event.nativeEvent.layout)
                setLayoutVersion((value) => value + 1)
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onPressCategory(item.categoryIndex)}
                style={styles(currentTheme).headerContainer}
              >
                <TextDefault
                  style={isActive ? styles().categoryTabTextActive : styles().categoryTabText}
                  textColor={isActive ? CATEGORY_ACCENT : CATEGORY_MUTED}
                  bolder={isActive}
                  center
                >
                  {t(item.title)}
                </TextDefault>
              </TouchableOpacity>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

function resolveAboutObject({ aboutObject, restaurant, restaurantId, restaurantName, restaurantImage, minimumOrder, tax }) {
  if (aboutObject) return aboutObject

  return {
    latitude: restaurant ? restaurant.location?.coordinates?.[1] : '',
    longitude: restaurant ? restaurant.location?.coordinates?.[0] : '',
    address: restaurant ? restaurant.address : '',
    restaurantId,
    restaurantName,
    restaurantImage,
    restaurantLogo: resolveLogoImage(restaurant),
    restaurantCuisines: restaurant ? restaurant.cuisines : [],
    restaurantTax: tax,
    restaurantMinOrder: minimumOrder,
    deliveryTime: restaurant ? restaurant.deliveryTime : '...',
    minimumOrder: restaurant ? restaurant.minimumOrder : '...',
    average: restaurant ? restaurant?.reviewData?.ratings : '...',
    total: restaurant ? restaurant?.reviewData?.total : '...',
    reviews: restaurant ? restaurant?.reviewData?.reviews : '...',
    isAvailable: restaurant ? restaurant?.isAvailable : true,
    openingTimes: restaurant ? restaurant?.openingTimes : [],
    phone: restaurant ? restaurant?.phone : '',
    restaurantUrl: restaurant ? restaurant?.restaurantUrl : '',
    IsOpen: true,
    reviewsCount: restaurant ? restaurant?.reviewCount : '...',
    _id: restaurantId
  }
}

function HeaderContent({
  aboutObject,
  categories,
  activeCategoryIndex,
  onPressCategory,
  insetTop,
  showCategories = true
}) {
  const navigation = useNavigation()
  const { t, i18n } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = useMemo(
    () => ({
      isRTL: i18n.dir() === 'rtl',
      ...theme[themeContext.ThemeValue]
    }),
    [i18n, themeContext.ThemeValue]
  )

  const topBarHeight = insetTop + scale(52)
  const headerHeight = topBarHeight + (showCategories && categories.length > 0 ? CATEGORY_RAIL_HEIGHT : 0)

  return (
    <View style={[styles(currentTheme).container, { height: headerHeight, backgroundColor: currentTheme.themeBackground, borderBottomColor: currentTheme.newBorderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={[styles(currentTheme).topRow, { paddingTop: insetTop }]}>
        <View style={styles(currentTheme).leadingArea}>
          <TouchableOpacity activeOpacity={0.7} style={styles(currentTheme).touchArea} onPress={() => navigation.goBack()}>
            <Ionicons name='arrow-back' color={currentTheme.newIconColor} size={scale(22)} />
          </TouchableOpacity>
        </View>

        <View style={styles(currentTheme).centerArea} />

        <View style={styles(currentTheme).trailingArea}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles(currentTheme).touchArea}
            onPress={() => {
              navigation.navigate('About', {
                restaurantObject: { ...aboutObject },
                tab: false
              })
            }}
          >
            <SimpleLineIcons name='info' size={scale(17)} color={currentTheme.newIconColor} />
          </TouchableOpacity>
        </View>
      </View>

      {showCategories && <CategoryTabsBase categories={categories} activeCategoryIndex={activeCategoryIndex} onPressCategory={onPressCategory} currentTheme={currentTheme} t={t} />}
    </View>
  )
}

function ImageHeader(props) {
  const resolvedAboutObject = resolveAboutObject(props)
  const resolvedCategories = normalizeCategories(props)
  const insetTop = props.insetTop ?? props.topInset ?? 0

  return (
    <HeaderContent
      aboutObject={resolvedAboutObject}
      categories={resolvedCategories}
      activeCategoryIndex={props.activeCategoryIndex ?? 0}
      onPressCategory={props.onPressCategory ?? (() => {})}
      insetTop={insetTop}
      showCategories={props.showCategories ?? true}
    />
  )
}

export const CategoryTabsRow = memo(function CategoryTabsRow({ categories, activeCategoryIndex, onPressCategory }) {
  const { t, i18n } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = useMemo(
    () => ({
      isRTL: i18n.dir() === 'rtl',
      ...theme[themeContext.ThemeValue]
    }),
    [i18n, themeContext.ThemeValue]
  )

  return (
    <View style={{ backgroundColor: '#222222', zIndex: 20, elevation: 4 }}>
      <CategoryTabsBase
        categories={categories}
        activeCategoryIndex={activeCategoryIndex}
        onPressCategory={onPressCategory}
        currentTheme={currentTheme}
        t={t}
      />
    </View>
  )
})

export default memo(ImageHeader)
