/* eslint-disable @typescript-eslint/no-require-imports */
import { useContext, useEffect, useRef, useState, createContext } from 'react'
import { useAudioPlayer, AudioSource } from 'expo-audio'

import {
  ISoundContext,
  ISoundContextProviderProps,
} from '@/lib/utils/interfaces'
import { useUserContext } from './user.context'
import { useWorkMode } from './work-mode.context'
import { IOrder } from '@/lib/utils/interfaces/order.interface'

const SoundContext = createContext<ISoundContext>({} as ISoundContext)

export const SoundProvider = ({ children }: ISoundContextProviderProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const playingRef = useRef(false)

  const { assignedOrders } = useUserContext()
  const { workMode } = useWorkMode()
  const player = useAudioPlayer(
    require('@/lib/assets/sound/beep3.mp3') as AudioSource
  )

  const playSound = async () => {
    try {
      player.loop = true
      if (!playingRef.current) {
        player.play()
        playingRef.current = true
        setIsPlaying(true)
      }
    } catch (err) {
      console.log('Error playing sound:', err)
    }
  }

  const stopSound = async () => {
    try {
      if (playingRef.current) {
        player.pause()
        playingRef.current = false
        setIsPlaying(false)
      }
    } catch (err) {
      console.log('Error stopping sound:', err)
    }
  }

  useEffect(() => {
    const playingSubscription = player.addListener(
      'playingChange',
      ({ playing }: { playing: boolean }) => {
        playingRef.current = playing
        setIsPlaying(playing)
      }
    )

    return () => {
      playingSubscription?.remove()
    }
  }, [player])

  useEffect(() => {
    // Sound only for kitchen while a PENDING order waits for accept/reject.
    // Delivery mode stays silent.
    const hasPending =
      workMode === 'kitchen' &&
      Boolean(assignedOrders?.some((o: IOrder) => o.orderStatus === 'PENDING'))

    if (hasPending) {
      void playSound()
    } else {
      void stopSound()
    }
    // Depend on a stable signature so list refreshes don't restart audio.
  }, [
    workMode,
    assignedOrders
      ?.filter((o: IOrder) => o.orderStatus === 'PENDING')
      .map((o: IOrder) => o._id)
      .join(',') ?? '',
  ])

  useEffect(() => {
    return () => {
      try {
        player.pause()
      } catch {
        // ignore
      }
    }
  }, [player])

  return (
    <SoundContext.Provider value={{ playSound, stopSound }}>
      {children}
    </SoundContext.Provider>
  )
}

export const SoundContextConsumer = SoundContext.Consumer
export const useSoundContext = () => useContext(SoundContext)
export default SoundContext
