import { gql } from '@apollo/client';

export const GET_RESTAURANT_SETTLEMENTS = gql`
  query RestaurantSettlements($periodKey: String) {
    restaurantSettlements(periodKey: $periodKey) {
      _id
      restaurantId
      restaurantName
      periodKey
      periodStart
      periodEnd
      onlineGross
      cashGross
      totalGross
      commissionRate
      commissionOnOnline
      commissionOnCash
      commissionDue
      cashCommissionOwed
      onlinePayoutDue
      status
      settledAt
    }
  }
`;

export const GET_RESTAURANT_SALES_REPORT = gql`
  query RestaurantSalesReport($restaurantId: ID!, $from: String, $to: String) {
    restaurantSalesReport(restaurantId: $restaurantId, from: $from, to: $to) {
      restaurantId
      from
      to
      totalGross
      onlineGross
      cashGross
      orderCount
      topItems {
        id
        title
        count
      }
      byWeekday {
        weekday
        label
        gross
        orderCount
      }
    }
  }
`;
