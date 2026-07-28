import React, { useMemo } from 'react'
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TextDefault from '../Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'

const ACCENT = '#00A8FF'
const BG = '#121212'
const SURFACE = '#1C1C1E'
const MUTED = '#8E8E93'
const MAX_LENGTH = 230

export const InstructionsModal = ({ isVisible, hideModal, onSubmit, value, setValue, t }) => {
  const insets = useSafeAreaInsets()
  const length = useMemo(() => String(value || '').length, [value])

  return (
    <Modal visible={isVisible} animationType='slide' presentationStyle='fullScreen'>
      <View style={[styles.screen, { paddingTop: insets.top + scale(4) }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={hideModal}
              style={styles.backButton}
              accessibilityRole='button'
              accessibilityLabel={t('cancel')}
            >
              <Ionicons name='arrow-back' size={scale(20)} color='#FFFFFF' />
            </TouchableOpacity>
            <TextDefault H4 bolder textColor='#FFFFFF' style={styles.headerTitle} numberOfLines={1}>
              {t('addMessage')}
            </TextDefault>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, scale(16)) + scale(12) }]}
            keyboardShouldPersistTaps='handled'
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              value={value}
              onChangeText={setValue}
              autoFocus
              multiline
              placeholderTextColor={MUTED}
              placeholder={t('typeHere')}
              style={styles.textInput}
              maxLength={MAX_LENGTH}
              textAlignVertical='top'
            />

            <TextDefault textColor={MUTED} small style={styles.counter}>
              {length}/{MAX_LENGTH}
            </TextDefault>

            <TouchableOpacity activeOpacity={0.85} onPress={onSubmit} style={styles.primaryButton}>
              <TextDefault bolder textColor='#FFFFFF' center H5>
                {t('Done')}
              </TextDefault>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  screen: {
    flex: 1,
    backgroundColor: BG
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(14),
    paddingBottom: scale(10),
    minHeight: scale(48)
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerSpacer: {
    width: scale(40),
    height: scale(40)
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: scale(8)
  },
  content: {
    paddingHorizontal: scale(16),
    paddingTop: scale(8)
  },
  textInput: {
    minHeight: scale(220),
    height: scale(240),
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: scale(14),
    paddingHorizontal: scale(14),
    paddingVertical: scale(14),
    fontSize: scale(16),
    lineHeight: scale(22),
    color: '#FFFFFF',
    backgroundColor: SURFACE
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: scale(8)
  },
  primaryButton: {
    marginTop: scale(16),
    backgroundColor: ACCENT,
    height: scale(50),
    borderRadius: scale(999),
    alignItems: 'center',
    justifyContent: 'center'
  }
})
