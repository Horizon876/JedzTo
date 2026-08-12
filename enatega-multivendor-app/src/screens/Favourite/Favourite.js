import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import React, { useCallback, useContext, useEffect, useMemo } from 'react'
import { FlatList, Platform, StatusBar, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { scale } from '../../utils/scaling'
import { theme } from '../../utils/themeColors'
import { statusBarStyleForTheme } from '../../utils/statusBar'
import styles, { ACCENT } from './styles'
import Analytics from '../../utils/analytics'
import { HeaderBackButton } from '@react-navigation/elements'
import { MaterialIcons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import navigationService from '../../routes/navigationService'
import ErrorView from '../../components/ErrorView/ErrorView'
import EmptyView from '../../components/EmptyView/EmptyView'
import NewRestaurantCard from '../../components/Main/RestaurantCard/NewRestaurantCard'
import Spinner from '../../components/Spinner/Spinner'
import useNetworkStatus from '../../utils/useNetworkStatus'
import { isOpen, sortRestaurantsByOpenStatus } from '../../utils/customFunctions'
import { useFavourites } from '../../context/Favourites'
import { Icons } from '../../components/BottomTabIcon/icons'

function Favourite() {
  const analytics = Analytics()
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const insets = useSafeAreaInsets()
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ThemeValue: themeContext.ThemeValue,
    ...theme[themeContext.ThemeValue]
  }
  const themed = styles(currentTheme)
  const { PAGE, SURFACE, text } = themed.colors
  const isTabScreen = route?.name === 'Favourites'
  const { favourites, ready } = useFavourites()

  const favouriteRestaurants = useMemo(
    () => sortRestaurantsByOpenStatus(favourites || []),
    [favourites]
  )

  useEffect(() => {
    async function Track() {
      await analytics.track(analytics.events.NAVIGATE_TO_FAVOURITES)
    }
    Track()
  }, [])

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(statusBarStyleForTheme(themeContext.ThemeValue))
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(PAGE)
      }
      navigation.setOptions({
        headerShown: !isTabScreen,
        ...(isTabScreen
          ? {}
          : {
              title: t('Favourite'),
              headerTitleAlign: 'center',
              headerRight: null,
              headerStyle: { backgroundColor: SURFACE, elevation: 0 },
              headerTitleStyle: { color: text, fontWeight: 'bold' },
              headerLeft: () => (
                <HeaderBackButton
                  truncatedLabel=''
                  backImage={() => (
                    <View>
                      <MaterialIcons name='arrow-back' size={25} color={text} />
                    </View>
                  )}
                  onPress={() => navigationService.goBack()}
                />
              )
            })
      })
    }, [PAGE, SURFACE, isTabScreen, navigation, t, text, themeContext.ThemeValue])
  )

  const { isConnected: connect } = useNetworkStatus()
  if (!connect) return <ErrorView refetchFunctions={[]} />

  if (!ready) {
    return <Spinner backColor={PAGE} spinnerColor={ACCENT} />
  }

  return (
    <View style={themed.screen}>
      {isTabScreen ? (
        <View style={[themed.header, { paddingTop: insets.top + scale(8) }]}>
          <View style={themed.headerTitleRow}>
            <TextDefault bolder H4 textColor={text} isRTL>
              {t('Favourite')}
            </TextDefault>
            {Icons.favourites({ color: ACCENT, size: scale(16) })}
          </View>
        </View>
      ) : null}

      <FlatList
        data={favouriteRestaurants}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        style={themed.list}
        contentContainerStyle={[
          themed.contentContainer,
          { paddingBottom: Math.max(insets.bottom, scale(12)) + (isTabScreen ? scale(72) : scale(16)) }
        ]}
        ListEmptyComponent={
          <EmptyView
            title={'titleEmptyFav'}
            description={'emptyFavDesc'}
            buttonText={'emptyFavBtn'}
            navigateTo='Discovery'
            accentColor={ACCENT}
            backgroundColor={PAGE}
            textColor={text}
          />
        }
        renderItem={({ item }) => (
          <NewRestaurantCard {...item} fullWidth isOpen={isOpen(item)} />
        )}
      />
    </View>
  )
}

export default Favourite
