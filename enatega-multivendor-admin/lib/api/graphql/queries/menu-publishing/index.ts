import { gql } from '@apollo/client';

export const GET_MENU_PUBLISH_STATUS = gql`
  query GetMenuPublishStatus($restaurantId: ID!) {
    menuPublishStatus(restaurantId: $restaurantId) {
      restaurantId
      menuPublishedAt
      hasUnpublishedMenuChanges
      publishedCategories
      publishedItems
    }
  }
`;
