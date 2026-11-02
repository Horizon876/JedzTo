'use client'

import { useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import PanelTopBar from './panel-top-bar'
import PanelSideNav from './panel-side-nav'
import {
  PanelModule,
  PanelRole,
  resolveActiveModule,
} from '@/lib/utils/constants/panel-nav'

interface PanelShellProps {
  role: PanelRole
  modules: PanelModule[]
  brandFallback: string
  children: React.ReactNode
}

export default function PanelShell({
  role,
  modules,
  brandFallback,
  children,
}: PanelShellProps) {
  const pathname = usePathname() || ''
  const { setTheme } = useTheme()
  const activeModule = useMemo(
    () => resolveActiveModule(modules, pathname),
    [modules, pathname]
  )

  useEffect(() => {
    setTheme('light')
  }, [setTheme])

  return (
    <div className="panel-shell">
      <PanelTopBar
        role={role}
        modules={modules}
        brandFallback={brandFallback}
      />
      <div className="panel-body">
        <PanelSideNav module={activeModule} />
        <main className="panel-content">{children}</main>
      </div>
    </div>
  )
}
