/* eslint-disable react/display-name */
import React from 'react'
import { alignment } from '../../utils/alignment'

// The selected address + "change address" affordance now lives in the
// DiscoveryHero banner at the top of the Home screen content, so the native
// header on Discovery is reduced to just the cart icon (still supplied by
// BottomTabNavigator's shared screenOptions) — no separate address title.
const navigationOptions = (props) => ({
  headerStyle: {
    shadowColor: 'transparent',
    shadowRadius: 0,
    backgroundColor: props?.headerMenuBackground
  },
  headerTitleStyle: {
    color: props?.fontMainColor,
    ...alignment.PTlarge
  },
  headerTitle: () => null
})
export default navigationOptions
