import { IExtendedOrder } from '@/lib/utils/interfaces';
import { useTranslations } from 'next-intl';
import { useMutation } from '@apollo/client';
import { REFUND_ORDER } from '@/lib/api/graphql/mutations/settlements';
import { Button } from 'primereact/button';

export const ORDER_SUPER_ADMIN_COLUMNS = () => {
  const t = useTranslations();

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  };

  const RefundCell = ({ order }: { order: IExtendedOrder }) => {
    const [refund, { loading }] = useMutation(REFUND_ORDER, {
      refetchQueries: ['AllOrdersPaginated', 'allOrdersPaginated'],
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
      body: (rowData: IExtendedOrder) => {
        let date: Date | null = null;
        if (rowData?.createdAt) {
          const createdAt = rowData.createdAt;
          if (typeof createdAt === 'number') {
            date = new Date(createdAt);
          } else if (typeof createdAt === 'string') {
            const numericTimestamp = Number(createdAt);
            if (!isNaN(numericTimestamp) && createdAt.trim().length >= 10) {
              date = new Date(numericTimestamp);
            } else if (!isNaN(Date.parse(createdAt))) {
              date = new Date(createdAt);
            }
          }
        }

        if (date) {
          const newDate = date.toLocaleDateString('en-US', dateOptions);
          return <span className="text-center">{newDate}</span>;
        }
        return <span>-</span>;
      },
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
