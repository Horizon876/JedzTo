import React, { useCallback, useContext, useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import * as Linking from 'expo-linking'
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack'
import AsyncStorage from '@react-native-async-storage/async-storage'
import navigationService from './navigationService'
import * as Notifications from 'expo-notifications'
import Login from '../screens/Login/Login'
import Register from '../screens/Register/Register'
import ForgotPassword from '../screens/ForgotPassword/ForgotPassword'
import SetYourPassword from '../screens/ForgotPassword/SetYourPassword'
import CreateAccount from '../screens/CreateAccount/CreateAccount'
import GuestCheckout from '../screens/GuestCheckout/GuestCheckout'
import ItemDetail from '../screens/ItemDetail/ItemDetail'
import MyOrders from '../screens/MyOrders/MyOrders'
import Cart from '../screens/Cart/Cart'
import SaveAddress from '../screens/SaveAddress/SaveAddress'
import RateAndReview from '../screens/RateAndReview/RateAndReview'
import Payment from '../screens/Payment/Payment'
import Help from '../screens/Help/Help'
import CustomerSupport from '../screens/CustomerSupport/CustomerSupport'
import Paypal from '../screens/Paypal/Paypal'
import StripeCheckout from '../screens/Stripe/StripeCheckout'
import PaymentCancelled from '../screens/PaymentCancelled/PaymentCancelled'
import Addresses from '../screens/Addresses/Addresses'
import NewAddress from '../screens/NewAddress/NewAddress'
import EditAddress from '../screens/EditAddress/EditAddress'
import CartAddress from '../screens/CartAddress/CartAddress'
import Settings from '../screens/Settings/Settings'
import HelpBrowser from '../screens/HelpBrowser/HelpBrowser'
import Main from '../screens/Main/Main'
import Restaurant from '../screens/Restaurant/Restaurant'
import About from '../screens/About'
import SelectLocation from '../screens/SelectLocation'
import AddNewAddress from '../screens/SelectLocation/AddNewAddress'
import CurrentLocation from '../screens/CurrentLocation'
import ChangeAddress from '../screens/ChangeAddress'
import ThemeContext from '../ui/ThemeContext/ThemeContext'
import { theme } from '../utils/themeColors'
import screenOptions from './screenOptions'
import { LocationContext } from '../context/Location'
import AuthContext from '../context/Auth'
import Reorder from '../screens/Reorder/Reorder'
import Favourite from '../screens/Favourite/Favourite'
import { DarkBackButton, RightButton } from '../components/Header/HeaderIcons/HeaderIcons'
import EmailOtp from '../screens/Otp/Email/EmailOtp'
import PhoneOtp from '../screens/Otp/Phone/PhoneOtp'
import ForgotPasswordOtp from '../screens/Otp/ForgotPassword/ForgetPasswordOtp'
import PhoneNumber from '../screens/PhoneNumber/PhoneNumber'
import { useApolloClient, gql } from '@apollo/client'
import { myOrders } from '../apollo/queries'
import Checkout from '../screens/Checkout/Checkout'
import Menu from '../screens/Menu/Menu'
import Reviews from '../screens/Reviews'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import BottomTabIcon from '../components/BottomTabIcon/BottomTabIcon'
import { useTranslation } from 'react-i18next'
import Collection from '../screens/Collection/Collection'
import Account from '../screens/Account/Account'
import EditName from '../components/Account/EditName/EditName'
import { Platform } from 'react-native'
// import HypCheckout from '../screens/Hyp/HypCheckout'
import { SLIDE_RIGHT_WITH_CURVE_ANIM, SLIDE_UP_RIGHT_ANIMATION, AIMATE_FROM_CENTER } from '../utils/constants'

const NavigationStack = createStackNavigator()
const Location = createStackNavigator()
const Tab = createBottomTabNavigator()
const linking = {
  prefixes: [
    Linking.createURL('/'),
    'enategamultivendor://',
    'https://multivendor.enatega.com',
    'https://www.multivendor.enatega.com'
  ],
  config: {
    screens: {
      SetYourPassword: {
        path: 'auth/reset'
      }
    }
  }
}

function MainNavigator() {
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]

  return (
    <NavigationStack.Navigator
      screenOptions={{
        ...screenOptions({
          theme: themeContext.ThemeValue,
          headerMenuBackground: currentTheme.headerMenuBackground,
          backColor: currentTheme.headerBackground,
          lineColor: currentTheme.horizontalLine,
          textColor: currentTheme.headerText,
          iconColor: currentTheme.iconColorPink,
          headerShown: false
        }),
        // Default the card background to the themed background so screens never
        // flash white during the push transition (e.g. Discovery -> Restaurant)
        // before their content paints.
        cardStyle: { backgroundColor: currentTheme.themeBackground },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS
      }}
    >
      <NavigationStack.Screen
        name='Main'
        component={BottomTabNavigator}
        options={{
          headerShown: false
        }}
      />
      <NavigationStack.Screen name='Menu' component={Menu} options={SLIDE_RIGHT_WITH_CURVE_ANIM} />
      <NavigationStack.Screen
        name='NewRestaurantDetailDesign'
        getComponent={() => require('../components/NewRestaurantDetailDesign/RestaurantDetailDesign').default}
        options={{
          header: () => null,
          ...AIMATE_FROM_CENTER
        }}
      />
      <NavigationStack.Screen
        name='CategoryPage'
        getComponent={() => require('../components/SubCategoryPage/SubCategoryPage').default}
        options={{
          header: () => null,
          ...SLIDE_RIGHT_WITH_CURVE_ANIM
        }}
      />
      <NavigationStack.Screen
        name='Restaurant'
        component={Restaurant}
        options={{
          header: () => null,
          ...SLIDE_RIGHT_WITH_CURVE_ANIM
        }}
      />
      <NavigationStack.Screen name='ItemDetail' component={ItemDetail} options={SLIDE_RIGHT_WITH_CURVE_ANIM} />
      <NavigationStack.Screen
        name='Cart'
        component={Cart}
        options={SLIDE_RIGHT_WITH_CURVE_ANIM}
      />
      <NavigationStack.Screen name='Checkout' component={Checkout} options={SLIDE_RIGHT_WITH_CURVE_ANIM} />
      <NavigationStack.Screen name='Help' component={Help} options={SLIDE_RIGHT_WITH_CURVE_ANIM} />
      <NavigationStack.Screen name='Collection' component={Collection} options={SLIDE_RIGHT_WITH_CURVE_ANIM} />
      <NavigationStack.Screen
        name='CustomerSupport'
        component={CustomerSupport}
        options={SLIDE_RIGHT_WITH_CURVE_ANIM}
      />
      <NavigationStack.Screen name='HelpBrowser' component={HelpBrowser} />
      <NavigationStack.Screen name='About' component={About} options={{ header: () => null, ...SLIDE_RIGHT_WITH_CURVE_ANIM }} />
      <NavigationStack.Screen name='Reviews' component={Reviews} options={SLIDE_RIGHT_WITH_CURVE_ANIM} />
      <NavigationStack.Screen name='Paypal' component={Paypal} />
      <NavigationStack.Screen name='RateAndReview' component={RateAndReview} />

      <NavigationStack.Screen
        name='StripeCheckout'
        component={StripeCheckout}
        options={{
          headerShown: false,
          gestureEnabled: false,
          ...SLIDE_RIGHT_WITH_CURVE_ANIM
        }}
      />
      <NavigationStack.Screen
        name='PaymentCancelled'
        component={PaymentCancelled}
        options={{ headerShown: false, ...SLIDE_RIGHT_WITH_CURVE_ANIM }}
      />

      {/* Customer details before checkout (no login UI) */}
      <NavigationStack.Screen name='GuestCheckout' component={GuestCheckout} options={SLIDE_RIGHT_WITH_CURVE_ANIM} />
      {/* Legacy auth screens kept registered but unused from main UX */}
      <NavigationStack.Screen name='CreateAccount' component={CreateAccount} />
      <NavigationStack.Screen name='Login' component={Login} />
      <NavigationStack.Screen name='Register' component={Register} />
      <NavigationStack.Screen name='PhoneNumber' component={PhoneNumber} />
      <NavigationStack.Screen name='ForgotPassword' component={ForgotPassword} />
      <NavigationStack.Screen name='SetYourPassword' component={SetYourPassword} />
      <NavigationStack.Screen name='EmailOtp' component={EmailOtp} />
      <NavigationStack.Screen name='PhoneOtp' component={PhoneOtp} />
      <NavigationStack.Screen name='ForgotPasswordOtp' component={ForgotPasswordOtp} />
      <NavigationStack.Screen
        name='CurrentLocation'
        component={CurrentLocation}
        options={{ header: () => null }}
      />
      <NavigationStack.Screen
        name='ChangeAddress'
        component={ChangeAddress}
        options={{ header: () => null, ...SLIDE_RIGHT_WITH_CURVE_ANIM }}
      />
      <NavigationStack.Screen name='SelectLocation' component={SelectLocation} options={SLIDE_RIGHT_WITH_CURVE_ANIM} />
      {/* Always registered — do not gate on isLoggedIn or guest checkout remounts the stack. */}
      <NavigationStack.Screen name='Addresses' component={Addresses} options={SLIDE_RIGHT_WITH_CURVE_ANIM} />
      <NavigationStack.Screen name='NewAddress' component={NewAddress} />
      <NavigationStack.Screen name='EditAddress' component={EditAddress} />
      <NavigationStack.Screen
        name='FullMap'
        getComponent={() => require('../screens/FullMap/FullMap').default}
        options={SLIDE_UP_RIGHT_ANIMATION}
      />
      <NavigationStack.Screen name='CartAddress' component={CartAddress} options={SLIDE_RIGHT_WITH_CURVE_ANIM} />
      <NavigationStack.Screen name='AddNewAddress' component={AddNewAddress} />
      <NavigationStack.Screen name='SaveAddress' component={SaveAddress} />
      <NavigationStack.Screen name='Payment' component={Payment} />
      <NavigationStack.Screen
        name='OrderDetail'
        getComponent={() => require('../screens/OrderDetail/OrderDetail').default}
        options={{
          headerBackImage: () =>
            DarkBackButton({
              iconColor: currentTheme.backIcon,
              iconBackground: currentTheme.backIconBackground
            }),
          ...SLIDE_RIGHT_WITH_CURVE_ANIM
        }}
      />
      <NavigationStack.Screen name='Settings' component={Settings} />
      <NavigationStack.Screen name='MyOrders' component={MyOrders} options={SLIDE_RIGHT_WITH_CURVE_ANIM} />
      <NavigationStack.Screen name='Reorder' component={Reorder} />
      <NavigationStack.Screen name='Favourite' component={Favourite} options={SLIDE_RIGHT_WITH_CURVE_ANIM} />
      <NavigationStack.Screen
        name='ChatWithRider'
        getComponent={() => require('../screens/ChatWithRider/ChatScreen').default}
      />
      <NavigationStack.Screen
        name='MapSection'
        getComponent={() => require('../screens/MapSection').default}
        options={SLIDE_UP_RIGHT_ANIMATION}
      />
      <NavigationStack.Screen name='Account' component={Account} options={SLIDE_RIGHT_WITH_CURVE_ANIM} />
      <NavigationStack.Screen name='EditName' component={EditName} />
      <NavigationStack.Screen
        name='SearchScreen'
        getComponent={() => require('../screens/Search/SearchScreen').default}
        options={{ headerShown: false }}
      />
    </NavigationStack.Navigator>
  )
}

