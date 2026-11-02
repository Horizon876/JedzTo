import { gql } from '@apollo/client';

export const SETTLE_RESTAURANT_PERIOD = gql`
  mutation SettleRestaurantPeriod($restaurantId: ID!, $periodKey: String!) {
    settleRestaurantPeriod(restaurantId: $restaurantId, periodKey: $periodKey) {
      _id
      restaurantId
      restaurantName
      periodKey
      status
      settledAt
      onlinePayoutDue
      cashFeeDue
      cashCommissionOwed
      commissionDue
      totalGross
    }
  }
`;

export const SUSPEND_RESTAURANT = gql`
  mutation SuspendRestaurant(
    $restaurantId: ID!
    $isSuspended: Boolean!
    $reason: String
  ) {
    suspendRestaurant(
      restaurantId: $restaurantId
      isSuspended: $isSuspended
      reason: $reason
    ) {
      _id
      name
      isSuspended
      suspendedReason
      isAvailable
      commissionRate
    }
  }
`;

export const REFUND_ORDER = gql`
  mutation RefundOrder($orderId: ID!, $amount: Float) {
    refundOrder(orderId: $orderId, amount: $amount) {
      _id
      orderStatus
      paymentStatus
      refundedAt
      refundAmount
    }
  }
`;

export const SET_RESTAURANT_PAUSE = gql`
  mutation SetRestaurantPause(
    $restaurantId: ID!
    $paused: Boolean!
    $pausedUntil: String
  ) {
    setRestaurantPause(
      restaurantId: $restaurantId
      paused: $paused
      pausedUntil: $pausedUntil
    ) {
      _id
      isAvailable
      pausedUntil
    }
  }
`;

export const SET_RESTAURANT_HOLIDAYS = gql`
  mutation SetRestaurantHolidays(
    $restaurantId: ID!
    $holidays: [HolidayExceptionInput!]!
  ) {
    setRestaurantHolidays(restaurantId: $restaurantId, holidays: $holidays) {
      _id
      holidayExceptions {
        _id
        date
        closed
        open
        close
        label
      }
    }
  }
`;
