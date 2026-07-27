import React, { useMemo } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import TextDefault from '../../Text/TextDefault/TextDefault'
import ShimmerImage from '../../ShimmerImage/ShimmerImage'
import { IMAGE_LINK } from '../../../utils/constants'
import styles from './styles'

// Soft pastel squircle backgrounds — cycled so each cuisine tile pops against
// the dark home surface (matches the "Znajdź swój smak" reference).
const SQUIRCLE_COLORS = ['#F5A962', '#7B5EA7', '#E8A0B0', '#A8C5D4', '#E07A5F', '#81B29A', '#F2CC8F', '#9B8AA6']

const TasteCategories = ({ cuisines = [], onCuisinePress, onSeeAllPress }) => {
  const { t } = useTranslation()
  const themedStyles = styles()
  const items = useMemo(() => cuisines.slice(0, 12), [cuisines])

  if (items.length === 0) return null

  return (
    <View style={themedStyles.section}>
      <View style={themedStyles.headerRow}>
        <TextDefault bolder H4 textColor='#FFFFFF'>
          {t('findYourTaste')}
        </TextDefault>
        <TouchableOpacity activeOpacity={0.8} onPress={onSeeAllPress}>
          <TextDefault small textColor='#FFFFFF' style={themedStyles.seeAll}>
            {t('showAll')}
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
              <View style={[themedStyles.squircle, { backgroundColor: SQUIRCLE_COLORS[index % SQUIRCLE_COLORS.length] }]}>
                <ShimmerImage
                  imageUrl={imageUrl}
                  style={themedStyles.image}
                  resizeMode='contain'
                  defaultSource={{ uri: IMAGE_LINK }}
                />
              </View>
              <TextDefault numberOfLines={2} small center textColor='#FFFFFF' style={themedStyles.label}>
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