function LocationStack() {
  return (
    <Location.Navigator>
      <Location.Screen name='CurrentLocation' component={CurrentLocation} options={{ header: () => null }} />
      <Location.Screen name='SelectLocation' component={SelectLocation} />
      <Location.Screen name='AddNewAddress' component={AddNewAddress} options={SLIDE_RIGHT_WITH_CURVE_ANIM} />
      <Location.Screen
        name='Main'
        component={BottomTabNavigator}
        options={{
          headerShown: false
        }}
      />
    </Location.Navigator>
  )
}

function BottomTabNavigator() {
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const { t } = useTranslation()
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          // synced with BottomTabIcon, make sure to have the same name as icon in BottomTabIcon
          return <BottomTabIcon name={route.name.toLowerCase()} size={focused ? '28' : size} color={color} />
        },
        tabBarStyle: {
          paddingHorizontal: 15,
          paddingVertical: 10,
          paddingBottom: Platform.OS === 'ios' ? 25 : 15,
          height: Platform.OS === 'ios' ? 90 : 70,
          backgroundColor: '#1A1A1A',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0
        },
        tabBarActiveTintColor: '#00A8FF',
        tabBarInactiveTintColor: '#5B8FB8',
        tabBarLabelStyle: { fontSize: 12 },
        headerRight: () => <RightButton icon='cart' iconColor={currentTheme.iconColor} menuHeader={false} t={t} />
      })}
    >
      {/* Krok "BottomTab" — Home, Explore, Orders, Favourites */}
      <Tab.Screen
        name='Discovery'
        component={Main}
        options={{
          tabBarLabel: t('tabHome'),
          // Dark DiscoveryHero owns the top of the screen (address + search),
          // so the native header would only create a double bar / light strip.
          headerShown: false
        }}
      />
      <Tab.Screen
        name='Search'
        getComponent={() => require('../screens/Search/SearchScreen').default}
        options={{
          tabBarLabel: t('tabExplore'),
          headerShown: false
        }}
      />
      {/* Named "Orders" (not "MyOrders") so it doesn't collide with the
          existing 'MyOrders' stack screen that Sidebar still push
          with its own back button + slide transition. */}
      <Tab.Screen
        name='Orders'
        component={MyOrders}
        options={{
          tabBarLabel: t('tabOrders'),
          headerShown: false
        }}
      />
      <Tab.Screen
        name='Favourites'
        component={Favourite}
        options={{
          tabBarLabel: t('Favourite'),
          headerShown: false
        }}
      />
    </Tab.Navigator>
  )
}

