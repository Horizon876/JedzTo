import { PageHeader } from '@/lib/ui/screen-components/protected/layout/shared'
import { useTranslations } from 'next-intl'

const TimingHeader = () => {
  const t = useTranslations()
  return <PageHeader title={t('Timing')} />
}

export default TimingHeader
