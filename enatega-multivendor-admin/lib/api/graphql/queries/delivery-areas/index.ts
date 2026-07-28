import { gql } from '@apollo/client';

export const GET_RESTAURANT_DELIVERY_AREAS = gql`
  query GetRestaurantDeliveryAreas($id: String) {
    restaurant(id: $id) {
      _id
      name
      deliveryAreas {
        _id
        name
        fee
        minOrder
        latitude
        longitude
        radiusKm
        isActive
      }
    }
  }
`;

export const GET_DELIVERY_QUOTE = gql`
  query GetDeliveryQuote(
    $restaurantId: ID!
    $latitude: Float!
    $longitude: Float!
  ) {
    deliveryQuote(
      restaurantId: $restaurantId
      latitude: $latitude
      longitude: $longitude
    ) {
      available
      fee
      minOrder
      areaName
    }
  }
`;
