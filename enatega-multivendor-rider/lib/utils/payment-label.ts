/** Human-readable payment copy for kitchen / delivery screens. */
export function getPaymentLabel(
  paymentMethod?: string | null,
  paymentStatus?: string | null,
  t: (key: string) => string = (k) => k
) {
  const method = String(paymentMethod || '').toUpperCase()
  const status = String(paymentStatus || '').toUpperCase()

  if (method === 'COD') {
    return {
      label: t('Cash payment'),
      needsCash: true,
      hint: t('Collect cash from customer'),
    }
  }

  if (status === 'PAID') {
    return {
      label: t('Paid online'),
      needsCash: false,
      hint: t('Already paid — do not collect cash'),
    }
  }

  return {
    label: t('Online payment'),
    needsCash: false,
    hint: t('Waiting for online payment'),
  }
}
