'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  isNavLinkActive,
  PanelModule,
} from '@/lib/utils/constants/panel-nav'

interface PanelSideNavProps {
  module: PanelModule
}

export default function PanelSideNav({ module }: PanelSideNavProps) {
  const t = useTranslations()
  const pathname = usePathname() || ''

  return (
    <aside className="panel-sidenav">
      <nav className="panel-sidenav-inner">
        {module.groups.map((group) => (
          <div key={group.titleKey} className="panel-sidenav-group">
            <div className="panel-sidenav-group-title">
              {t(group.titleKey)}
            </div>
            <ul className="panel-sidenav-list">
              {group.items.map((item) => {
                const active = isNavLinkActive(pathname, item)
                return (
                  <li key={item.route}>
                    <Link
                      href={item.route}
                      className={`panel-sidenav-link ${active ? 'is-active' : ''}`}
                    >
                      {t(item.labelKey)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
