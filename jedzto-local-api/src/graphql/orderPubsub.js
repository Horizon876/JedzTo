import { PubSub } from 'graphql-subscriptions'

// Shared so HTTP Stripe routes and GraphQL resolvers publish on the same bus.
export const pubsub = new PubSub()
export const ORDER_CHANGED = 'ORDER_CHANGED'
export const ORDER_STATUS = 'ORDER_STATUS'
export const RIDER_LOCATION = 'RIDER_LOCATION'
export const CHAT_MESSAGE = 'CHAT_MESSAGE'
export const RESTAURANT_UPDATED = 'RESTAURANT_UPDATED'
