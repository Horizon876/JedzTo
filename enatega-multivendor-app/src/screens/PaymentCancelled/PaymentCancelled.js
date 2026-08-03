import React, { useLayoutEffect } from 'react'
import { View, TouchableOpacity, StatusBar, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'
import styles from './styles'

function PaymentCancelled({ navigation, route }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const reason = route?.params?.reason || 'cancelled'
  const orderId = route?.params?.orderId

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false })
    StatusBar.setBarStyle('light-content')
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#121212')
    }
  }, [navigation])

  const titleKey =
    reason === 'failed' ? 'paymentFailedTitle' : 'paymentCancelledTitle'
  const descKey =
    reason === 'failed' ? 'paymentFailedDesc' : 'paymentCancelledDesc'

  const goHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }]
    })
  }

  const goCart = () => {
    navigation.reset({
      index: 0,
      routes: [
        { name: 'Main' },
        { name: 'Cart' }
      ]
    })
  }

  return (
    <View style={[styles().screen, { paddingTop: insets.top + scale(24), paddingBottom: insets.bottom + scale(24) }]}>
      <View style={styles().content}>
        <View style={styles().iconWrap}>
          <Ionicons name='close-circle' size={scale(72)} color='#FF453A' />
        </View>
        <TextDefault bolder H2 center textColor='#FFFFFF' style={styles().title}>
          {t(titleKey)}
        </TextDefault>
        <TextDefault center textColor='#8E8E93' style={styles().desc}>
          {t(descKey)}
        </TextDefault>
        {orderId ? (
          <TextDefault center smaller textColor='#5B8FB8' style={styles().orderId}>
            {t('paymentOrderRef')}: {orderId}
          </TextDefault>
        ) : null}
      </View>

      <View style={styles().actions}>
        <TouchableOpacity activeOpacity={0.85} style={styles().primaryBtn} onPress={goCart}>
          <TextDefault bolder H5 textColor='#FFFFFF'>
            {t('paymentTryAgain')}
          </TextDefault>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.85} style={styles().secondaryBtn} onPress={goHome}>
          <TextDefault bolder H5 textColor='#00A8FF'>
            {t('backToHome')}
          </TextDefault>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default PaymentCancelled