function AppContainer() {
  const client = useApolloClient()
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const { permissionState, setPermissionState, location, setLocation, isLocationLoaded } = useContext(LocationContext)
  const { isAuthReady } = useContext(AuthContext)
  const lastNotificationResponse = Notifications.useLastNotificationResponse()
  // Every cold start must pick a delivery address first (even if an old
  // address is still sitting in AsyncStorage / the user is logged in) — the
  // app should always open on the location picker, not jump straight to the
  // Home/menu screen. Wait for auth hydration so this only runs once, after
  // the persisted location has actually been loaded.
  const [isLaunchGateReady, setIsLaunchGateReady] = React.useState(false)

  // React Navigation's DefaultTheme paints the scene background white. Match it
  // to the app background so horizontal slide transitions never flash white.
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: currentTheme.themeBackground
    }
  }

  const [isLoadingPermission, setIsLoadingPermission] = React.useState(true)

  useEffect(() => {
    if (!isAuthReady || !isLocationLoaded || isLaunchGateReady) return
    setLocation(null)
    setIsLaunchGateReady(true)
  }, [isAuthReady, isLocationLoaded, isLaunchGateReady, setLocation])

  const handleNotification = useCallback(
    async (response) => {
      const { _id } = response.notification.request.content.data
      const lastNotificationHandledId = await AsyncStorage.getItem('@lastNotificationHandledId')
      await client.query({
        query: gql`
          ${myOrders}
        `,
        fetchPolicy: 'network-only'
      })
      const identifier = response.notification.request.identifier
      if (lastNotificationHandledId === identifier) return
      await AsyncStorage.setItem('@lastNotificationHandledId', identifier)
      navigationService.navigate('OrderDetail', {
        _id
      })
    },
    [lastNotificationResponse]
  )

  // Handlers
  const init = async () => {
    try {
      const Location = await import('expo-location')
      const permission_state = await Location.getForegroundPermissionsAsync()
      console.log({permission_state})

      setPermissionState(permission_state)
      setIsLoadingPermission(false)
    } finally {
      setIsLoadingPermission(false)
    }
  }

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (lastNotificationResponse && lastNotificationResponse.notification.request.content.data?.type === 'order' && lastNotificationResponse.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      handleNotification(lastNotificationResponse)
    }
  }, [lastNotificationResponse])

  console.log('-------------')
  console.log('-------------')
  console.log({ permissionState, location })

  if (isLoadingPermission || !isLocationLoaded || !isAuthReady || !isLaunchGateReady) return

  // JedzTo onboarding:
  // - Guests: always land on the Address screen on cold start (see guest
  //   address gate above), then continue to Home after picking a location.
  // - Logged-in users: skip Address when a saved location already exists.
  // GPS permission is requested lazily from the Address screen itself.
  const shouldShowLocationStack = !location

  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={navigationTheme}
        linking={linking}
        ref={(ref) => {
          navigationService.setGlobalRef(ref)
        }}
      >
        {shouldShowLocationStack ? <LocationStack /> : <MainNavigator />}

        {/* {<LocationStack />}
        <MainNavigator /> */}
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

export default AppContainer
