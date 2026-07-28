import { gql } from '@apollo/client'

export const OWNER_LOGIN = gql`
  mutation OwnerLogin($email: String!, $password: String!) {
    ownerLogin(email: $email, password: $password) {
      userId
      token
      email
      userType
      userTypeId
      restaurantId
      name
      restaurants {
        _id
        name
      }
    }
  }
`
