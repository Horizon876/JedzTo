import { getEnvironmentConfig } from '../../environment.config'
import * as Updates from 'expo-updates'
import {
  getJedzToLocalRestaurantById,
  getJedzToLocalRestaurantPreviews,
  isJedzToLocalRestaurantId,
  JEDZTO_LOCAL_CUISINES
} from '../data/jedztoLocalRestaurants'

const envConfig = () => {
  try {
    return getEnvironmentConfig(Updates.channel)
  } catch (e) {
    return getEnvironmentConfig('development')
  }
}

export const useJedzToLocalRestaurantsEnabled = () =>
  !!envConfig().USE_JEDZTO_LOCAL_RESTAURANTS

export const jedzToLocalRestaurantsEnabled = () =>
  !!envConfig().USE_JEDZTO_LOCAL_RESTAURANTS

export {
  getJedzToLocalRestaurantById,
  getJedzToLocalRestaurantPreviews,
  isJedzToLocalRestaurantId,
  JEDZTO_LOCAL_CUISINES
}
