import { IExtendedOrder } from '@/lib/utils/interfaces'
import { formatDateTime } from '@/lib/utils/methods'
import { useTranslations } from 'next-intl'

export const ORDER_COLUMNS = () => {
  const t = useTranslations()
  return [
    {
      headerName: t('Order ID'),
      propertyName: 'orderId',
    },
    {
      propertyName: 'itemsTitle',
      headerName: t('Items'),
    },
    {
      headerName: t('Payment'),
      propertyName: 'paymentMethod',
    },
    {
      headerName: t('Order Status'),
      propertyName: 'orderStatus',
    },
    {
      headerName: t('Created At'),
      propertyName: 'DateCreated',
      body: (rowData: IExtendedOrder) => (
        <span>{formatDateTime(rowData?.createdAt)}</span>
      ),
    },
    {
      headerName: t('Delivery Address'),
      propertyName: 'OrderdeliveryAddress',
    },
  ]
}
