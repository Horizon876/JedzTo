import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { APP_ROLE, type AppRole } from '@/lib/utils/app-role'

/** Locked at build time via EXPO_PUBLIC_APP_ROLE (kitchen | delivery). */
export type WorkMode = AppRole

type WorkModeContextValue = {
  workMode: WorkMode
  isWorkModeReady: boolean
}

const WorkModeContext = createContext<WorkModeContextValue>({
  workMode: APP_ROLE,
  isWorkModeReady: true,
})

export function WorkModeProvider({ children }: { children: ReactNode }) {
  const value = useMemo(
    () => ({
      workMode: APP_ROLE,
      isWorkModeReady: true,
    }),
    []
  )

  return (
    <WorkModeContext.Provider value={value}>{children}</WorkModeContext.Provider>
  )
}

export const useWorkMode = () => useContext(WorkModeContext)
