import React, { useContext } from 'react'
import { View, TouchableOpacity } from 'react-native'
import styles from './styles'
import ConfigurationContext from '../../../context/Configuration'
import { useNavigation } from '@react-navigation/native'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { alignment } from '../../../utils/alignment'
import { AntDesign, Ionicons, MaterialIcons, Feather } from '@expo/vector-icons'
import { scale } from '../../../utils/scaling'
import { DAYS } from '../../../utils/enums'
import { useFavourites } from '../../../context/Favourites'
import { useTranslation } from 'react-i18next'
import { formatMoney } from '../../../utils/formatMoney'
import CachedImage from '../../CachedImage'
import UserContext from '../../../context/User'
import { getRestaurantEtaMinutes } from '../../../utils/restaurantEta'

function Item(props) {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { isFavourite, toggleFavourite } = useFavourites()
  const item = props?.item
  const heart = isFavourite(item?._id)
  const configuration = useContext(ConfigurationContext)
  const { isPickup } = useContext(UserContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const etaMinutes = getRestaurantEtaMinutes(item, { isPickup })
  const { isAvailable, openingTimes } = item
  const isOpen = () => {
    const date = new Date()
    const day = date.getDay()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const todaysTimings = openingTimes?.find(o => o.day === DAYS[day])
    if (todaysTimings === undefined) return false
    const times = todaysTimings.times.filter(
      t =>
        hours >= Number(t.startTime[0]) &&
        minutes >= Number(t.startTime[1]) &&
        hours <= Number(t.endTime[0]) &&
        minutes <= Number(t.endTime[1])
    )
    return times.length > 0
  }

  return (
    <TouchableOpacity
      // style={{ padding: scale(10), backgroundColor: 'green' }}
      activeOpacity={1}
      onPress={() => navigation.navigate('Restaurant', { ...item })}>
      <View key={item._id} style={styles().mainContainer}>
        <View style={[styles(currentTheme).restaurantContainer]}>
          <View style={styles().imageContainer}>
            <CachedImage
              resizeMode="cover"
              source={{ uri: item?.image }}
              style={styles().img}
            />
            <View style={styles().overlayRestaurantContainer}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles(currentTheme).favOverlay}
                onPress={() => toggleFavourite(item)}>
                {heart ? (
                  <AntDesign name="heart" size={scale(15)} color="black" />
                ) : (
                  <Feather name="heart" size={scale(15)} color="black" />
                )}
              </TouchableOpacity>
              {(!isAvailable || !isOpen()) && (
                <View style={{ ...styles().featureOverlay, top: 40 }}>
                  <TextDefault
                    style={[
                      styles(currentTheme).featureText,
                      {
                        ...alignment.MTxSmall,
                        ...alignment.PLsmall,
                        ...alignment.PRsmall,
                        ...alignment.PTxSmall,
                        ...alignment.PBxSmall
                      }
                    ]}
                    textColor={currentTheme.fontWhite}
                    numberOfLines={1}
                    small
                    bold
                    uppercase>
                    {t('Closed')}
                  </TextDefault>
                </View>
              )}
              {/* <View style={styles(currentTheme).deliveryRestaurantOverlay}>
                <TextDefault
                  textColor={currentTheme.fontMainColor}
                  numberOfLines={1}
                  small
                  bolder
                  center>
                  {item.deliveryTime + ' '}
                  {t('min')}
                </TextDefault>
              </View> */}
            </View>
          </View>
          <View style={styles().descriptionContainer}>
            <View style={styles().aboutRestaurant}>
              <TextDefault
                style={{ width: '77%' }}
                H4
                numberOfLines={1}
                textColor={currentTheme.fontThirdColor}
                bolder>
                {item.name}
              </TextDefault>
              <View style={[styles().aboutRestaurant, { width: '23%' }]}>
                <Feather name="star" size={18} color={currentTheme.newIconColor} />
                <TextDefault
                textColor={currentTheme.fontThirdColor}
       
                H4
                 bolder
                  style={{ marginLeft: scale(2), marginRight: scale(5)}}
                 >
                  {item.reviewAverage}
                </TextDefault>
                <TextDefault
                   textColor={currentTheme.fontNewColor}
                  style={{ marginLeft: scale(2)}}
                 
                  H5>
                  ({item.reviewCount})
                </TextDefault>
              </View>
            </View>
            {
              item?.tags?.length>0 && (
                <TextDefault
                  style={styles().offerCategoty}
                  numberOfLines={1}
                bold
                Normal
                textColor={currentTheme.fontNewColor}
                >
                  {item?.tags?.join(',')}
                </TextDefault>
              )
            }
            <View style={styles().priceRestaurant}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  justifyContent: 'center',
                  marginRight: 18
                }}>
                <AntDesign name="clock-circle" size={16}
                color={currentTheme.fontNewColor} />
                <TextDefault
                  textColor={currentTheme.fontNewColor}
                  numberOfLines={1}
                  bold
                  Normal>
                  {etaMinutes + ' '}
                  {t('min')}
                </TextDefault>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  justifyContent: 'center',
                  marginRight: 10
                }}>
                <MaterialIcons name="directions-bike" size={16}
                color={currentTheme.fontNewColor}/>
                <TextDefault
                  style={styles().offerCategoty}
                  textColor={currentTheme.fontNewColor}
                numberOfLines={1}
                bold
                Normal>
                  {formatMoney(item.minimumOrder, configuration.currencySymbol, { decimals: 0 })}{' '}
                </TextDefault>
              </View>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default Item
