import { View, Alert, StatusBar, Platform, Dimensions, KeyboardAvoidingView, Text } from 'react-native'
import styles from './styles'
import RadioComponent from '../../components/CustomizeComponents/RadioComponent/RadioComponent'
import TitleComponent from '../../components/CustomizeComponents/TitleComponent/TitleComponent'
import CartComponent from '../../components/CustomizeComponents/CartComponent/CartComponent'
import HeadingComponent from '../../components/CustomizeComponents/HeadingComponent/HeadingComponent'
import ImageHeader from '../../components/CustomizeComponents/ImageHeader/ImageHeader'
import PersonalizeIngredientsModal from '../../components/CustomizeComponents/PersonalizeIngredientsModal/PersonalizeIngredientsModal'
import Options from './Options'
import { theme } from '../../utils/themeColors'
import analytics from '../../utils/analytics'
import { HeaderBackButton } from '@react-navigation/elements'
import { MaterialIcons } from '@expo/vector-icons'
import navigationService from '../../routes/navigationService'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import UserContext from '../../context/User'
import useNetworkStatus from '../../utils/useNetworkStatus'
import ErrorView from '../../components/ErrorView/ErrorView'

import React, { useState, useContext, useLayoutEffect, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  useAnimatedRef
} from 'react-native-reanimated'
import { scale } from '../../utils/scaling'
import { truncateText } from '../../utils/customFunctions'

const { height } = Dimensions.get('window')
const TOP_BAR_HEIGHT = Math.round(height * 0.08)
const HEADER_MAX_HEIGHT = Math.round(height * 0.26)
const HEADER_MIN_HEIGHT = TOP_BAR_HEIGHT
const SCROLL_RANGE = HEADER_MAX_HEIGHT

