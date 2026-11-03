'use client'

import { useContext, useState } from 'react'
import ActionMenu from '@/lib/ui/useable-components/action-menu'
import CustomInputSwitch from '../../custom-input-switch'
import { IActionMenuProps } from '@/lib/utils/interfaces/action-menu.interface'
import { IRiderResponse } from '@/lib/utils/interfaces/rider.interface'
import { TOGGLE_RIDER } from '@/lib/api/graphql'
import { useMutation } from '@apollo/client'
import { ToastContext } from '@/lib/context/global/toast.context'
import { useTranslations } from 'next-intl'

export const RIDER_TABLE_COLUMNS = ({
  menuItems,
}: {
  menuItems: IActionMenuProps<IRiderResponse>['items']
}) => {
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRider, setSelectedRider] = useState<{
    id: string
    isActive: boolean
  }>({ id: '', isActive: false })

  const { showToast } = useContext(ToastContext)

  const [mutateToggle, { loading }] = useMutation(TOGGLE_RIDER, {
    refetchQueries: 'active',
    awaitRefetchQueries: true,
    onCompleted: () => {
      setIsLoading(false)
      showToast({
        type: 'success',
        title: t('Success'),
        message: t('Status Changed Successfully'),
      })
    },
    onError: () => {
      setIsLoading(false)
      showToast({
        type: 'error',
        title: t('Error'),
        message: t('Status Change Failed'),
      })
    },
  })

  const onToggle = async (isActive: boolean, id: string) => {
    try {
      setIsLoading(true)
      setSelectedRider({ id, isActive })
      await mutateToggle({ variables: { id } })
    } catch {
      showToast({
        type: 'error',
        title: t('Error'),
        message: t('Something went wrong'),
      })
    } finally {
      setSelectedRider({ id: '', isActive: false })
      setIsLoading(false)
    }
  }

  return [
    { headerName: t('Name'), propertyName: 'name' },
    { headerName: t('Login'), propertyName: 'username' },
    {
      headerName: t('Restaurant'),
      propertyName: 'restaurantName',
      body: (rider: IRiderResponse & { restaurantName?: string }) =>
        rider.restaurantName || '—',
    },
    {
      headerName: t('Available'),
      propertyName: 'available',
      body: (rider: IRiderResponse) => (
        <CustomInputSwitch
          loading={rider._id === selectedRider.id && (loading || isLoading)}
          isActive={rider.available}
          onChange={async () => {
            if (loading || isLoading) return
            await onToggle(!rider.available, rider._id)
          }}
        />
      ),
    },
    {
      propertyName: 'actions',
      body: (rider: IRiderResponse) => (
        <ActionMenu items={menuItems} data={rider} />
      ),
    },
  ]
}
