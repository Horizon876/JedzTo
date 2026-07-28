import { ORDER_STATUS_ENUM } from './enums'

export const ACTIVE_ORDER_STATUSES = [
  ORDER_STATUS_ENUM.PENDING,
  ORDER_STATUS_ENUM.ACCEPTED,
  ORDER_STATUS_ENUM.ASSIGNED,
  ORDER_STATUS_ENUM.PICKED,
  'PREPARING'
]

export const PAST_ORDER_STATUSES = [
  ORDER_STATUS_ENUM.DELIVERED,
  ORDER_STATUS_ENUM.COMPLETED,
  ORDER_STATUS_ENUM.CANCELLED,
  ORDER_STATUS_ENUM.CANCELLEDBYREST,
  'REJECTED'
]

export function isActiveOrderStatus(status) {
  return ACTIVE_ORDER_STATUSES.includes(status)
}

export function isPastOrderStatus(status) {
  return !isActiveOrderStatus(status)
}

/**
 * Customer-facing status copy keys (i18n).
 * PENDING → awaiting acceptance
 * ACCEPTED / PREPARING → preparing
 * ASSIGNED / PICKED → out for delivery
 * DELIVERED / COMPLETED → delivered
 */
export function getOrderStatusLabelKey(status) {
  switch (status) {
    case ORDER_STATUS_ENUM.PENDING:
      return 'orderStatusAwaiting'
    case ORDER_STATUS_ENUM.ACCEPTED:
    case 'PREPARING':
      return 'orderStatusPreparing'
    case ORDER_STATUS_ENUM.ASSIGNED:
    case ORDER_STATUS_ENUM.PICKED:
      return 'orderStatusOutForDelivery'
    case ORDER_STATUS_ENUM.DELIVERED:
    case ORDER_STATUS_ENUM.COMPLETED:
      return 'orderStatusDelivered'
    case ORDER_STATUS_ENUM.CANCELLED:
    case ORDER_STATUS_ENUM.CANCELLEDBYREST:
    case 'REJECTED':
      return 'orderStatusCancelled'
    default:
      return 'orderStatusAwaiting'
  }
}

export function getOrderStatusHintKey(status) {
  switch (status) {
    case ORDER_STATUS_ENUM.PENDING:
      return 'orderStatusAwaitingHint'
    case ORDER_STATUS_ENUM.ACCEPTED:
    case 'PREPARING':
      return 'orderStatusPreparingHint'
    case ORDER_STATUS_ENUM.ASSIGNED:
    case ORDER_STATUS_ENUM.PICKED:
      return 'orderStatusOutForDeliveryHint'
    case ORDER_STATUS_ENUM.DELIVERED:
    case ORDER_STATUS_ENUM.COMPLETED:
      return 'orderStatusDeliveredHint'
    case ORDER_STATUS_ENUM.CANCELLED:
    case ORDER_STATUS_ENUM.CANCELLEDBYREST:
    case 'REJECTED':
      return 'orderStatusCancelledHint'
    default:
      return null
  }
}
