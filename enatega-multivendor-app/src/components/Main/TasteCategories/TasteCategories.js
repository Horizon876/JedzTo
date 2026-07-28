import React, { useMemo } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import TextDefault from '../../Text/TextDefault/TextDefault'
import ShimmerImage from '../../ShimmerImage/ShimmerImage'
import { IMAGE_LINK } from '../../../utils/constants'
import styles from './styles'

const TILE_COLORS = ['#2C2C2E', '#323236', '#2A2A2E', '#34343A', '#2E2E32']
const ACCENT = '#00A8FF'

export const TASTE_CATEGORIES = [
  {
    _id: 'c-pizza',
    name: 'Pizza',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
    shopType: 'restaurant'
  },
  {
    _id: 'c-burger',
    name: 'Burger',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
    shopType: 'restaurant'
  },
  {
    _id: 'c-sushi',
    name: 'Sushi',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
    shopType: 'restaurant'
  },
  {
    _id: 'c-kebab',
    name: 'Kebab',
    image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&q=80',
    shopType: 'restaurant'
  },
  {
    _id: 'c-kurczak',
    name: 'Kurczak',
    image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800&q=80',
    shopType: 'restaurant'
  }
]

const TasteCategories = ({ onCuisinePress, onSeeAllPress }) => {
  const { t } = useTranslation()
  const themedStyles = styles()
  const items = useMemo(() => TASTE_CATEGORIES, [])

  return (
    <View style={themedStyles.section}>
      <View style={themedStyles.headerRow}>
        <TextDefault bolder H4 textColor='#FFFFFF'>
          {t('findYourTaste')}
        </TextDefault>
        <TouchableOpacity activeOpacity={0.8} onPress={onSeeAllPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <TextDefault small bolder textColor={ACCENT}>
            {t('SeeAll')}
          </TextDefault>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={themedStyles.scrollContent}
      >
        {items.map((cuisine, index) => {
          const imageUrl = cuisine?.image?.split('#')?.[0] || IMAGE_LINK
          return (
            <TouchableOpacity
              key={cuisine?.name || index}
              activeOpacity={0.85}
              style={themedStyles.item}
              onPress={() => onCuisinePress?.(cuisine)}
            >
              <View style={[themedStyles.tile, { backgroundColor: TILE_COLORS[index % TILE_COLORS.length] }]}>
                <ShimmerImage
                  imageUrl={imageUrl}
                  style={themedStyles.image}
                  resizeMode='cover'
                  defaultSource={{ uri: IMAGE_LINK }}
                />
              </View>
              <TextDefault numberOfLines={1} smaller center textColor='#FFFFFF' style={themedStyles.label}>
                {cuisine?.name}
              </TextDefault>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

export default React.memo(TasteCategories)
