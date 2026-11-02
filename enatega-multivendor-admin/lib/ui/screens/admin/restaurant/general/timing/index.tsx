'use client'

import TimingAddForm from '@/lib/ui/screen-components/protected/restaurant/timing/add-form'
import TimingHeader from '@/lib/ui/screen-components/protected/restaurant/timing/view/header'

const TimingScreen = () => {
  return (
    <div className="screen-container">
      <TimingHeader />
      <p className="mb-4 mt-0 text-sm text-[var(--panel-muted)]">
        Ustaw standardowe godziny otwarcia. Na święta i wyjątkowe zamknięcia użyj
        zakładki Zamknięcia.
      </p>
      <TimingAddForm />
    </div>
  )
}

export default TimingScreen
