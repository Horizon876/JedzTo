import React from 'react'
import { View, StyleSheet } from 'react-native'
import CustomMarker from '../../assets/SVG/imageComponents/CustomMarker'
import { scale } from '../../utils/scaling'
import { JEDZ_COLOR, TO_COLOR } from '../Logo/Logo'

// Fills the empty middle of the address-selection screen with a soft,
// brand-colored "radar" backdrop behind the map pin — purely decorative,
// centered via the parent's flex layout (see CurrentLocation styles.js).
export default function LocationHero() {
  return (
    <View style={styles.container}>
      <View style={styles.outerRing}>
        <View style={styles.innerRing}>
          <CustomMarker width={scale(46)} height={scale(46)} />
        </View>
      </View>
    </View>
  )
}

const RING_SIZE = scale(180)
const INNER_SIZE = scale(120)

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  outerRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: `${JEDZ_COLOR}14`,
    alignItems: 'center',
    justifyContent: 'center'
  },
  innerRing: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_SIZE / 2,
    backgroundColor: `${TO_COLOR}1F`,
    alignItems: 'center',
    justifyContent: 'center'
  }
})
