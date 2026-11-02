import { IExtendedOrder } from '@/lib/utils/interfaces';
import { formatDateTime } from '@/lib/utils/methods';
import { useTranslations } from 'next-intl';
import { useMutation } from '@apollo/client';
import { REFUND_ORDER } from '@/lib/api/graphql/mutations/settlements';
import useToast from '@/lib/hooks/useToast';
import { Button } from 'primereact/button';

export const ORDER_SUPER_ADMIN_COLUMNS = () => {
  const t = useTranslations();

  const RefundCell = ({ order }: { order: IExtendedOrder }) => {
    const { showToast } = useToast();
    const [refund, { loading }] = useMutation(REFUND_ORDER, {
      refetchQueries: ['AllOrdersPaginated', 'allOrdersPaginated'],
      onCompleted: () => showToast({ type: 'success', title: 'Sukces', message: 'Zwrot został wykonany.' }),
      onError: (error) => showToast({ type: 'error', title: 'Błąd', message: error.message }),
    });
    const method = String(order.paymentMethod || '').toUpperCase();
    const paid = String(order.paymentStatus || '').toUpperCase() === 'PAID';
    const refunded =
      String(order.paymentStatus || '').toUpperCase() === 'REFUNDED';
    if (method === 'COD' || !paid || refunded) {
      return (
        <span className="text-xs text-gray-400">
          {refunded ? t('Settled') : '—'}
        </span>
      );
    }
    return (
      <Button
        label={t('RefundOrder')}
        size="small"
        severity="danger"
        loading={loading}
        onClick={() =>
          refund({ variables: { orderId: order._id } })
        }
      />
    );
  };

  return [
    {
      headerName: t('Order ID'),
      propertyName: 'orderId',
    },
    {
      headerName: t('Items'),
      propertyName: 'items',
      body: (rowData: IExtendedOrder) => {
        if (rowData.items && rowData.items.length > 0) {
          return <span>{rowData.items.length} items</span>;
        }
        return <span>No items</span>;
      },
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
      propertyName: 'createdAt',
      body: (rowData: IExtendedOrder) => (
        <span className="text-center">{formatDateTime(rowData?.createdAt)}</span>
      ),
    },
    {
      headerName: t('Restaurant'),
      propertyName: 'restaurant.name',
      body: (rowData: IExtendedOrder) => rowData.restaurant?.name || 'N/A',
    },
    {
      headerName: t('Delivery Address'),
      propertyName: 'deliveryAddress.deliveryAddress',
      body: (rowData: IExtendedOrder) =>
        rowData.deliveryAddress?.deliveryAddress || 'N/A',
    },
    {
      headerName: t('RefundOrder'),
      propertyName: '_id',
      body: (rowData: IExtendedOrder) => <RefundCell order={rowData} />,
    },
  ];
};
