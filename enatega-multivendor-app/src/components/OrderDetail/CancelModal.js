import React, { useState, useEffect } from 'react'
import { View, Modal, Pressable } from 'react-native'
import TextDefault from '../Text/TextDefault/TextDefault'
import Button from '../Button/Button'
import styles from './styles'
import { alignment } from '../../utils/alignment'
import { ORDER_STATUS_ENUM } from '../../utils/enums'
import { useTranslation } from 'react-i18next'
import Spinner from '../Spinner/Spinner'
import { scale } from '../../utils/scaling'

export const CancelModal = ({ theme, modalVisible, setModalVisible, cancelOrder, loading, orderStatus }) => {
  const { t } = useTranslation()
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    if (orderStatus === ORDER_STATUS_ENUM.CANCELLED) {
      setIsCancelling(false)
    }
  }, [orderStatus])

  const handleCancelOrder = async () => {
    setIsCancelling(true)
    await cancelOrder()
    setIsCancelling(false)
  }

  return (
    <Modal animationType='fade' visible={modalVisible} transparent>
      <Pressable style={styles.container()} onPress={setModalVisible}>
        <Pressable style={styles.modalContainer()} onPress={(e) => e.stopPropagation()}>
          {orderStatus === ORDER_STATUS_ENUM.CANCELLED ? (
            <>
              <View style={{ ...alignment.MBsmall }}>
                <TextDefault H4 bolder textColor='#FFFFFF'>
                  {t('yourOrderCancelled')}
                </TextDefault>
              </View>
              <View>
                <TextDefault H5 textColor='#8E8E93'>
                  {t('anyQuestions')}
                </TextDefault>
              </View>
            </>
          ) : (
            <>
              <View style={{ ...alignment.MBsmall }}>
                <TextDefault H4 bolder textColor='#FFFFFF'>
                  {t('cancelOrder')}
                </TextDefault>
              </View>
              <View>
                <TextDefault H5 textColor='#8E8E93'>
                  {t('cancelAnyway')}
                </TextDefault>
              </View>
              {isCancelling ? (
                <View style={{ height: scale(20), marginTop: scale(15) }}>
                  <Spinner spinnerColor='#00A8FF' backColor='transparent' size='small' />
                </View>
              ) : (
                <View style={{ alignItems: 'stretch', gap: scale(10), marginTop: scale(18) }}>
                  <Button
                    text={t('cancelOrder')}
                    buttonProps={{ onPress: handleCancelOrder, disabled: isCancelling }}
                    buttonStyles={styles.cancelButtonContainer()}
                    textProps={{ textColor: '#FFFFFF' }}
                    textStyles={{ ...alignment.Pmedium }}
                  />
                  <Button
                    text={t('waitForOrder')}
                    buttonProps={{ onPress: setModalVisible }}
                    buttonStyles={styles.dismissButtonContainer()}
                    textStyles={{ ...alignment.Pmedium, color: '#FFFFFF' }}
                  />
                </View>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
