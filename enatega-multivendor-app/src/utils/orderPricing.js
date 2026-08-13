export function calculateOrderPricing({
  cart = [],
  discountPercent = 0,
  discountFixed = 0,
  taxPercent = 0,
  delivery = 0,
  tip = 0
}) {
  const subtotal = cart.reduce((total, item) => total + Number(item.price) * item.quantity, 0)
  const percentOff = (Number(discountPercent) / 100) * subtotal
  const fixedOff = Math.max(0, Number(discountFixed) || 0)
  const discountAmount = Math.min(subtotal, percentOff + fixedOff)
  const discountedSubtotal = subtotal - discountAmount
  const deliveryAmount = Number(delivery) || 0
  const taxationAmount = Number(
    (((discountedSubtotal + deliveryAmount) / 100) * Number(taxPercent)).toFixed(2)
  )

  return {
    subtotal,
    discountedSubtotal,
    discountAmount,
    taxationAmount,
    tipAmount: Number(tip) || 0,
    total: discountedSubtotal + deliveryAmount + taxationAmount + (Number(tip) || 0)
  }
}
