'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useApolloClient, useQuery } from '@apollo/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronDown,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons'
import { Menu } from 'primereact/menu'
import { useLocale, useTranslations } from 'next-intl'

import CustomDialog from '@/lib/ui/useable-components/delete-dialog'
import Image from '@/lib/ui/useable-components/safe-image'
import { useUserContext } from '@/lib/hooks/useUser'
import { GET_RESTAURANT_PROFILE } from '@/lib/api/graphql'
import { onUseLocalStorage } from '@/lib/utils/methods'
import { clearStoredSessionState } from '@/lib/utils/methods/auth'
import { clearMetricsData } from '@/lib/utils/methods/security'
import { languageTypes } from '@/lib/utils/constants'
import { setUserLocale } from '@/lib/utils/methods/locale'
import { TLocale } from '@/lib/utils/types/locale'
import {
  PanelModule,
  PanelRole,
  resolveActiveModule,
} from '@/lib/utils/constants/panel-nav'
import { IRestaurantByIdResponse } from '@/lib/utils/interfaces'

interface PanelTopBarProps {
  role: PanelRole
  modules: PanelModule[]
  brandFallback: string
}

export default function PanelTopBar({
  role,
  modules,
  brandFallback,
}: PanelTopBarProps) {
  const t = useTranslations()
  const router = useRouter()
  const pathname = usePathname() || ''
  const [, startTransition] = useTransition()
  const currentLocale = useLocale()
  const apolloClient = useApolloClient()
  const { user, setUser } = useUserContext()

  const restaurantId = onUseLocalStorage('get', 'restaurantId')
  const { data: restaurantData } = useQuery<
    IRestaurantByIdResponse | undefined,
    { id: string }
  >(GET_RESTAURANT_PROFILE, {
    variables: { id: restaurantId ?? '' },
    skip: role !== 'restaurant' || !restaurantId,
  })

  const menuRef = useRef<Menu>(null)
  const languageMenuRef = useRef<Menu>(null)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const activeModule = useMemo(
    () => resolveActiveModule(modules, pathname),
    [modules, pathname]
  )

  const brandName =
    role === 'restaurant'
      ? restaurantData?.restaurant?.name ||
        user?.name ||
        brandFallback
      : brandFallback

  useEffect(() => {
    document.title = brandName
  }, [brandName])

  const onConfirmLogout = async () => {
    setUser(null)
    clearStoredSessionState()
    clearMetricsData()
    await apolloClient.clearStore()
    router.replace('/authentication/login')
  }

  function onLocaleChange(value: string) {
    const locale = value as TLocale
    startTransition(() => {
      setUserLocale(locale)
    })
  }

  const languageModel = languageTypes.map((lang) => ({
    label: lang.value.toUpperCase(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    template(item: any) {
      return (
        <div
          className={`cursor-pointer p-2 hover:bg-[#2F6FED22] ${
            currentLocale === lang.code ? 'bg-[#2F6FED22]' : ''
          }`}
          onClick={() => onLocaleChange(lang.code)}
        >
          {item.label}
        </div>
      )
    },
    command: () => onLocaleChange(lang.code),
  }))

  return (
    <>
      <header className="panel-topbar">
        <div className="panel-topbar-brand" title={brandName}>
          {brandName}
        </div>

        <nav className="panel-topbar-modules">
          {modules.map((mod) => {
            const active = mod.id === activeModule.id
            return (
              <Link
                key={mod.id}
                href={mod.route}
                className={`panel-topbar-module ${active ? 'is-active' : ''}`}
              >
                {t(mod.labelKey)}
              </Link>
            )
          })}
        </nav>

        <div className="panel-topbar-actions">
          <button
            type="button"
            className="panel-topbar-icon-btn"
            onClick={(e) => languageMenuRef.current?.toggle(e)}
            title={t('Language')}
          >
            <FontAwesomeIcon icon={faGlobe} />
          </button>
          <Menu
            model={languageModel}
            popup
            ref={languageMenuRef}
            popupAlignment="right"
          />

          <button
            type="button"
            className="panel-topbar-user"
            onClick={(e) => menuRef.current?.toggle(e)}
          >
            <span className="panel-topbar-user-name">
              {user?.name || brandName}
            </span>
            <Image
              src={
                user?.image ||
                restaurantData?.restaurant?.image ||
                'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'
              }
              alt="profile"
              height={28}
              width={28}
              className="h-7 w-7 rounded-full object-cover"
            />
            <FontAwesomeIcon icon={faChevronDown} className="text-xs opacity-80" />
          </button>
          <Menu
            model={[
              {
                label: t('Logout'),
                command: () => setLogoutOpen(true),
              },
            ]}
            popup
            ref={menuRef}
            popupAlignment="right"
          />
        </div>
      </header>

      <CustomDialog
        title={t('Logout Confirmation')}
        message={t('Are you sure you want to logout?')}
        visible={logoutOpen}
        onHide={() => setLogoutOpen(false)}
        onConfirm={onConfirmLogout}
        loading={false}
        buttonConfig={{
          primaryButtonProp: { label: t('Yes'), icon: 'pi pi-check' },
          secondaryButtonProp: { label: t('Cancel'), icon: 'pi pi-times' },
        }}
      />
    </>
  )
}
