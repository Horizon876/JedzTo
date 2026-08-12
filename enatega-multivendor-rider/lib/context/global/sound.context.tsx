/* eslint-disable @typescript-eslint/no-require-imports */
import { useContext, useEffect, useRef, createContext } from 'react'
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'

import {
  ISoundContext,
  ISoundContextProviderProps,
} from '@/lib/utils/interfaces'
import { useUserContext } from './user.context'
import { useWorkMode } from './work-mode.context'
import { IOrder } from '@/lib/utils/interfaces/order.interface'

const SoundContext = createContext<ISoundContext>({} as ISoundContext)

async function configureKitchenAudio() {
  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'duckOthers',
    // Kitchen tablets must use the loudspeaker, not the earpiece.
    shouldRouteThroughEarpiece: false,
  })
}

export const SoundProvider = ({ children }: ISoundContextProviderProps) => {
  const soundRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null)
  const { assignedOrders } = useUserContext()
  const { workMode } = useWorkMode()

  const pendingSignature =
    assignedOrders
      ?.filter((o: IOrder) => o.orderStatus === 'PENDING')
      .map((o: IOrder) => o._id)
      .join(',') ?? ''

  const hasPendingKitchenOrders =
    workMode === 'kitchen' && pendingSignature.length > 0

  const stopSound = async () => {
    const player = soundRef.current
    soundRef.current = null
    if (!player) return

    try {
      player.loop = false
    } catch {
      // ignore
    }
    try {
      player.pause()
    } catch {
      // ignore
    }
    try {
      await player.seekTo(0)
    } catch {
      // ignore
    }
    try {
      player.remove()
    } catch {
      // ignore
    }
  }

  const playSound = async () => {
    try {
      await stopSound()
      await configureKitchenAudio()

      const player = createAudioPlayer(
        require('@/lib/assets/sound/beep3.mp3')
      )
      player.loop = true
      player.volume = 1
      player.play()
      soundRef.current = player
    } catch (err) {
      console.log('Kitchen ring failed:', err)
    }
  }

  useEffect(() => {
    // Sound only for kitchen while a PENDING order waits for accept/reject.
    if (hasPendingKitchenOrders) {
      void playSound()
    } else {
      void stopSound()
    }

    return () => {
      void stopSound()
    }
  }, [workMode, pendingSignature, hasPendingKitchenOrders])

  return (
    <SoundContext.Provider value={{ playSound, stopSound }}>
      {children}
    </SoundContext.Provider>
  )
}

export const SoundContextConsumer = SoundContext.Consumer
export const useSoundContext = () => useContext(SoundContext)
export default SoundContext