function parseRemovedFromInstructions(text = '') {
  const match = String(text).match(/^Bez:\s*(.+?)(?:\.|$)/i)
  if (!match?.[1]) return []
  return match[1]
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function buildSpecialInstructions(removedIngredients = [], notes = '', withoutLabel = 'Bez') {
  const parts = []
  if (removedIngredients.length) {
    parts.push(`${withoutLabel}: ${removedIngredients.join(', ')}`)
  }
  const trimmed = String(notes || '').trim()
  if (trimmed) parts.push(trimmed)
  return parts.join('. ')
}

function ItemDetail(props) {
  const { food, addons, options, restaurant, cartItem: editCartItem } = props?.route?.params

  const ingredients = useMemo(
    () => (Array.isArray(food?.ingredients) ? food.ingredients.filter(Boolean) : []),
    [food?.ingredients]
  )

  const getVariationWithAddons = (variation) => ({
    ...variation,
    addons: variation?.addons?.map((fa) => {
      const addon = addons?.find((a) => a._id === fa)
      const addonOptions = addon?.options?.map((ao) => {
        return options?.find((o) => o._id === ao)
      })
      return {
        ...addon,
        options: addonOptions
      }
    })
  })

  const getSelectedAddons = () => {
    return (
      editCartItem?.addons?.map((addon) => ({
        ...addon,
        options: addon?.options?.map((option) => options?.find((opt) => opt._id === option._id) || option)
      })) || []
    )
  }

  const initialRemoved = editCartItem?.removedIngredients?.length
    ? editCartItem.removedIngredients
    : parseRemovedFromInstructions(editCartItem?.specialInstructions)

  const initialNotes = (() => {
    const raw = editCartItem?.specialInstructions || ''
    if (!initialRemoved.length) return raw
    return raw.replace(/^Bez:\s*.+?(?:\.|$)\s*/i, '').trim()
  })()

  const [specialInstructions, setSpecialInstructions] = useState(initialNotes)
  const [removedIngredients, setRemovedIngredients] = useState(initialRemoved)
  const [personalizeOpen, setPersonalizeOpen] = useState(false)
  const [selectedVariation, setSelectedVariation] = useState(
    getVariationWithAddons(
      food?.variations?.find((variation) => variation._id === editCartItem?.variation?._id) || food?.variations?.[0]
    )
  )
  const [selectedAddons, setSelectedAddons] = useState(getSelectedAddons)

  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const Analytics = analytics()
  const { restaurant: restaurantCart, setCartRestaurant, cart, updateCart, addQuantity, addCartItem } =
    useContext(UserContext)
  const themeContext = useContext(ThemeContext)
  const inset = useSafeAreaInsets()
  const { isConnected: connect } = useNetworkStatus()
  const scrollViewRef = useAnimatedRef()
  const addonRefs = useRef({})
  const scrollY = useSharedValue(0)
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y
    }
  })
  const animatedTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [SCROLL_RANGE - 10, SCROLL_RANGE], [0, 1], Extrapolation.CLAMP)
    return {
      opacity,
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [0, SCROLL_RANGE],
            [HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT, 0],
            Extrapolation.CLAMP
          )
        }
      ]
    }
  })

  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }

  const showSizePicker = (food?.variations?.length || 0) > 1

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#121212')
      }
      StatusBar.setBarStyle('light-content')
    }, [])
  )

  useEffect(() => {
    async function Track() {
      try {
        await Analytics.track(Analytics.events.OPENED_RESTAURANT_ITEM, {
          restaurantID: restaurant,
          foodID: food?._id,
          foodName: food?.title,
          foodRestaurantName: food?.restaurantName
        })
      } catch (error) {
        console.error('Analytics tracking failed:', error)
      }
    }
    Track()
  }, [Analytics, food?._id, food?.restaurantName, food?.title, restaurant])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: null,
      title: truncateText(20, food?.restaurantName || food?.title),
      headerTitleAlign: 'center',
      headerStyle: {
        backgroundColor: '#121212'
      },
      headerTitleStyle: {
        color: '#FFFFFF'
      },
      headerShadowVisible: false,
      headerLeft: () => (
        <HeaderBackButton
          truncatedLabel=''
          backImage={() => (
            <View style={styles(currentTheme).backBtnContainer}>
              <MaterialIcons name='arrow-back' size={25} color='#FFFFFF' />
            </View>
          )}
          onPress={() => {
            navigationService.goBack()
          }}
        />
      )
    })
  }, [navigation, currentTheme, food?.restaurantName, food?.title])

  function scrollToError(addonId, totalAddons) {
    setTimeout(() => {
      if (addonRefs.current[addonId] && scrollViewRef.current && totalAddons > 0) {
        addonRefs.current[addonId].measure((x, y, width, height, pageX, pageY) => {
          scrollViewRef.current.scrollTo({
            y: Math.round(Math.max(0, pageY - HEADER_MAX_HEIGHT)),
            animated: true
          })
        })
      }
    }, 300)
  }

  function validateButton() {
    if (!selectedVariation) return false
    const validatedAddons = []
    selectedVariation?.addons?.forEach((addon) => {
      const selected = selectedAddons?.find((ad) => ad._id === addon._id)
      if (!selected && addon?.quantityMinimum === 0) {
        validatedAddons.push(false)
      } else if (
        selected &&
        selected?.options?.length >= addon?.quantityMinimum &&
        selected?.options?.length <= addon?.quantityMaximum
      ) {
        validatedAddons.push(false)
      } else validatedAddons.push(true)
    })
    return validatedAddons.every((val) => val === false)
  }

  const composedInstructions = () =>
    buildSpecialInstructions(removedIngredients, specialInstructions, t('without') || 'Bez')

  async function onPressAddToCart(quantity) {
    const isValidOrder = validateOrderItem()
    if (isValidOrder) {
      Analytics.track(Analytics.events.ADD_TO_CART, {
        title: food?.title,
        restaurantName: food?.restaurantName,
        variations: food?.variations
      })
      if (!restaurantCart || restaurant === restaurantCart) {
        await addToCart(quantity, restaurant !== restaurantCart)
      } else if (food?.restaurant !== restaurantCart) {
        Alert.alert(
          t('clearCartTitle'),
          t('cartClearWarning'),
          [
            {
              text: t('Cancel'),
              onPress: () => {},
              style: 'cancel'
            },
            {
              text: t('clearCartConfirm'),
              onPress: async () => {
                await addToCart(quantity, true)
              }
            }
          ],
          { cancelable: true }
        )
      }
    }
  }

  const addToCart = async (quantity, clearFlag) => {
    const addonsPayload = selectedAddons.map((addon) => ({
      ...addon,
      options: addon?.options?.map(({ _id }) => ({
        _id
      }))
    }))
    const instructions = composedInstructions()

    const isSameCartItem = (cartItem) => {
      if (cartItem?._id !== food?._id || cartItem?.variation?._id !== selectedVariation?._id) return false
      if ((cartItem?.specialInstructions || '') !== (instructions || '')) return false
      if (cartItem?.addons?.length !== addonsPayload?.length) return false
      return addonsPayload?.every((newAddon) => {
        const cartAddon = cartItem.addons?.find((ad) => ad._id === newAddon._id)
        if (!cartAddon || cartAddon?.options?.length !== newAddon?.options?.length) return false
        return newAddon?.options?.every((newOption) => {
          return cartAddon?.options?.some((op) => op._id === newOption._id)
        })
      })
    }

    if (editCartItem?.key) {
      const nextCart = clearFlag ? [] : cart.filter((cartItem) => cartItem.key !== editCartItem.key)
      const cartItem = {
        ...editCartItem,
        _id: food?._id,
        quantity,
        variation: {
          _id: selectedVariation?._id
        },
        addons: addonsPayload,
        specialInstructions: instructions,
        removedIngredients
      }
      const matchingIndex = nextCart.findIndex(isSameCartItem)

      if (matchingIndex > -1) {
        nextCart[matchingIndex] = {
          ...nextCart[matchingIndex],
          quantity: nextCart[matchingIndex].quantity + quantity
        }
      } else {
        nextCart.push(cartItem)
      }

      await setCartRestaurant(restaurant)
      await updateCart(nextCart)
      navigation.goBack()
      return
    }

    const cartItem = clearFlag ? null : cart.find(isSameCartItem)

    if (!cartItem) {
      await setCartRestaurant(restaurant)
      await addCartItem(
        food?._id,
        selectedVariation?._id,
        quantity,
        addonsPayload,
        clearFlag,
        instructions,
        removedIngredients
      )
    } else {
      await addQuantity(cartItem?.key, quantity)
    }
    navigation.goBack()
  }

  const onSelectVariation = (variation) => {
    if (variation?._id) {
      setSelectedVariation({
        ...getVariationWithAddons(variation)
      })
    }
  }

  async function onSelectOption(addon, option) {
    const index = selectedAddons?.findIndex((ad) => ad._id === addon._id)
    if (index > -1) {
      if (addon?.quantityMinimum === 1 && addon?.quantityMaximum === 1) {
        selectedAddons[index].options = [option]
      } else {
        const optionIndex = selectedAddons[index].options?.findIndex((opt) => opt._id === option._id)
        if (optionIndex > -1) {
          selectedAddons[index].options = selectedAddons[index].options?.filter((opt) => opt._id !== option._id)
        } else {
          selectedAddons[index].options?.push(option)
        }
        if (!selectedAddons[index].options?.length) {
          selectedAddons.splice(index, 1)
        }
      }
    } else {
      selectedAddons.push({ _id: addon._id, options: [option] })
    }
    setSelectedAddons([...selectedAddons])
  }

  const calculatePrice = useCallback(() => {
    const variation = selectedVariation?.price || 0
    let addonTotal = 0
    selectedAddons.forEach((addon) => {
      addonTotal += addon?.options?.reduce((acc, option) => {
        return acc + (option?.price || 0)
      }, 0)
    })
    return (variation + addonTotal).toFixed(2)
  }, [selectedVariation, selectedAddons])

  const calculateDiscountedPrice = useCallback(() => {
    const variation = selectedVariation?.discounted || 0
    let addonTotal = 0
    selectedAddons.forEach((addon) => {
      addonTotal += addon?.options?.reduce((acc, option) => {
        return acc + (option?.price || 0)
      }, 0)
    })
    return (variation + addonTotal).toFixed(2)
  }, [selectedVariation, selectedAddons])

  function validateOrderItem() {
    let hasError = false
    const validatedAddons = selectedVariation?.addons?.map((addon) => {
      const selected = selectedAddons?.find((ad) => ad._id === addon._id)

      if (!selected && addon?.quantityMinimum === 0) {
        addon.error = false
      } else if (
        selected &&
        selected?.options?.length >= addon?.quantityMinimum &&
        selected?.options?.length <= addon?.quantityMaximum
      ) {
        addon.error = false
      } else {
        addon.error = true
        if (!hasError) {
          hasError = true
          scrollToError(addon._id, selectedVariation?.addons?.length)
        }
      }
      return addon
    })
    setSelectedVariation({ ...selectedVariation, addons: validatedAddons })
    return !hasError
  }

  if (!connect) return <ErrorView />

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={[styles().flex, styles(currentTheme).mainContainer]}>
        <Animated.ScrollView
          ref={scrollViewRef}
          onScroll={scrollHandler}
          style={styles(currentTheme).scrollViewStyle}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: scale(24),
            flexGrow: 0
          }}
        >
          <View>
            {food?.image ? <ImageHeader image={food?.image} /> : null}
            <View style={styles(currentTheme).detailsBlock}>
              <HeadingComponent
                title={food?.title}
                price={calculatePrice()}
                discountedPrice={calculateDiscountedPrice()}
              />
              {!!food?.description && (
                <Text style={styles(currentTheme).descriptionText}>{food.description}</Text>
              )}
            </View>
          </View>

          <View style={[styles(currentTheme).subContainer]}>
            <View>
              {showSizePicker ? (
                <View>
                  <TitleComponent title={t('size')} />
                  <RadioComponent
                    options={food?.variations}
                    selected={selectedVariation}
                    onPress={(e) => {
                      onSelectVariation(food?.variations.find((v) => v._id === e._id))
                    }}
                    setSelectedVariation={onSelectVariation}
                    selectedVariation={selectedVariation}
                  />
                </View>
              ) : null}

              {selectedVariation?.addons?.map((addon) => (
                <View key={addon?._id}>
                  <TitleComponent
                    title={addon?.title}
                    subTitle={addon?.description}
                    error={addon.error}
                    status={
                      addon?.quantityMinimum === 0
                        ? t('optional')
                        : `${addon?.quantityMinimum} ${t('Required')}`
                    }
                  />
                  <Options
                    addon={addon}
                    onSelectOption={onSelectOption}
                    addonRefs={addonRefs}
                    selectedAddons={selectedAddons}
                  />
                </View>
              ))}
            </View>

          </View>
        </Animated.ScrollView>

        <Animated.View
          pointerEvents='none'
          style={[
            styles(currentTheme).titleContainer,
            { opacity: 1, height: 35, marginTop: -12, zIndex: 9, padding: 2 },
            animatedTitleStyle
          ]}
        >
          <HeadingComponent title={food?.title} price={calculatePrice()} />
        </Animated.View>
        <View style={{ backgroundColor: '#1C1C1E', zIndex: 10 }}>
          <CartComponent
            onPress={onPressAddToCart}
            disabled={!validateButton()}
            quantity={editCartItem?.quantity}
            showPersonalize={ingredients.length > 0}
            onPersonalize={() => setPersonalizeOpen(true)}
            personalizeSummary={
              removedIngredients.length
                ? `${t('without')}: ${removedIngredients.join(', ')}`
                : ''
            }
          />
        </View>
        <View
          style={{
            paddingBottom: inset.bottom,
            backgroundColor: '#1C1C1E'
          }}
        />
        {ingredients.length ? (
          <PersonalizeIngredientsModal
            visible={personalizeOpen}
            onClose={() => setPersonalizeOpen(false)}
            onSave={setRemovedIngredients}
            ingredients={ingredients}
            removed={removedIngredients}
          />
        ) : null}
      </View>
    </KeyboardAvoidingView>
  )
}

export default ItemDetail
