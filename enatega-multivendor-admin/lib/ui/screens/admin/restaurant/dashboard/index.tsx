'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import OrderStats from '@/lib/ui/screen-components/protected/restaurant/dashboard/order-stats'
import DashboardDateFilter from '@/lib/ui/useable-components/date-filter'
import RestaurantSalesReportCard from '@/lib/ui/screen-components/protected/restaurant/dashboard/sales-report'
import { PageHeader } from '@/lib/ui/screen-components/protected/layout/shared'
import { IDateFilter } from '@/lib/utils/interfaces'

export default function AdminRestaurantDashboard() {
  const t = useTranslations()
  const [dateFilter, setDateFilter] = useState<IDateFilter>({
    dateKeyword: 'All',
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()).padStart(2, '0')}`,
  })

  return (
    <div className="screen-container">
      <PageHeader title={t('Dashboard')} />
      <RestaurantSalesReportCard />
      <DashboardDateFilter
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
      />
      <OrderStats dateFilter={dateFilter} />
    </div>
  )
}
