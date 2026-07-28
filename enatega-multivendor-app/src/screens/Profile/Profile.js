import React, { useContext, useLayoutEffect, useEffect, useCallback, useState } from 'react'
import {
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Platform,
  Alert
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'
import gql from 'graphql-tag'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Localization from 'expo-localization'
import UserContext from '../../context/User'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'
import analytics from '../../utils/analytics'
import useNetworkStatus from '../../utils/useNetworkStatus'
import ErrorView from '../../components/ErrorView/ErrorView'
import LanguageModal, { languageTypes } from '../../components/LanguageModalize/LanguageModal'
import { Deactivate } from '../../apollo/mutations'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import styles, { ACCENT, BG, MUTED } from './styles'

const DEACTIVATE = gql`
  ${Deactivate}
`

const MenuRow = ({ icon, title, detail, onPress, danger = false, last = false, showChevron = true }) => {
  const color = danger ? '#FF6B6B' : '#FFFFFF'
  const disabled = !onPress

  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.75}
      disabled={disabled}
      style={[styles().menuRow, last && styles().menuRowLast]}
      onPress={onPress}
    >
      <View style={[styles().menuIcon, danger && styles().menuIconDanger]}>
        <Ionicons name={icon} size={scale(20)} color={danger ? '#FF6B6B' : ACCENT} />
      </View>
      <View style={styles().menuContent}>
        <TextDefault style={styles().menuTitle} textColor={color} H5 bold numberOfLines={1}>
          {title}
        </TextDefault>
        {detail ? (
          <TextDefault style={styles().menuDetail} textColor={MUTED} small numberOfLines={1}>
            {detail}
          </TextDefault>
        ) : null}
      </View>
      {showChevron && !danger && onPress ? (
        <Ionicons name='chevron-forward' size={scale(18)} color={MUTED} />
      ) : null}
    </TouchableOpacity>
  )
}

function Profile(props) {
  const Analytics = analytics()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { profile, logout } = useContext(UserContext)
  const [lngModalVisible, setLngModalVisible] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('')

  const [deactivated, { loading: deactivateLoading }] = useMutation(DEACTIVATE)

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content')
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(BG)
      }
      void fetchSelectedLanguage()
    }, [])
  )

  useEffect(() => {
    async function Track() {
      await Analytics.track(Analytics.events.NAVIGATE_TO_PROFILE)
    }
    Track()
  }, [])

  useLayoutEffect(() => {
    props?.navigation.setOptions({ headerShown: false })
  }, [props?.navigation])

  const fetchSelectedLanguage = async () => {
    const lang = await AsyncStorage.getItem('enatega-language-name')
    const systemLangCode = Localization?.locale?.split('-')[0]
    if (lang) {
      setSelectedLanguage(lang)
      return
    }
    const matched = languageTypes.find((langType) => langType.code === systemLangCode)
    setSelectedLanguage(matched ? matched.value : 'English')
  }

  const handleLogout = () => {
    Alert.alert(t('titleLogout'), '', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('titleLogout'),
        style: 'destructive',
        onPress: async () => {
          await logout()
        }
      }
    ])
  }

  const handleDeleteAccount = () => {
    Alert.alert(t('DeleteConfirmation'), t('permanentDeleteMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('DeleteAccount'),
        style: 'destructive',
        onPress: async () => {
          if (deactivateLoading || !profile?.email) return
          try {
            await deactivated({
              variables: { isActive: false, email: profile.email }
            })
            await logout()
            FlashMessage({ message: t('accountDeactivated') })
          } catch (error) {
            FlashMessage({ message: t('errorInProfile') })
          }
        }
      }
    ])
  }

  const { isConnected: connect } = useNetworkStatus()
  if (!connect) return <ErrorView />

  return (
    <View style={styles().container}>
      <View style={[styles().header, { paddingTop: insets.top + scale(12) }]}>
        <TextDefault bolder H3 textColor='#FFFFFF' style={styles().headerTitle}>
          {t('titleProfile')}
        </TextDefault>
        <TextDefault textColor={MUTED} style={styles().greeting} numberOfLines={1}>
          {t('Hi')}{profile?.name ? ` ${profile.name}` : ''}
        </TextDefault>
      </View>

      <ScrollView
        style={styles().flex}
        contentContainerStyle={[
          styles().scrollContent,
          { paddingBottom: Math.max(insets.bottom, scale(12)) + scale(88) }
        ]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={styles().menuCard}>
          <MenuRow
            icon='person-outline'
            title={t('name')}
            detail={profile?.name || '—'}
            onPress={() =>
              navigation.navigate('EditName', {
                name: profile?.name,
                phone: profile?.phone
              })
            }
          />
          <MenuRow
            icon='mail-outline'
            title={t('email')}
            detail={profile?.email || '—'}
            onPress={null}
            showChevron={false}
          />
          <MenuRow
            icon='call-outline'
            title={t('phone')}
            detail={profile?.phone || '—'}
            onPress={() =>
              navigation.navigate('PhoneNumber', {
                prevScreen: 'Profile'
              })
            }
          />
          <MenuRow
            icon='language-outline'
            title={t('language')}
            detail={selectedLanguage || '—'}
            onPress={() => setLngModalVisible(true)}
            last
          />
        </View>

        <View style={styles().menuCard}>
          <MenuRow
            icon='location-outline'
            title={t('myAddresses')}
            onPress={() => navigation.navigate('Addresses')}
          />
          <MenuRow
            icon='heart-outline'
            title={t('titleFavourite')}
            onPress={() => navigation.navigate('Favourite')}
            last
          />
        </View>

        <View style={styles().menuCard}>
          <MenuRow
            icon='trash-outline'
            title={t('DeleteAccount')}
            onPress={handleDeleteAccount}
            danger
          />
          <MenuRow
            icon='log-out-outline'
            title={t('titleLogout')}
            onPress={handleLogout}
            danger
            last
          />
        </View>
      </ScrollView>

      <LanguageModal
        currentTheme={{ themeBackground: BG, black: '#FFFFFF', main: ACCENT, color6: '#2C2C2E' }}
        modalVisible={lngModalVisible}
        setModalVisible={(visible) => {
          setLngModalVisible(visible)
          if (!visible) void fetchSelectedLanguage()
        }}
      />
    </View>
  )
}

export default Profile
