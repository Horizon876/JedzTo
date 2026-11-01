import { gql } from '@apollo/client'

export const KITCHEN_ORDERS = gql`
  query KitchenRestaurantOrders($restaurantId: ID!) {
    restaurantOrders(restaurantId: $restaurantId) {
      _id
      orderId
      orderStatus
      paymentMethod
      paymentStatus
      orderAmount
      deliveryCharges
      tipping
      taxationAmount
      instructions
      isPickedUp
      isRinged
      isRiderRinged
      createdAt
      acceptedAt
      expectedTime
      preparationTime
      preparationEtaMinutes
      deliveryEtaMinutes
      deliveryExpectedTime
      items {
        _id
        title
        description
        quantity
        image
        specialInstructions
        variation {
          title
          price
        }
        addons {
          title
          options {
            title
            price
          }
        }
      }
      user {
        _id
        name
        phone
      }
      rider {
        _id
        name
        phone
      }
      deliveryAddress {
        id
        deliveryAddress
        details
        label
        location {
          coordinates
        }
      }
      restaurant {
        _id
        name
        address
        shopType
        deliveryTime
        pickupTime
        defaultEta
        currentEta
        location {
          coordinates
        }
      }
    }
  }
`

export const EXTRA_ORDERS = gql`
  query ExtraOrders {
    extraOrders {
      _id
      orderId
      orderStatus
      paymentMethod
      paymentStatus
      orderAmount
      deliveryCharges
      tipping
      taxationAmount
      instructions
      isPickedUp
      isRinged
      isRiderRinged
      createdAt
      acceptedAt
      expectedTime
      preparationTime
      preparationEtaMinutes
      deliveryEtaMinutes
      deliveryExpectedTime
      items {
        _id
        title
        description
        quantity
        image
        specialInstructions
        variation {
          title
          price
        }
        addons {
          title
          options {
            title
            price
          }
        }
      }
      user {
        _id
        name
        phone
      }
      rider {
        _id
        name
        phone
      }
      deliveryAddress {
        id
        deliveryAddress
        details
        label
        location {
          coordinates
        }
      }
      restaurant {
        _id
        name
        address
        shopType
        deliveryTime
        pickupTime
        defaultEta
        currentEta
        location {
          coordinates
        }
      }
    }
  }
`

export const KITCHEN_RESTAURANT_TIMES = gql`
  query KitchenRestaurantTimes($id: String!) {
    restaurant(id: $id) {
      _id
      name
      deliveryTime
      pickupTime
      defaultEta
      isBusy
      currentEta
    }
  }
`

export const UPDATE_ORDER_STATUS = gql`
  mutation KitchenUpdateStatus(
    $id: String!
    $orderStatus: String!
    $preparationEtaMinutes: Int
    $deliveryEtaMinutes: Int
  ) {
    updateStatus(
      id: $id
      orderStatus: $orderStatus
      preparationEtaMinutes: $preparationEtaMinutes
      deliveryEtaMinutes: $deliveryEtaMinutes
    ) {
      _id
      orderStatus
      isRinged
      isRiderRinged
      expectedTime
      preparationEtaMinutes
      deliveryEtaMinutes
      deliveryExpectedTime
      rider {
        _id
        name
      }
      restaurant {
        _id
        shopType
      }
    }
  }
`

export const UPDATE_ORDER_ETA = gql`
  mutation KitchenUpdateOrderEta(
    $id: String!
    $preparationEtaMinutes: Int
    $deliveryEtaMinutes: Int
  ) {
    updateOrderEta(
      id: $id
      preparationEtaMinutes: $preparationEtaMinutes
      deliveryEtaMinutes: $deliveryEtaMinutes
    ) {
      _id
      expectedTime
      preparationTime
      preparationEtaMinutes
      deliveryEtaMinutes
      deliveryExpectedTime
    }
  }
`

export const UPDATE_RESTAURANT_ORDER_TIMES = gql`
  mutation KitchenUpdateRestaurantOrderTimes(
    $restaurantId: ID!
    $deliveryTime: Int
    $pickupTime: Int
    $defaultEta: Int
    $isBusy: Boolean
  ) {
    updateRestaurantOrderTimes(
      restaurantId: $restaurantId
      deliveryTime: $deliveryTime
      pickupTime: $pickupTime
      defaultEta: $defaultEta
      isBusy: $isBusy
    ) {
      _id
      deliveryTime
      pickupTime
      defaultEta
      isBusy
      currentEta
    }
  }
`

export const MUTE_RING = gql`
  mutation MuteRing($orderId: String) {
    muteRing(orderId: $orderId)
  }
`

export const ASSIGN_ORDER_MUTATION = gql`
  mutation AssignOrderFromPool($id: String!) {
    assignOrder(id: $id) {
      _id
      orderStatus
      isRiderRinged
      acceptedAt
      rider {
        _id
        name
        phone
      }
      restaurant {
        _id
        name
        shopType
      }
    }
  }
`
