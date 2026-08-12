import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { AntDesign } from '@expo/vector-icons'
import TextDefault from '../Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'

const ACCENT = '#00A8FF'
const MUTED = '#8E8E93'
const CARD = '#2C2C2E'
const PAGE = '#121212'

/** Vertical quantity control: [+] / qty / [- or trash] */
function VerticalQtyStepper({ quantity, onAdd, onRemove }) {
  return (
    <View style={localStyles.stepper}>
      <TouchableOpacity
        activeOpacity={0.75}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={[localStyles.btn, localStyles.plus]}
        onPress={(e) => {
          e?.stopPropagation?.()
          onAdd?.()
        }}
      >
        <AntDesign name='plus' size={scale(14)} color='#FFFFFF' />
      </TouchableOpacity>

      <View style={localStyles.value}>
        <TextDefault bolder textColor='#FFFFFF' style={{ fontSize: scale(13) }}>
          {quantity}
        </TextDefault>
      </View>

      <TouchableOpacity
        activeOpacity={0.75}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={[localStyles.btn, localStyles.minus]}
        onPress={(e) => {
          e?.stopPropagation?.()
          onRemove?.()
        }}
      >
        <AntDesign
          name={quantity < 2 ? 'delete' : 'minus'}
          size={scale(14)}
          color={MUTED}
        />
      </TouchableOpacity>
    </View>
  )
}

const localStyles = {
  stepper: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: scale(999),
    paddingVertical: scale(3),
    paddingHorizontal: scale(3),
    gap: scale(2)
  },
  btn: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    alignItems: 'center',
    justifyContent: 'center'
  },
  plus: {
    backgroundColor: ACCENT
  },
  minus: {
    backgroundColor: PAGE
  },
  value: {
    minWidth: scale(24),
    minHeight: scale(20),
    justifyContent: 'center',
    alignItems: 'center'
  }
}

export default VerticalQtyStepper
