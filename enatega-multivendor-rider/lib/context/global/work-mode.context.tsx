import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { asyncStorageEmitter, setItem } from '@/lib/services/async-storage'
import { WORK_MODE } from '@/lib/utils/constants'

export type WorkMode = 'kitchen' | 'delivery' | null

type WorkModeContextValue = {
  workMode: WorkMode
  isWorkModeReady: boolean
  setWorkMode: (mode: Exclude<WorkMode, null>) => Promise<void>
  clearWorkMode: () => Promise<void>
}

const WorkModeContext = createContext<WorkModeContextValue>({
  workMode: null,
  isWorkModeReady: false,
  setWorkMode: async () => undefined,
  clearWorkMode: async () => undefined,
})

export function WorkModeProvider({ children }: { children: ReactNode }) {
  const [workMode, setWorkModeState] = useState<WorkMode>(null)
  const [isWorkModeReady, setIsWorkModeReady] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const stored = await AsyncStorage.getItem(WORK_MODE)
        if (mounted) {
          setWorkModeState(
            stored === 'kitchen' || stored === 'delivery' ? stored : null
          )
        }
      } finally {
        if (mounted) setIsWorkModeReady(true)
      }
    })()

    const onChange = (payload: { value?: string | null }) => {
      const value = payload?.value
      setWorkModeState(
        value === 'kitchen' || value === 'delivery' ? value : null
      )
    }
    asyncStorageEmitter.on(WORK_MODE, onChange)

    return () => {
      mounted = false
      asyncStorageEmitter.off(WORK_MODE, onChange)
    }
  }, [])

  const setWorkMode = useCallback(async (mode: Exclude<WorkMode, null>) => {
    await setItem(WORK_MODE, mode)
    setWorkModeState(mode)
  }, [])

  const clearWorkMode = useCallback(async () => {
    await AsyncStorage.removeItem(WORK_MODE)
    asyncStorageEmitter.emit(WORK_MODE, { key: WORK_MODE, value: null })
    setWorkModeState(null)
  }, [])

  const value = useMemo(
    () => ({ workMode, isWorkModeReady, setWorkMode, clearWorkMode }),
    [workMode, isWorkModeReady, setWorkMode, clearWorkMode]
  )

  return (
    <WorkModeContext.Provider value={value}>{children}</WorkModeContext.Provider>
  )
}

export const useWorkMode = () => useContext(WorkModeContext)
