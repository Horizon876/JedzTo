import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

const SURFACE = '#1C1C1E'
const HAIRLINE = '#2C2C2E'
const ACCENT = '#00A8FF'

export default StyleSheet.create({
  cancelButtonContainer: () => ({
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF453A',
    borderRadius: scale(999),
    width: '100%',
    height: scale(48)
  }),
  dismissButtonContainer: () => ({
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: scale(999),
    width: '100%',
    height: scale(48),
    borderColor: HAIRLINE,
    backgroundColor: 'transparent'
  }),
  modalContainer: () => ({
    margin: scale(16),
    backgroundColor: SURFACE,
    borderRadius: scale(20),
    padding: scale(22),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    width: '90%',
    alignSelf: 'center'
  }),
  container: () => ({
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)'
  })
})
