import { gql } from '@apollo/client';

export const GET_RIDERS = gql`
  query riders($restaurantId: ID) {
    riders(restaurantId: $restaurantId) {
      _id
      name
      username
      phone
      available
      restaurantId
      restaurantName
      assigned
    }
  }
`;

export const GET_RIDERS_PAGINATED = gql`
  query RidersPaginated(
    $page: Int
    $limit: Int
    $search: String
    $restaurantId: ID
    $available: Boolean
    $isActive: Boolean
  ) {
    ridersPaginated(
      page: $page
      limit: $limit
      search: $search
      restaurantId: $restaurantId
      available: $available
      isActive: $isActive
    ) {
      data {
        _id
        name
        username
        phone
        available
        restaurantId
        restaurantName
        assigned
      }
      totalCount
      currentPage
      totalPages
    }
  }
`;

export const GET_RIDER = gql`
  query Rider($id: String!) {
    rider(id: $id) {
      _id
      name
      username
      phone
      available
      restaurantId
      restaurantName
      assigned
    }
  }
`;

export const GET_AVAILABLE_RIDERS = gql`
  query {
    riders {
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

export const GET_RIDERS_BY_ZONE = gql`
  query RidersByZone($id: String!) {
    riders(restaurantId: $id) {
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
