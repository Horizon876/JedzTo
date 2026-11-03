'use client'

import { useContext } from 'react'
import { useQuery } from '@apollo/client'
import { useTranslations } from 'next-intl'
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context'
import { GET_RIDERS } from '@/lib/api/graphql/queries/riders'
import { PageHeader } from '@/lib/ui/screen-components/protected/layout/shared'

type RiderRow = {
  _id: string
  name: string
  username: string
  available: boolean
  restaurantName?: string
}

export default function RestaurantRidersScreen() {
  const t = useTranslations()
  const {
    restaurantLayoutContextData: { restaurantId },
  } = useContext(RestaurantLayoutContext)

  const { data, loading } = useQuery(GET_RIDERS, {
    variables: { restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network',
  })

  const riders: RiderRow[] = data?.riders || []

  return (
    <div className="screen-container">
      <PageHeader title={t('Riders')} />
      <p className="mb-5 mt-0 max-w-2xl text-sm leading-relaxed text-[var(--panel-muted)]">
        {t('RestaurantRidersHint')}
      </p>

      {loading ? (
        <p className="text-[var(--panel-muted)]">{t('Loading')}…</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-white">
          <div className="grid grid-cols-[1.4fr_1fr_0.8fr] gap-3 border-b border-[var(--panel-border)] bg-[#F8FAFC] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--panel-muted)]">
            <div>{t('Name')}</div>
            <div>{t('Login')}</div>
            <div>{t('Available')}</div>
          </div>
          {riders.map((r) => (
            <div
              key={r._id}
              className="grid grid-cols-[1.4fr_1fr_0.8fr] gap-3 border-b border-[var(--panel-border)] px-4 py-3 last:border-b-0"
            >
              <div className="font-semibold text-[var(--panel-text)]">
                {r.name}
              </div>
              <div className="font-mono text-sm text-[var(--panel-text)]">
                {r.username}
              </div>
              <div>
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    r.available
                      ? 'bg-[#DCFCE7] text-[#15803D]'
                      : 'bg-[#FEE2E2] text-[#B91C1C]'
                  }`}
                >
                  {r.available ? t('Available') : t('Unavailable')}
                </span>
              </div>
            </div>
          ))}
          {!riders.length ? (
            <p className="p-5 text-[var(--panel-muted)]">
              {t('NoRidersAssigned')}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
