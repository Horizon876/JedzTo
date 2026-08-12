import React, { useContext, useEffect, useState } from 'react'
import {
  Modal,
  View,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import TextDefault from '../../Text/TextDefault/TextDefault'
import IngredientRemove from '../IngredientRemove/IngredientRemove'
import { scale } from '../../../utils/scaling'

const ACCENT = '#00A8FF'
const MUTED = '#8E8E93'
const DANGER = '#FF453A'
const SCREEN_HEIGHT = Dimensions.get('window').height
const DISMISS_DISTANCE = scale(100)
const DISMISS_VELOCITY = 800

function PersonalizeIngredientsModal({
  visible,
  onClose,
  onSave,
  ingredients = [],
  removed = []
}) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }
  const [draftRemoved, setDraftRemoved] = useState(removed)
  const translateY = useSharedValue(SCREEN_HEIGHT)

  useEffect(() => {
    if (!visible) {
      translateY.value = SCREEN_HEIGHT
      return
    }
    setDraftRemoved(removed)
    translateY.value = SCREEN_HEIGHT
    translateY.value = withTiming(0, { duration: 400 })
    // Only animate open when the modal becomes visible — not when `removed` updates on save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, translateY])

  useEffect(() => {
    if (visible) setDraftRemoved(removed)
  }, [visible, removed])

  const dismiss = () => {
    onClose?.()
  }

  const animateClose = () => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 220 }, (finished) => {
      if (finished) runOnJS(dismiss)()
    })
  }

  const onToggle = (ingredient) => {
    setDraftRemoved((prev) =>
      prev.includes(ingredient) ? prev.filter((item) => item !== ingredient) : [...prev, ingredient]
    )
  }

  const handleSave = () => {
    onSave?.(draftRemoved)
    animateClose()
  }

  const panGesture = Gesture.Pan()
    .activeOffsetY(6)
    .failOffsetX([-28, 28])
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY)
    })
    .onEnd((event) => {
      const shouldDismiss =
        event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY
      if (shouldDismiss) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, (finished) => {
          if (finished) runOnJS(dismiss)()
        })
      } else {
        translateY.value = withTiming(0, { duration: 180 })
      }
    })

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }))

  return (
    <Modal
      visible={visible}
      animationType='none'
      transparent
      onRequestClose={animateClose}
    >
      <View style={sheetStyles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        <Animated.View
          style={[
            sheetStyles.sheet,
            { paddingBottom: Math.max(insets.bottom, scale(16)) },
            sheetAnimatedStyle
          ]}
        >
          <GestureDetector gesture={panGesture}>
            <Animated.View>
              <View style={sheetStyles.handleHit}>
                <View style={sheetStyles.handle} />
              </View>
              <View
                style={[
                  sheetStyles.header,
                  { flexDirection: currentTheme.isRTL ? 'row-reverse' : 'row' }
                ]}
              >
                <View style={sheetStyles.headerText}>
                  <TextDefault H4 bolder textColor='#FFFFFF'>
                    {t('personalize')}
                  </TextDefault>
                  <TextDefault small textColor={MUTED} style={sheetStyles.hint}>
                    {t('removeIngredientsHint')}
                  </TextDefault>
                </View>
                <TouchableOpacity
                  onPress={animateClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={sheetStyles.cancelBtn}
                  accessibilityRole='button'
                  accessibilityLabel={t('Cancel')}
                >
                  <TextDefault bolder textColor={DANGER}>
                    {t('Cancel')}
                  </TextDefault>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </GestureDetector>

          <ScrollView
            style={sheetStyles.listScroll}
            contentContainerStyle={sheetStyles.listContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
          >
            <IngredientRemove
              ingredients={ingredients}
              removed={draftRemoved}
              onToggle={onToggle}
            />
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            style={sheetStyles.doneBtn}
          >
            <TextDefault H5 bolder textColor='#FFFFFF' center>
              {t('save')}
            </TextDefault>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  )
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: scale(22),
    borderTopRightRadius: scale(22),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#48484A',
    paddingTop: scale(4),
    paddingHorizontal: scale(16),
    maxHeight: '78%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 24
  },
  handleHit: {
    alignItems: 'center',
    paddingVertical: scale(10)
  },
  handle: {
    width: scale(44),
    height: scale(5),
    borderRadius: scale(3),
    backgroundColor: '#636366'
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(12),
    gap: scale(12)
  },
  headerText: {
    flex: 1,
    paddingStart: scale(12)
  },
  hint: {
    marginTop: scale(4)
  },
  cancelBtn: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(4),
    alignItems: 'center',
    justifyContent: 'center'
  },
  listScroll: {
    flexGrow: 0
  },
  listContent: {
    paddingBottom: scale(8)
  },
  doneBtn: {
    marginTop: scale(12),
    backgroundColor: ACCENT,
    borderRadius: scale(14),
    paddingVertical: scale(14),
    alignItems: 'center'
  }
})

export default PersonalizeIngredientsModal
