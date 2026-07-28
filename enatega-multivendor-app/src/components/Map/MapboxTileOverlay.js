import React from 'react'
import { UrlTile } from 'react-native-maps'
import useEnvVars from '../../../environment'

// Renders Mapbox raster tiles as an overlay on top of react-native-maps'
// native MapView. This avoids needing the native @rnmapbox/maps SDK (which
// requires a custom dev client build) so it still works inside plain Expo Go.
const MapboxTileOverlay = ({ styleId = 'streets-v12', zIndex = -1 }) => {
  const { MAPBOX_ACCESS_TOKEN } = useEnvVars()

  if (!MAPBOX_ACCESS_TOKEN) {
    return null
  }

  const urlTemplate = `https://api.mapbox.com/styles/v1/mapbox/${styleId}/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`

  return (
    <UrlTile
      urlTemplate={urlTemplate}
      maximumZ={22}
      flipY={false}
      zIndex={zIndex}
    />
  )
}

export default MapboxTileOverlay
