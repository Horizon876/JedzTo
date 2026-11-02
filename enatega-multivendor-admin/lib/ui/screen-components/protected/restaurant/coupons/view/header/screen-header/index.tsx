import { ICouponRestaurantHeaderProps } from '@/lib/utils/interfaces/coupons-restaurant.interface'
import { PageHeader } from '@/lib/ui/screen-components/protected/layout/shared'
import { useTranslations } from 'next-intl'

const CouponsHeader = ({
  setIsAddCouponVisible,
}: ICouponRestaurantHeaderProps) => {
  const t = useTranslations()
  return (
    <PageHeader
      title={t('Coupons')}
      addLabel={t('Add Coupon')}
      onAdd={() => setIsAddCouponVisible(true)}
    />
  )
}

export default CouponsHeader
