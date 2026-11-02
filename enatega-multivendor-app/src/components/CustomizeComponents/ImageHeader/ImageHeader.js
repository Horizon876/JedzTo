import React from 'react'
import { Image, View } from 'react-native'
import styles from './styles'
import { useCachedMediaUri } from '../../../utils/mediaCache'

function ImageHeader(props) {
  const imageUri = useCachedMediaUri(props?.image, 'image')

  return (
    <View
      style={[styles.backgroundImage, props?.compact && styles.backgroundImageCompact, { overflow: 'hidden' }]}
    >
      <Image
        style={{ width: '100%', height: '100%' }}
        resizeMode='cover'
        source={{ uri: imageUri }}
        defaultSource={require('../../../assets/images/food_placeholder.png')}
      />
    </View>
  )
}

export default ImageHeader
