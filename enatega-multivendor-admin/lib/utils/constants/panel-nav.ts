/**
 * Restaumatic-style navigation for restaurant + super-admin panels.
 * Top modules drive the horizontal bar; sidebar groups change with the active module.
 */

export type PanelRole = 'restaurant' | 'super-admin'

export interface PanelNavLink {
  labelKey: string
  route: string
  /** Match prefixes for active state (defaults to route). */
  match?: string[]
}

export interface PanelSideGroup {
  titleKey: string
  items: PanelNavLink[]
}

export interface PanelModule {
  id: string
  labelKey: string
  /** Default landing when clicking the top module. */
  route: string
  match: string[]
  groups: PanelSideGroup[]
}

/** Lean restaurant owner shell — turnover, orders, menu, hours/closures. */
export const RESTAURANT_MODULES: PanelModule[] = [
  {
    id: 'dashboard',
    labelKey: 'Dashboard',
    route: '/admin/store/dashboard',
    match: ['/admin/store/dashboard'],
    groups: [
      {
        titleKey: 'NavGroupRestaurant',
        items: [{ labelKey: 'Dashboard', route: '/admin/store/dashboard' }],
      },
    ],
  },
  {
    id: 'orders',
    labelKey: 'Orders',
    route: '/admin/store/orders',
    match: ['/admin/store/orders'],
    groups: [
      {
        titleKey: 'NavGroupOrders',
        items: [{ labelKey: 'OrderHistory', route: '/admin/store/orders' }],
      },
    ],
  },
  {
    id: 'menu',
    labelKey: 'Menu',
    route: '/admin/store/product-management/food',
    match: ['/admin/store/product-management'],
    groups: [
      {
        titleKey: 'NavGroupProducts',
        items: [
          { labelKey: 'Products', route: '/admin/store/product-management/food' },
          {
            labelKey: 'Categories',
            route: '/admin/store/product-management/category',
          },
        ],
      },
    ],
  },
  {
    id: 'hours',
    labelKey: 'HoursAndClosures',
    route: '/admin/store/general/timing',
    match: ['/admin/store/general/timing', '/admin/store/general/holidays'],
    groups: [
      {
        titleKey: 'NavGroupHours',
        items: [
          { labelKey: 'Timing', route: '/admin/store/general/timing' },
          { labelKey: 'Closures', route: '/admin/store/general/holidays' },
        ],
      },
    ],
  },
]

/** Lean super-admin shell — ops only, no marketing/catalog clutter. */
export const SUPER_ADMIN_MODULES: PanelModule[] = [
  {
    id: 'home',
    labelKey: 'Home',
    route: '/home',
    match: ['/home'],
    groups: [
      {
        titleKey: 'NavGroupOverview',
        items: [{ labelKey: 'Home', route: '/home' }],
      },
    ],
  },
  {
    id: 'restaurants',
    labelKey: 'Restaurants',
    route: '/general/stores',
    match: ['/general/stores', '/general/riders'],
    groups: [
      {
        titleKey: 'NavGroupRestaurants',
        items: [
          { labelKey: 'Restaurants', route: '/general/stores' },
          { labelKey: 'Riders', route: '/general/riders' },
        ],
      },
    ],
  },
  {
    id: 'orders',
    labelKey: 'Orders',
    route: '/management/orders',
    match: ['/management/orders', '/dispatch'],
    groups: [
      {
        titleKey: 'NavGroupOrders',
        items: [
          { labelKey: 'OrderHistory', route: '/management/orders' },
          { labelKey: 'Dispatch', route: '/dispatch' },
        ],
      },
    ],
  },
  {
    id: 'customers',
    labelKey: 'Users',
    route: '/general/users',
    match: ['/general/users'],
    groups: [
      {
        titleKey: 'NavGroupCustomers',
        items: [{ labelKey: 'Users', route: '/general/users' }],
      },
    ],
  },
  {
    id: 'finance',
    labelKey: 'Finance',
    route: '/wallet/settlements',
    match: ['/wallet/settlements'],
    groups: [
      {
        titleKey: 'NavGroupFinance',
        items: [{ labelKey: 'Settlements', route: '/wallet/settlements' }],
      },
    ],
  },
]

export function resolveActiveModule(
  modules: PanelModule[],
  pathname: string
): PanelModule {
  const normalized = pathname || ''
  const scored = modules
    .map((mod) => {
      const hit = mod.match.find(
        (m) => normalized === m || normalized.startsWith(`${m}/`) || normalized.startsWith(m)
      )
      return { mod, len: hit ? hit.length : -1 }
    })
    .filter((x) => x.len >= 0)
    .sort((a, b) => b.len - a.len)
  return scored[0]?.mod ?? modules[0]
}

export function isNavLinkActive(pathname: string, link: PanelNavLink): boolean {
  const keys = link.match?.length ? link.match : [link.route]
  return keys.some(
    (m) => pathname === m || pathname.startsWith(`${m}/`) || pathname.startsWith(m)
  )
}
