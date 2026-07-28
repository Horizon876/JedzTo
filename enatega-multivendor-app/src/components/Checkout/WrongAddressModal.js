import React from 'react'
import { View, Modal, Pressable } from 'react-native'
import TextDefault from '../Text/TextDefault/TextDefault'
import Button from '../Button/Button'
import { useStyles } from './styles'
import { alignment } from '../../utils/alignment'
import { useTranslation } from 'react-i18next'

export const WrongAddressModal = ({
  theme,
  modalVisible,
  setModalVisible,
  handleNavigation
}) => {
  const { t } = useTranslation()
  const styles = useStyles(theme)

  return (
    <Modal animationType='fade' visible={modalVisible} transparent>
      <Pressable style={styles.backdrop} onPress={setModalVisible}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={{ ...alignment.MBsmall }}>
            <TextDefault H4 bolder textColor='#FFFFFF'>
              {t("Can't deliver to this address")}
            </TextDefault>
          </View>
          <View style={{ ...alignment.MBmedium }}>
            <TextDefault H5 textColor='#8E8E93'>
              {t('This restaurant doesn’t deliver to your location. Please explore restaurants available in your delivery area')}
              .
            </TextDefault>
          </View>

          <View style={{ alignItems: 'stretch', gap: 10 }}>
            <Button
              text={t('Select another one')}
              buttonProps={{ onPress: handleNavigation }}
              buttonStyles={styles.navigateButtonContainer}
              textStyles={{ ...alignment.Pmedium, color: '#FFFFFF' }}
            />
            <Button
              text={t('close')}
              buttonProps={{ onPress: setModalVisible }}
              buttonStyles={styles.dismissButtonContainer}
              textStyles={{ ...alignment.Pmedium, color: '#FFFFFF' }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
