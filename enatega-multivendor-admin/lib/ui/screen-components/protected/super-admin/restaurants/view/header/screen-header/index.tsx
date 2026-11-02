'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/lib/ui/screen-components/protected/layout/shared'

export default function RestaurantsScreenHeader() {
  const t = useTranslations()
  const router = useRouter()

  return (
    <PageHeader
      title={t('Stores')}
      addLabel={t('Add Store')}
      onAdd={() => router.push('/general/stores/add')}
    />
  )
}
