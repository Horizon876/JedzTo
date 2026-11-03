import { gql } from '@apollo/client';

const SETTLEMENT_FIELDS = `
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
  cashFeeDue
  cashCommissionOwed
  onlinePayoutDue
  status
  settledAt
`

export const GET_RESTAURANT_SETTLEMENTS = gql`
  query RestaurantSettlements($periodKey: String) {
    restaurantSettlements(periodKey: $periodKey) {
      ${SETTLEMENT_FIELDS}
    }
  }
`;

export const GET_RESTAURANT_SETTLEMENT = gql`
  query RestaurantSettlement($restaurantId: ID!, $periodKey: String) {
    restaurantSettlement(restaurantId: $restaurantId, periodKey: $periodKey) {
      ${SETTLEMENT_FIELDS}
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
