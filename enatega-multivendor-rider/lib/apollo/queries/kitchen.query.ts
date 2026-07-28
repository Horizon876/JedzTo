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
      createdAt
      acceptedAt
      items {
        _id
        title
        description
        quantity
        image
        variation {
          title
          price
        }
      }
      user {
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
      }
    }
  }
`

export const UPDATE_ORDER_STATUS = gql`
  mutation KitchenUpdateStatus($id: String!, $orderStatus: String!) {
    updateStatus(id: $id, orderStatus: $orderStatus) {
      _id
      orderStatus
    }
  }
`
