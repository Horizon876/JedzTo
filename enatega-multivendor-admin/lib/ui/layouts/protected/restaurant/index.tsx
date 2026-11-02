'use client'

import { PanelShell } from '@/lib/ui/screen-components/protected/layout/shared'
import { RESTAURANT_MODULES } from '@/lib/utils/constants/panel-nav'
import { IProvider } from '@/lib/utils/interfaces'

const RestaurantLayout = ({ children }: IProvider) => {
  return (
    <PanelShell
      role="restaurant"
      modules={RESTAURANT_MODULES}
      brandFallback="Restauracja"
    >
      {children}
    </PanelShell>
  )
}

export default RestaurantLayout
