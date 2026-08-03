import { StyleSheet, Dimensions } from 'react-native'
import { scale } from '../../../utils/scaling'

const SURFACE = '#1C1C1E'
const HAIRLINE = '#2C2C2E'
const MUTED = '#8E8E93'
const ACCENT = '#00A8FF'
const { width: WIDTH } = Dimensions.get('window')

export default StyleSheet.create({
  container: () => ({
    width: '100%',
    marginTop: 0
  }),
  header: {
    marginTop: 0,
    paddingHorizontal: scale(14),
    paddingTop: scale(12),
    paddingBottom: scale(12),
    backgroundColor: SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HAIRLINE
  },
  restaurantName: {
    color: MUTED,
    fontSize: scale(12),
    marginBottom: scale(2)
  },
  orderNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6)
  },
  orderLabel: {
    color: '#FFFFFF',
    fontSize: scale(13),
    marginTop: 0,
    marginBottom: 0
  },
  orderNo: {
    color: ACCENT,
    fontSize: scale(13)
  },
  addressText: {
    color: MUTED,
    fontSize: scale(13),
    marginTop: scale(6),
    lineHeight: scale(18)
  },
  chatButton: (theme) => ({
    paddingVertical: scale(14),
    paddingHorizontal: scale(14),
    backgroundColor: SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HAIRLINE,
    flexDirection: theme?.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: scale(8)
  }),
  itemsContainer: {
    width: '100%',
    marginTop: 0
  },
  itemsHeader: {
    paddingHorizontal: scale(14),
    paddingTop: scale(10),
    paddingBottom: scale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HAIRLINE
  },
  itemsHeaderTitle: {
    color: '#FFFFFF',
    fontSize: scale(13),
    marginTop: 0,
    marginBottom: 0
  },
  itemRow: (theme) => ({
    width: '100%',
    flexDirection: theme?.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    backgroundColor: SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HAIRLINE
  }),
  itemRowLast: {
    borderBottomWidth: 0
  },
  itemImage: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(12),
    backgroundColor: HAIRLINE
  },
  itemMeta: {
    flex: 1,
    minWidth: 0,
    gap: scale(3)
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: scale(15)
  },
  itemSub: {
    color: MUTED,
    fontSize: scale(12)
  },
  itemPrice: {
    color: '#FFFFFF'
  },
  qtyBadge: {
    minWidth: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(8)
  },
  chatIcon: (theme) => ({
    flex: 0,
    alignItems: theme?.isRTL ? 'flex-start' : 'flex-end',
    justifyContent: 'center'
  })
})

export { SURFACE, HAIRLINE, MUTED, ACCENT, WIDTH }
