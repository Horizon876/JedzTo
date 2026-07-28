import { gql } from '@apollo/client';

export const PUBLISH_MENU = gql`
  mutation PublishMenu($restaurantId: ID!) {
    publishMenu(restaurantId: $restaurantId) {
      restaurantId
      menuPublishedAt
      hasUnpublishedMenuChanges
      publishedCategories
      publishedItems
    }
  }
`;
