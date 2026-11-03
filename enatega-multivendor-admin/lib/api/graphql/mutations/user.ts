import { gql } from '@apollo/client';

export const UPDATE_USER_STATUS = gql`
  mutation updateUserStatus($id: ID!, $status: String!, $reason: String) {
    updateUserStatus(id: $id, status: $status, reason: $reason) {
      _id
      status
    }
  }
`;

export const UPDATE_USER_NOTES = gql`
  mutation updateUserNotes($id: ID!, $notes: String!) {
    updateUserNotes(id: $id, notes: $notes) {
      _id
      notes
    }
  }
`;

export const DELETE_USER = gql`
  mutation deleteUser($id: ID!) {
    deleteUser(id: $id) {
      _id
    }
  }
`;

export const RESET_USER_SESSION = gql`
  mutation resetUserSession($userId: ID!) {
    resetUserSession(userId: $userId) {
      _id
    }
  }
`;

export const SET_USER_FEATURE_BLOCK = gql`
  mutation setUserFeatureBlock(
    $userId: ID!
    $feature: String!
    $until: String!
    $reason: String
  ) {
    setUserFeatureBlock(
      userId: $userId
      feature: $feature
      until: $until
      reason: $reason
    ) {
      _id
      status
      featureBlocks {
        feature
        until
        reason
        createdAt
      }
    }
  }
`;

export const CLEAR_USER_FEATURE_BLOCK = gql`
  mutation clearUserFeatureBlock($userId: ID!, $feature: String!) {
    clearUserFeatureBlock(userId: $userId, feature: $feature) {
      _id
      featureBlocks {
        feature
        until
        reason
        createdAt
      }
    }
  }
`;
