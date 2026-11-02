import { PageHeader } from '@/lib/ui/screen-components/protected/layout/shared'
import { useTranslations } from 'next-intl'

const OrdersSuperAdminHeader = () => {
  const t = useTranslations()
  return <PageHeader title={t('Orders')} />
}

export default OrdersSuperAdminHeader
