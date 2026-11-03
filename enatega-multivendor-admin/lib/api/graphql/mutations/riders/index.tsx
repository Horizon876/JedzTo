import { gql } from '@apollo/client';

export const CREATE_RIDER = gql`
  mutation CreateRider(
    $name: String!
    $login: String!
    $password: String!
    $restaurantId: ID!
  ) {
    createRider(
      name: $name
      login: $login
      password: $password
      restaurantId: $restaurantId
    ) {
      userId
      login
      email
      name
      restaurantId
      restaurantName
    }
  }
`;

export const DELETE_RIDER = gql`
  mutation DeleteRider($id: String!) {
    deleteRider(id: $id) {
      _id
    }
  }
`;

export const TOGGLE_RIDER = gql`
  mutation ToggleRider($id: String!) {
    toggleAvailablity(id: $id) {
      _id
      name
      username
      phone
      available
      restaurantId
      restaurantName
    }
  }
`;
