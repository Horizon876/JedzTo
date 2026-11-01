export const formatNumber = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumberWithCurrency = (
  amount: number,
  currency: string = 'PLN',
  locale: string = 'pl-PL'
) => {
  const _currency =
    !currency || currency === 'USD' || currency === '$' ? 'PLN' : currency;
  const _locale = _currency === 'PLN' ? 'pl-PL' : locale || 'pl-PL';

  return new Intl.NumberFormat(_locale, {
    style: 'currency',
    currency: _currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
