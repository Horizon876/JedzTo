import React, { useContext, useLayoutEffect } from 'react'
import { View, FlatList, TouchableOpacity } from 'react-native'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import navigationOptions from './navigationOptions'
import styles from './styles'
import { useTranslation } from 'react-i18next'
import Ripple from 'react-native-material-ripple'
import useNetworkStatus from '../../utils/useNetworkStatus'
import ErrorView from '../../components/ErrorView/ErrorView'
import CachedImage from '../../components/CachedImage'
import ShimmerImage from '../../components/ShimmerImage/ShimmerImage'
import { IMAGE_LINK } from '../../utils/constants'

const HEADING = {
  Restaurants: 'I feel like eating',
  Store: 'Lets shop for',
  default: 'Collections'
}

const TILE_COLORS = ['#2C2C2E', '#323236', '#2A2A2E', '#34343A', '#2E2E32']

const Collection = ({ navigation, route }) => {
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const data = route?.params?.data ?? []
  const collectionType = route?.params?.collectionType ?? 'default'
  const pageTitle = route?.params?.title || 'Browse Cuisines'
  const showHeader = route?.params?.showHeader ?? false
  const circular = route?.params?.layout === 'circle'
  const { t } = useTranslation()

  useLayoutEffect(() => {
    navigation.setOptions(
      navigationOptions({
        navigation,
        headerMenuBackground: circular ? '#121212' : currentTheme.headerMenuBackground,
        backIconColor: circular ? '#FFFFFF' : currentTheme.newIconColor,
        title: circular ? pageTitle : null
      })
    )
  }, [navigation, currentTheme, circular, pageTitle])

  const openCollection = (item) => {
    const selectedType = collectionType === 'Store' ? 'grocery' : 'restaurant'
    navigation.navigate('Menu', {
      collectionType,
      collection: item?.name,
      selectedType,
      queryType: selectedType
    })
  }

  const { isConnected: connect } = useNetworkStatus()
  if (!connect) return <ErrorView refetchFunctions={[]} />

  if (circular) {
    return (
      <View style={styles().circleContainer}>
        <FlatList
          numColumns={3}
          data={data}
          keyExtractor={(item) => item?._id || item?.name}
          contentContainerStyle={styles().circleContent}
          columnWrapperStyle={styles().circleRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const imageUrl = item?.image?.split('#')?.[0] || IMAGE_LINK
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles().circleItem}
                onPress={() => openCollection(item)}
              >
                <View
                  style={[
                    styles().circleTile,
                    { backgroundColor: TILE_COLORS[index % TILE_COLORS.length] }
                  ]}
                >
                  <ShimmerImage
                    imageUrl={imageUrl}
                    style={styles().circleImage}
                    resizeMode='cover'
                    defaultSource={{ uri: IMAGE_LINK }}
                  />
                </View>
                <TextDefault numberOfLines={1} smaller center textColor='#FFFFFF' style={styles().circleLabel}>
                  {item?.name}
                </TextDefault>
              </TouchableOpacity>
            )
          }}
        />
      </View>
    )
  }

  return (
    <View style={styles(currentTheme).container}>
      {showHeader ? (
        <View style={styles(currentTheme).headingContainer}>
          <TextDefault bolder H2 isRTL style={styles(currentTheme).headingTitle}>
            {t(pageTitle)}
          </TextDefault>
          <TextDefault bold H5 isRTL textColor={currentTheme.fontNewColor}>
            {t(HEADING[collectionType] || HEADING.default)}
          </TextDefault>
        </View>
      ) : null}
      <FlatList
        numColumns={2}
        data={data ?? []}
        renderItem={({ item }) => (
          <View style={styles().cardWrap}>
            <Ripple
              activeOpacity={0.7}
              style={styles(currentTheme).collectionCard}
              onPress={() => openCollection(item)}
            >
              <View style={styles().brandImgContainer}>
                <CachedImage
                  source={{ uri: item?.image }}
                  style={styles().collectionImage}
                  resizeMode='cover'
                />
              </View>
              <TextDefault Normal bold style={{ padding: 8 }} isRTL>
                {item.name}
              </TextDefault>
            </Ripple>
          </View>
        )}
        keyExtractor={(item) => item?._id}
        contentContainerStyle={styles().contentContainerStyle}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles().columnWrapperStyle}
      />
    </View>
  )
}

export default Collection
