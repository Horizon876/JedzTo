import { ICouponScreenHeaderProps } from '@/lib/utils/interfaces/coupons.interface'
import { PageHeader } from '@/lib/ui/screen-components/protected/layout/shared'
import { useTranslations } from 'next-intl'

export default function CouponScreenHeader({
  handleButtonClick,
}: ICouponScreenHeaderProps) {
  const t = useTranslations()
  return (
    <PageHeader
      title={t('Coupons')}
      addLabel={t('Add Coupon')}
      onAdd={handleButtonClick}
    />
  )
}
