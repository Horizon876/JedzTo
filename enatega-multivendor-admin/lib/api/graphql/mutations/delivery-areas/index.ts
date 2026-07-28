import { gql } from '@apollo/client';

export const UPDATE_DELIVERY_AREAS = gql`
  mutation UpdateDeliveryAreas($restaurantId: ID!, $areas: [DeliveryAreaInput!]!) {
    updateDeliveryAreas(restaurantId: $restaurantId, areas: $areas) {
      _id
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
