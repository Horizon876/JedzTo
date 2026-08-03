import { StyleSheet } from 'react-native'
import { alignment } from '../../utils/alignment'
import { scale } from '../../utils/scaling'

const ACCENT = '#00A8FF'
const BG = '#1C1C1E'
const SURFACE = '#2C2C2E'
const MUTED = '#8E8E93'

const styles = (props = null) =>
  StyleSheet.create({
    flex: {
      flex: 1,
      flexDirection: 'row',
      alignSelf: 'flex-start'
    },
    textBtn: {
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'flex-end',
      ...alignment.PBsmall
    },
    fullScreen: {
      flex: 1,
      backgroundColor: BG
    },
    content: {
      flex: 1,
      backgroundColor: BG
    },
    topSurface: {
      backgroundColor: BG,
      paddingHorizontal: scale(16),
      paddingBottom: scale(4)
    },
    listArea: {
      flex: 1,
      paddingHorizontal: scale(16),
      paddingTop: scale(0),
      backgroundColor: BG
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(12),
      marginBottom: scale(8)
    },
    searchPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      height: scale(48),
      borderRadius: scale(24),
      backgroundColor: SURFACE,
      paddingHorizontal: scale(14),
      gap: scale(10)
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      height: scale(48),
      paddingVertical: 0,
      textAlignVertical: 'center',
      fontSize: scale(15),
      color: '#FFFFFF'
    },
    cancelButton: {
      paddingVertical: scale(8),
      paddingHorizontal: scale(2)
    },
    cancelText: {
      color: ACCENT,
      fontSize: scale(16)
    },
    sectionTitle: {
      marginBottom: scale(4),
      paddingHorizontal: scale(2)
    },
    list: {
      flex: 1
    },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderRadius: 0,
      paddingVertical: scale(14),
      paddingHorizontal: scale(2),
      marginBottom: 0,
      gap: scale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#2C2C2E'
    },
    historyIcon: {
      width: scale(28),
      height: scale(28),
      borderRadius: scale(14),
      alignItems: 'center',
      justifyContent: 'center'
    },
    historyText: {
      flex: 1
    },
    removeButton: {
      padding: scale(4)
    },
    predictionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderRadius: 0,
      paddingVertical: scale(14),
      paddingHorizontal: scale(2),
      marginBottom: 0,
      gap: scale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#2C2C2E'
    },
    predictionDivider: {
      height: 0
    },
    locationIcon: {
      width: scale(28),
      height: scale(28),
      borderRadius: scale(14),
      justifyContent: 'center',
      alignItems: 'center'
    },
    emptyHistory: {
      width: '100%',
      paddingTop: scale(8),
      paddingHorizontal: scale(2),
      flexDirection: 'row',
      alignItems: 'center'
    },
    emptyHistoryText: {
      flex: 1,
      marginLeft: scale(12),
      fontSize: scale(14),
      lineHeight: scale(18),
      color: MUTED
    },
    emptyState: {
      paddingVertical: scale(28),
      alignItems: 'center'
    },
    errorState: {
      paddingVertical: scale(20),
      alignItems: 'center'
    },
    modalContainer: {
      flex: 1,
      backgroundColor: BG,
      ...alignment.PTmedium,
      ...alignment.PRlarge,
      ...alignment.PLlarge
    },
    dismissOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    },
    searchInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: scale(48),
      borderRadius: scale(24),
      backgroundColor: SURFACE,
      paddingHorizontal: scale(14),
      gap: scale(8)
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: scale(12)
    },
    historySection: {
      marginTop: scale(8)
    },
    historySectionTitle: {
      marginBottom: scale(10)
    },
    muted: {
      color: MUTED
    },
    accent: {
      color: ACCENT
    }
  })

export default styles
