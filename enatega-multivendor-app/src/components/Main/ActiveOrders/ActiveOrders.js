import React, { useContext, useState, useEffect, useRef } from 'react'
import { View, TouchableOpacity, Dimensions, StyleSheet, Animated } from 'react-native'
import ConfigurationContext from '../../../context/Configuration'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import { scale } from '../../../utils/scaling'
import { useNavigation } from '@react-navigation/native'
import TextError from '../../Text/TextError/TextError'
import OrdersContext from '../../../context/Orders'
import Spinner from '../../Spinner/Spinner'
import { useTranslation } from 'react-i18next'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { Modalize } from 'react-native-modalize'
import { ProgressBar, checkStatus } from './ProgressBar'
import styles from './styles'
import { ORDER_STATUS_ENUM } from '../../../utils/enums'
import { getOrderEtaClockLabel } from '../../../utils/orderEtaClock'
import { MaterialIcons } from '@expo/vector-icons'

const SCREEN_HEIGHT = Dimensions.get('screen').height
const MODAL_HEIGHT = Math.floor(SCREEN_HEIGHT / 4)
const MINIMIZED_HEIGHT = scale(60)

const orderStatusActive = ['PENDING', 'PICKED', 'ACCEPTED', 'ASSIGNED']

const ActiveOrders = ({ onActiveOrdersChange }) => {
  const { t, i18n } = useTranslation()
  const { loadingOrders, errorOrders, orders } = useContext(OrdersContext)
  const configuration = useContext(ConfigurationContext)
  const navigation = useNavigation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }

  const activeOrders = orders.filter(
    (o) =>
      orderStatusActive.includes(o.orderStatus) &&
      (o?.paymentStatus === 'PAID' || o?.paymentMethod == 'COD')
  )

  const onPressDetails = (order) => {
    navigation.navigate('OrderDetail', {
      _id: order._id,
      order: order,
      currencySymbol: configuration.currencySymbol
    })
  }

  const [showAll, setShowAll] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [justPlacedOrder, setJustPlacedOrder] = useState(false)
  const [showPulse, setShowPulse] = useState(false)
  const modalizeRef = useRef(null)
  const pulseAnim = useRef(new Animated.Value(1)).current

  const displayOrders = showAll ? activeOrders : activeOrders.slice(0, 2)

  useEffect(() => {
    const hasActiveOrders = displayOrders.length > 0
    onActiveOrdersChange(hasActiveOrders)
    
    // Reset states when no active orders
    if (!hasActiveOrders) {
      setIsMinimized(false)
      setJustPlacedOrder(false)
      return
    }
    
    // Auto-minimize after 3 seconds when a new order is detected
    if (hasActiveOrders && !justPlacedOrder) {
      setJustPlacedOrder(true)
      const timer = setTimeout(() => {
        setIsMinimized(true)
        setShowPulse(true)
        
        // Start pulse animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 3 }
        ).start()
        
        const pulseTimer = setTimeout(() => {
          setShowPulse(false)
        }, 5000)
        return () => clearTimeout(pulseTimer)
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [displayOrders, onActiveOrdersChange, justPlacedOrder])

  const handleMinimize = () => {
    setIsMinimized(true)
  }

  const handleExpand = () => {
    setIsMinimized(false)
  }

  if (loadingOrders) return null
  if (errorOrders && !orders) return <TextError text={errorOrders.message} />
  if (!displayOrders.length) return null
  const order = displayOrders[0]

  const outForDelivery = ['ASSIGNED', 'PICKED'].includes(order?.orderStatus)
  const etaClock = getOrderEtaClockLabel(order, { outForDelivery })
  const modalStyle = {
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: currentTheme.cardBackground
  }

  // Render minimized tab
  if (isMinimized) {
    return (
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: scale(20),
            [currentTheme.isRTL ? 'left' : 'right']: scale(20),
            zIndex: 1000,
            transform: [{ scale: showPulse ? pulseAnim : 1 }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles(currentTheme).minimizedTab}
          onPress={handleExpand}
          activeOpacity={0.8}
        >
          <View style={styles(currentTheme).minimizedContent}>
            <MaterialIcons 
              name="delivery-dining" 
              size={scale(20)} 
              color={currentTheme.white} 
            />
            <TextDefault 
              textColor={currentTheme.white} 
              H5 
              bold 
              style={{ marginLeft: scale(8) }}
            >
              {t('orderTracking')}
            </TextDefault>
            <View style={styles(currentTheme).minimizedBadge}>
              <TextDefault 
                textColor={currentTheme.white} 
                H6 
                bold
              >
                {etaClock || t('deliveringSoon')}
              </TextDefault>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  return (
    <Modalize
      ref={modalizeRef}
      alwaysOpen={MODAL_HEIGHT}
      withHandle={false}
      modalHeight={MODAL_HEIGHT}
      modalStyle={modalStyle}
    >
      <View style={{ marginTop: scale(20), marginHorizontal: scale(10) }}>
        <View
          style={{
            justifyContent: 'space-between',
            flexDirection: currentTheme?.isRTL ? 'row-reverse' : 'row',
            alignItems: 'center'
          }}
        >
          <TextDefault Regular textColor={currentTheme.fontGrayNew}>
            {t('estimatedDeliveryTime')}
          </TextDefault>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={handleMinimize}
              style={{ marginRight: scale(15) }}
            >
              <MaterialIcons 
                name="keyboard-arrow-down" 
                size={scale(20)} 
                color={currentTheme.gray700} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onPressDetails(order)}>
              <TextDefault textColor={currentTheme.gray700} bolder>
                {t('details')}
              </TextDefault>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ marginTop: scale(10) }}>
          <TextDefault Regular textColor={currentTheme.gray900} H1 bolder isRTL>
            {etaClock || t('deliveringSoon')}
          </TextDefault>
        </View>
        <View>
          <ProgressBar
            configuration={configuration}
            currentTheme={currentTheme}
            item={order}
            navigation={navigation}
            isPicked={order?.isPickedUp}
          />
          <View style={{ marginTop: scale(10) }}>
            <TextDefault
              numberOfLines={2}
              style={styles(currentTheme).statusText}
              isRTL
            >
              {t(checkStatus(order.orderStatus).statusText)}
            </TextDefault>
          </View>
        </View>
      </View>
    </Modalize>
  )
}

export default ActiveOrders
