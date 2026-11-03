import React, { useMemo } from 'react'
import { Image, ScrollView, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@apollo/client'
import gql from 'graphql-tag'
import { useTranslation } from 'react-i18next'
import TextDefault from '../../Text/TextDefault/TextDefault'
import ShimmerImage from '../../ShimmerImage/ShimmerImage'
import { IMAGE_LINK } from '../../../utils/constants'
import { restaurantMatchesCuisine } from '../../../utils/cuisineMatch'
import { getTasteCategories } from '../../../apollo/queries'
import { scale } from '../../../utils/scaling'
import styles from './styles'

const GET_TASTE_CATEGORIES = gql`
  ${getTasteCategories}
`

const TILE_COLORS = ['#2C2C2E', '#323236', '#2A2A2E', '#34343A', '#2E2E32']
const ACCENT = '#00A8FF'
const ALL_CHIP = { _id: '__all__', name: '__all__', isAll: true }

/** Bundled chip art — preferred over remote URLs so Expo Go shows latest assets. */
const LOCAL_BY_NAME = {
  zakupy: require('../../../assets/images/taste/zakupy.png'),
  pizza: require('../../../assets/images/taste/pizza.jpg'),
  kebab: require('../../../assets/images/taste/kebab.png'),
  kurczak: require('../../../assets/images/taste/kurczak.jpg')
}

/** Offline / first-paint fallback until API responds. */
export const TASTE_CATEGORIES = [
  {
    _id: 'c-zakupy',
    name: 'Zakupy',
    localImage: LOCAL_BY_NAME.zakupy,
    imageContain: true,
    shopType: 'restaurant'
  },
  {
    _id: 'c-pizza',
    name: 'Pizza',
    localImage: LOCAL_BY_NAME.pizza,
    shopType: 'restaurant'
  },
  {
    _id: 'c-burger',
    name: 'Burger',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
    shopType: 'restaurant'
  },
  {
    _id: 'c-kebab',
    name: 'Kebab',
    localImage: LOCAL_BY_NAME.kebab,
    shopType: 'restaurant'
  },
  {
    _id: 'c-kurczak',
    name: 'Kurczak',
    localImage: LOCAL_BY_NAME.kurczak,
    shopType: 'restaurant'
  },
  {
    _id: 'c-zeberka',
    name: 'Żeberka',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
    shopType: 'restaurant'
  }
]

const matchesSelected = (cuisine, selectedCuisine) =>
  !!selectedCuisine &&
  (cuisine?.name === selectedCuisine ||
    restaurantMatchesCuisine(
      { cuisines: [cuisine?.name], tags: [cuisine?.name], name: cuisine?.name },
      selectedCuisine
    ))

const tasteKey = (name) =>
  String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/** Prefer bundled images for known chips (API may return unsplash placeholders). */
const withLocalImage = (cuisine) => {
  if (!cuisine || cuisine.localImage || !cuisine.name) return cuisine
  const key = tasteKey(cuisine.name)
  const localImage = LOCAL_BY_NAME[key]
  if (!localImage) return cuisine
  return {
    ...cuisine,
    localImage,
    imageContain: cuisine.imageContain ?? key === 'zakupy',
    // Drop remote so the tile renders the bundled asset.
    image: undefined
  }
}

export const useTasteCategories = () => {
  const { data, loading, error } = useQuery(GET_TASTE_CATEGORIES, {
    fetchPolicy: 'cache-and-network'
  })
  return useMemo(() => {
    const fromApi = (data?.tasteCategories || []).map(withLocalImage)
    if (fromApi.length) return fromApi
    if (loading && !error) return TASTE_CATEGORIES.map(withLocalImage)
    return TASTE_CATEGORIES.map(withLocalImage)
  }, [data, loading, error])
}

const TasteCategories = ({ selectedCuisine = null, onCuisinePress }) => {
  const { t } = useTranslation()
  const themedStyles = styles()
  const categories = useTasteCategories()
  const items = useMemo(() => [ALL_CHIP, ...categories], [categories])

  return (
    <View style={themedStyles.section}>
      <View style={themedStyles.headerRow}>
        <TextDefault bolder H4 textColor='#FFFFFF'>
          {t('findYourTaste')}
        </TextDefault>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={themedStyles.scrollContent}
      >
        {items.map((cuisine, index) => {
          const isSelected = cuisine?.isAll ? !selectedCuisine : matchesSelected(cuisine, selectedCuisine)
          const imageUrl = cuisine?.image?.split('#')?.[0] || IMAGE_LINK
          return (
            <TouchableOpacity
              key={cuisine?._id || cuisine?.name || index}
              activeOpacity={0.85}
              style={themedStyles.item}
              onPress={() => onCuisinePress?.(cuisine?.isAll ? null : cuisine)}
            >
              <View
                style={[
                  themedStyles.tile,
                  {
                    backgroundColor: cuisine?.imageContain
                      ? '#FFFFFF'
                      : TILE_COLORS[index % TILE_COLORS.length]
                  },
                  isSelected && themedStyles.tileSelected
                ]}
              >
                {cuisine?.isAll ? (
                  <Ionicons name='grid' size={scale(22)} color={isSelected ? ACCENT : '#FFFFFF'} />
                ) : cuisine?.localImage ? (
                  <View style={themedStyles.imageClip}>
                    <Image
                      source={cuisine.localImage}
                      style={[
                        themedStyles.image,
                        cuisine.imageContain && themedStyles.iconImage
                      ]}
                      resizeMode={cuisine.imageContain ? 'contain' : 'cover'}
                    />
                  </View>
                ) : (
                  <ShimmerImage
                    imageUrl={imageUrl}
                    style={themedStyles.image}
                    resizeMode='cover'
                    defaultSource={{ uri: IMAGE_LINK }}
                  />
                )}
              </View>
              <TextDefault
                numberOfLines={1}
                smaller
                center
                bolder={isSelected}
                textColor={isSelected ? ACCENT : '#FFFFFF'}
                style={themedStyles.label}
              >
                {cuisine?.isAll ? t('allCuisines') : cuisine?.name}
              </TextDefault>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

export default React.memo(TasteCategories)
