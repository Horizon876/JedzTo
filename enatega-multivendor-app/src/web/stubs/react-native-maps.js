/**
 * Web stub for react-native-maps — native MapView is unavailable in browsers.
 * Renders a simple placeholder so screens that import MapView still mount.
 */
import React, { forwardRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'

export const PROVIDER_DEFAULT = 'default'
export const PROVIDER_GOOGLE = 'google'

export const Marker = ({ children, ...rest }) => (
  <View {...rest} collapsable={false}>
    {children}
  </View>
)

export const Callout = ({ children, ...rest }) => (
  <View {...rest}>{children}</View>
)

export const Circle = () => null
export const Polygon = () => null
export const Polyline = () => null
export const Overlay = () => null
export const UrlTile = () => null
export const LocalTile = () => null
export const Heatmap = () => null

const MapView = forwardRef(function MapView(
  { style, children, initialRegion, region, ...rest },
  ref
) {
  const center = region || initialRegion
  const label = center
    ? `${Number(center.latitude || 0).toFixed(4)}, ${Number(center.longitude || 0).toFixed(4)}`
    : 'Mapa'

  return (
    <View ref={ref} style={[styles.map, style]} {...rest}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>Mapa (wersja web — podgląd lokalizacji)</Text>
      {children}
    </View>
  )
})

const styles = StyleSheet.create({
  map: {
    backgroundColor: '#E8EEF5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 180
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280'
  }
})

export default MapView
