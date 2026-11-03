'use client'

import { Form, Formik, FormikHelpers } from 'formik'
import { Sidebar } from 'primereact/sidebar'
import { Dialog } from 'primereact/dialog'
import { useMutation, useQuery } from '@apollo/client'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import * as Yup from 'yup'

import CustomButton from '@/lib/ui/useable-components/button'
import CustomDropdownComponent from '@/lib/ui/useable-components/custom-dropdown'
import CustomTextField from '@/lib/ui/useable-components/input-field'
import CustomPasswordTextField from '@/lib/ui/useable-components/password-input-field'
import useToast from '@/lib/hooks/useToast'
import { CREATE_RIDER, GET_RESTAURANTS_DROPDOWN } from '@/lib/api/graphql'
import { IRidersAddFormComponentProps } from '@/lib/utils/interfaces'

type FormValues = {
  firstName: string
  lastName: string
  login: string
  password: string
  restaurant: { label: string; code: string } | null
}

type CreatedCreds = {
  login: string
  password: string
  name: string
  restaurantName: string
}

const schema = Yup.object({
  firstName: Yup.string().trim().required('Required').min(2),
  lastName: Yup.string().trim().required('Required').min(2),
  login: Yup.string()
    .trim()
    .required('Required')
    .matches(/^[a-zA-Z0-9._-]{3,32}$/, 'Login: 3–32 znaki (litery, cyfry, . _ -)'),
  password: Yup.string().required('Required').min(6),
  restaurant: Yup.object().nullable().required('Required'),
})

export default function RiderAddForm({
  onHide,
  position = 'right',
  isAddRiderVisible,
}: IRidersAddFormComponentProps) {
  const t = useTranslations()
  const { showToast } = useToast()
  const [created, setCreated] = useState<CreatedCreds | null>(null)

  const { data: restaurantsData } = useQuery(GET_RESTAURANTS_DROPDOWN, {
    fetchPolicy: 'cache-and-network',
  })

  const restaurantOptions = (restaurantsData?.restaurants || []).map(
    (r: { _id: string; name: string }) => ({
      label: r.name,
      code: r._id,
    })
  )

  const [createRider, { loading }] = useMutation(CREATE_RIDER, {
    refetchQueries: 'active',
    awaitRefetchQueries: true,
  })

  const initialValues: FormValues = {
    firstName: '',
    lastName: '',
    login: '',
    password: '',
    restaurant: null,
  }

  const handleSubmit = async (
    values: FormValues,
    { resetForm }: FormikHelpers<FormValues>
  ) => {
    try {
      const name = `${values.firstName.trim()} ${values.lastName.trim()}`.trim()
      const password = values.password
      const result = await createRider({
        variables: {
          name,
          login: values.login.trim().toLowerCase(),
          password,
          restaurantId: values.restaurant?.code,
        },
      })
      const payload = result.data?.createRider
      showToast({
        type: 'success',
        title: t('Success'),
        message: t('Rider added'),
        duration: 3000,
      })
      resetForm()
      onHide()
      if (payload?.login) {
        setCreated({
          login: payload.login,
          password,
          name: payload.name || name,
          restaurantName: payload.restaurantName || values.restaurant?.label || '',
        })
      }
    } catch (error: unknown) {
      const message =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any)?.graphQLErrors?.[0]?.message || t('ActionFailedTryAgain')
      showToast({
        type: 'error',
        title: t('Error'),
        message,
        duration: 3000,
      })
    }
  }

  return (
    <>
      <Sidebar
        visible={isAddRiderVisible}
        position={position}
        onHide={onHide}
        className="w-full border sm:w-[450px]"
      >
        <div className="flex h-full w-full flex-col gap-2">
          <div className="mb-2 flex flex-col">
            <span className="text-lg font-semibold">
              {t('Add')} {t('Rider')}
            </span>
            <p className="m-0 mt-1 text-sm text-[var(--panel-muted)]">
              Login i hasło służą do aplikacji kierowcy.
            </p>
          </div>

          <Formik
            initialValues={initialValues}
            validationSchema={schema}
            onSubmit={handleSubmit}
            validateOnChange={false}
            validateOnBlur={false}
          >
            {({ values, errors, handleChange, handleSubmit, setFieldValue }) => (
              <Form onSubmit={handleSubmit} className="space-y-4">
                <CustomTextField
                  type="text"
                  name="firstName"
                  placeholder={t('FirstName')}
                  maxLength={40}
                  value={values.firstName}
                  onChange={handleChange}
                  showLabel
                  style={{ borderColor: errors.firstName ? 'red' : '' }}
                />
                <CustomTextField
                  type="text"
                  name="lastName"
                  placeholder={t('LastName')}
                  maxLength={40}
                  value={values.lastName}
                  onChange={handleChange}
                  showLabel
                  style={{ borderColor: errors.lastName ? 'red' : '' }}
                />
                <CustomTextField
                  type="text"
                  name="login"
                  placeholder={t('Login')}
                  maxLength={32}
                  value={values.login}
                  onChange={handleChange}
                  showLabel
                  style={{ borderColor: errors.login ? 'red' : '' }}
                />
                <CustomPasswordTextField
                  name="password"
                  placeholder={t('Password')}
                  value={values.password}
                  onChange={handleChange}
                  showLabel
                  style={{ borderColor: errors.password ? 'red' : '' }}
                />
                <CustomDropdownComponent
                  name="restaurant"
                  placeholder={t('Restaurant')}
                  options={restaurantOptions}
                  selectedItem={values.restaurant}
                  setSelectedItem={(_key, item) =>
                    setFieldValue('restaurant', item)
                  }
                  showLabel
                  filter
                  style={{ borderColor: errors.restaurant ? 'red' : '' }}
                />

                <CustomButton
                  className="mt-4 h-11 w-full bg-[var(--primary-color)] text-white"
                  label={loading ? t('Loading') : `${t('Add')} ${t('Rider')}`}
                  type="submit"
                  loading={loading}
                />
              </Form>
            )}
          </Formik>
        </div>
      </Sidebar>

      <Dialog
        header={t('RiderLoginCredentials')}
        visible={!!created}
        onHide={() => setCreated(null)}
        style={{ width: '90vw', maxWidth: '440px' }}
        modal
        draggable={false}
      >
        {created ? (
          <div className="space-y-3 text-sm">
            <p className="m-0 text-[var(--panel-muted)]">
              Przekaż te dane kierowcy — logują do aplikacji kierowcy.
            </p>
            <div>
              <div className="font-semibold">{t('Name')}</div>
              <div className="font-mono">{created.name}</div>
            </div>
            <div>
              <div className="font-semibold">{t('Restaurant')}</div>
              <div>{created.restaurantName}</div>
            </div>
            <div>
              <div className="font-semibold">{t('Login')}</div>
              <div className="font-mono">{created.login}</div>
            </div>
            <div>
              <div className="font-semibold">{t('Password')}</div>
              <div className="font-mono">{created.password}</div>
            </div>
            <CustomButton
              className="mt-2 h-10 w-full bg-[var(--primary-color)] text-white"
              label={t('OK')}
              onClick={() => setCreated(null)}
            />
          </div>
        ) : null}
      </Dialog>
    </>
  )
}
