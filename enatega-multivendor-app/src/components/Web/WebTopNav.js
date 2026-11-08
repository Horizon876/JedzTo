import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import Logo from '../Logo/Logo'
import TextDefault from '../Text/TextDefault/TextDefault'
import BottomTabIcon from '../BottomTabIcon/BottomTabIcon'

const ACCENT = '#00A8FF'

/**
 * Desktop website top navigation — replaces the mobile bottom tab bar on web.
 */
export default function WebTopNav({ state, descriptors, navigation }) {
  const { t } = useTranslation()
  const isDark = true

  return (
    <View style={[styles.bar, isDark && styles.barDark]}>
      <View style={styles.inner}>
        <Pressable onPress={() => navigation.navigate('Discovery')} style={styles.brand}>
          <Logo size={26} />
        </Pressable>

        <View style={styles.links}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key]
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                  ? options.title
                  : route.name
            const isFocused = state.index === index
            const iconName =
              route.name === 'Favourites' ? 'profile' : route.name.toLowerCase()

            return (
              <Pressable
                key={route.key}
                accessibilityRole='link'
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true
                  })
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name)
                  }
                }}
                style={[styles.link, isFocused && styles.linkActive]}
              >
                <BottomTabIcon
                  name={iconName}
                  size='20'
                  color={isFocused ? ACCENT : '#8E8E93'}
                />
                <TextDefault
                  bolder={isFocused}
                  small
                  textColor={isFocused ? ACCENT : '#8E8E93'}
                  style={styles.linkLabel}
                >
                  {typeof label === 'string' ? label : t('tabHome')}
                </TextDefault>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    // fixed escapes the bottom-tab slot so this sits as a real site header
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    height: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
    backgroundColor: '#121212',
    justifyContent: 'center'
  },
  barDark: {
    backgroundColor: '#121212'
  },
  inner: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  brand: {
    paddingVertical: 8,
    paddingRight: 16
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10
  },
  linkActive: {
    backgroundColor: 'rgba(0, 168, 255, 0.12)'
  },
  linkLabel: {
    marginTop: 1
  }
})
