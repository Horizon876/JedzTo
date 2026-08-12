'use client';

import { useState } from 'react';
// Core
import { Form, Formik } from 'formik';
import { useContext } from 'react';

// Interface and Types
import {
  ICreateRestaurantPayload,
  IGeneratedOwnerCredentials,
} from '@/lib/utils/interfaces';

// Component
import CustomButton from '@/lib/ui/useable-components/button';
import CustomTextField from '@/lib/ui/useable-components/input-field';
import OwnerCredentialsModal from './owner-credentials-modal';

// Constants
import {
  MAX_LANSDCAPE_FILE_SIZE,
  MAX_SQUARE_FILE_SIZE,
  RestaurantErrors,
} from '@/lib/utils/constants';

// Interface
import { IRestaurantForm } from '@/lib/utils/interfaces';

// Methods
import { onErrorMessageMatcher } from '@/lib/utils/methods/error';

// Schemas
import {
  CREATE_RESTAURANT,
  GET_RESTAURANTS,
} from '@/lib/api/graphql';
import { RestaurantsContext } from '@/lib/context/super-admin/restaurants.context';
import { ToastContext } from '@/lib/context/global/toast.context';
import CustomNumberField from '@/lib/ui/useable-components/number-input-field';
import CustomUploadImageComponent from '@/lib/ui/useable-components/upload/upload-image';
import { IRestaurantsAddRestaurantComponentProps } from '@/lib/utils/interfaces/restaurants.interface';
import { RestaurantSchema } from '@/lib/utils/schema/restaurant';
import {
  ApolloCache,
  ApolloError,
  useMutation,
  useQuery,
} from '@apollo/client';
import { useTranslations } from 'next-intl';

// PrimeReact AutoComplete for Mapbox address search
import { AutoComplete, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { faEye, faEyeSlash, faKey, faLock, faMapMarkerAlt, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Mapbox-backed autocomplete base URL (same server-side proxy as delivery-areas)
const MAPS_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:8001/'
).replace(/\/?$/, '/');

interface IPlaceSuggestion {
  placeId: string;
  description: string;
}

interface IRestaurantFormExtended extends IRestaurantForm {
  ownerName?: string;
  ownerLogin?: string;
  ownerPassword?: string;
  ownerPasswordConfirm?: string;
}

const initialValues: IRestaurantFormExtended = {
  name: '',
  address: '',
  commissionRate: 10,
  image:
    'https://t4.ftcdn.net/jpg/04/76/57/27/240_F_476572792_zMwqHpmGal1fzh0tDJ3onkLo88IjgNbL.jpg',
  logo: 'https://res.cloudinary.com/dc6xw0lzg/image/upload/v1735894342/dvi5fjbsgdlrzwip0whg.jpg',
  ownerName: '',
  ownerLogin: '',
  ownerPassword: '',
  ownerPasswordConfirm: '',
};

// Simple password strength indicator
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const labels = ['Bardzo słabe', 'Słabe', 'Średnie', 'Silne', 'Bardzo silne'];
  const colors = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500'];
  const label = labels[Math.min(strength, 4)];
  const color = colors[Math.min(strength, 4)];

  return (
    <div className="mt-1">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < strength ? color : 'bg-gray-200 dark:bg-dark-700'}`}
          />
        ))}
      </div>
      <p className={`mt-0.5 text-xs font-medium ${strength < 2 ? 'text-red-500' : strength < 4 ? 'text-yellow-600' : 'text-green-600'}`}>
        {label}
      </p>
    </div>
  );
}

export default function RestaurantDetailsForm({
  stepperProps,
}: IRestaurantsAddRestaurantComponentProps) {
  // Hooks
  // Hooks
  const t = useTranslations();
  const [ownerCredentials, setOwnerCredentials] =
    useState<IGeneratedOwnerCredentials | null>(null);
  const [isCredentialsModalVisible, setIsCredentialsModalVisible] =
    useState(false);

  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<IPlaceSuggestion[]>([]);
  const [addressQuery, setAddressQuery] = useState('');

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Props
  const { onStepChange, order } = stepperProps ?? {
    onStepChange: () => {},
    type: '',
    order: -1,
  };
  // Context
  const { showToast } = useContext(ToastContext);
  const { restaurantsContextData, onSetRestaurantsContextData } =
    useContext(RestaurantsContext);

  // API
  const { data: restaurantData } = useQuery(GET_RESTAURANTS);
  // Mutation
  const [createRestaurant] = useMutation(CREATE_RESTAURANT, {
    onError,
    onCompleted: ({
      createRestaurant,
    }: {
      createRestaurant?: ICreateRestaurantPayload;
    }) => {
      showToast({
        type: 'success',
        title: t('New Store'),
        message: t(`Store has been added successfully`),
        duration: 3000,
      });

      onSetRestaurantsContextData({
        ...restaurantsContextData,
        restaurant: {
          ...restaurantsContextData?.restaurant,
          _id: {
            label: createRestaurant?.restaurant?.username ?? '',
            code: createRestaurant?.restaurant?._id ?? '',
          },
        },
      });

      // Show credentials modal with the login + password the admin just set.
      if (createRestaurant?.owner) {
        setOwnerCredentials(createRestaurant.owner);
        setIsCredentialsModalVisible(true);
      }

      onStepChange(order + 1);
    },
    update: update,
  });



  // ── Mapbox Address Autocomplete ────────────────────────────────────────────

  const searchAddresses = async (event: AutoCompleteCompleteEvent) => {
    try {
      const response = await fetch(
        `${MAPS_BASE_URL}maps/autocomplete?input=${encodeURIComponent(event.query)}&language=pl`
      );
      const json = await response.json();
      setAddressSuggestions(json?.data?.predictions ?? []);
    } catch {
      setAddressSuggestions([]);
    }
  };

  const applyAddress = async (
    suggestion: IPlaceSuggestion,
    setFieldValue: (field: string, value: unknown) => void
  ) => {
    try {
      const response = await fetch(
        `${MAPS_BASE_URL}maps/place-details?placeId=${encodeURIComponent(suggestion.placeId)}`
      );
      const json = await response.json();
      const formatted = json?.data?.result?.formatted_address ?? suggestion.description;
      setFieldValue('address', formatted);
      setAddressQuery(formatted);
    } catch {
      // Fallback — use the description directly
      setFieldValue('address', suggestion.description);
      setAddressQuery(suggestion.description);
    }
  };

  // ── Form submission ────────────────────────────────────────────────────────

  const onCreateRestaurant = async (data: IRestaurantFormExtended) => {
    try {
      const ownerName = data.ownerName?.trim() ?? '';
      const ownerLogin = data.ownerLogin?.trim() ?? '';
      const ownerPassword = data.ownerPassword ?? '';
      const ownerPasswordConfirm = data.ownerPasswordConfirm ?? '';

      if (!ownerLogin) {
        showToast({
          type: 'error',
          title: t('Create Store'),
          message: t('Proszę podać login właściciela'),
          duration: 2500,
        });
        return;
      }
      if (ownerPassword.length < 6) {
        showToast({
          type: 'error',
          title: t('Create Store'),
          message: t('Hasło musi mieć co najmniej 6 znaków'),
          duration: 2500,
        });
        return;
      }
      if (ownerPassword !== ownerPasswordConfirm) {
        showToast({
          type: 'error',
          title: t('Create Store'),
          message: t('Hasła nie są zgodne'),
          duration: 2500,
        });
        return;
      }

      // check if values.name is present in restaurantData and show error toast
      const existingRestaurant = restaurantData?.restaurants.find(
        (restaurant: IRestaurantForm) =>
          restaurant.name.toLowerCase() === data.name.toLowerCase()
      );
      if (existingRestaurant) {
        showToast({
          type: 'error',
          title: `Restaurant Already Exists`,
          message: 'Restaurant with same name already exists',
          duration: 2500,
        });
        return;
      }

      await createRestaurant({
        variables: {
          ownerName,
          ownerLogin,
          ownerPassword,
          restaurant: {
            name: data.name,
            address: data.address,
            image: data.image,
            logo: data.logo,
            commissionRate: data.commissionRate,
          },
        },
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: t('New Store'),
        message: t('Store Creation Failed'),
        duration: 2500,
      });
    }
  };

  function onError({ graphQLErrors, networkError }: ApolloError) {
    showToast({
      type: 'error',
      title: t('New Store'),
      message:
        graphQLErrors[0]?.message ??
        networkError?.message ??
        t('Store Creation Failed'),
      duration: 2500,
    });
  }
  function update(
    cache: ApolloCache<unknown>,
    result: { data?: { createRestaurant?: ICreateRestaurantPayload } }
  ): void {
    const newRestaurant = result?.data?.createRestaurant?.restaurant;
    if (!newRestaurant) return;

    const cachedData: { restaurants?: unknown[] } | null = cache.readQuery({
      query: GET_RESTAURANTS,
    });

    const cachedRestaurants = cachedData?.restaurants ?? [];

    cache.writeQuery({
      query: GET_RESTAURANTS,
      data: {
        restaurants: [...cachedRestaurants, newRestaurant],
      },
    });
  }

  return (
    <div className="flex h-full w-full items-center justify-start dark:text-white dark:bg-dark-950">
      <div className="h-full w-full">
        <div className="flex flex-col gap-2">
          <div>
            <Formik
              initialValues={initialValues}
              validationSchema={RestaurantSchema}
              onSubmit={async (values) => {
                await onCreateRestaurant(values);
              }}
              validateOnChange={false}
            >
              {({
                touched,
                values,
                errors,
                handleChange,
                handleSubmit,
                isSubmitting,
                setFieldValue,
              }) => {
                return (
                  <Form onSubmit={handleSubmit}>
                    <div className="mb-3 space-y-3">

                      {/* ── Sekcja: Dane Właściciela ── */}
                      <div className="bg-gray-50 dark:bg-dark-900 border border-gray-100 dark:border-dark-700 rounded-xl p-4 mb-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <FontAwesomeIcon icon={faUser} className="text-blue-500" />
                          {t('Dane Właściciela')}
                        </h3>

                        {/* Imię właściciela */}
                        <div className="mb-3">
                          <CustomTextField
                            type="text"
                            name="ownerName"
                            placeholder={t('Imię i Nazwisko Właściciela')}
                            maxLength={70}
                            value={values.ownerName}
                            onChange={handleChange}
                            showLabel={true}
                            style={{
                              borderColor: onErrorMessageMatcher('ownerName', errors?.ownerName, RestaurantErrors) ? 'red' : '',
                            }}
                          />
                        </div>

                        {/* Login właściciela */}
                        <div className="mb-3">
                          <label className="mb-[4px] block text-[14px] font-medium text-[#09090B] dark:text-white">
                            <FontAwesomeIcon icon={faKey} className="mr-1.5 text-gray-400" />
                            {t('Login (nazwa użytkownika)')}
                          </label>
                          <div className="relative">
                            <CustomTextField
                              type="text"
                              name="ownerLogin"
                              placeholder={t('np. jan.kowalski lub restauracja_pizza')}
                              maxLength={50}
                              value={values.ownerLogin}
                              onChange={handleChange}
                              showLabel={false}
                              style={{
                                borderColor: onErrorMessageMatcher('ownerLogin', errors?.ownerLogin, RestaurantErrors) ? 'red' : '',
                              }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {t('Login służy do logowania w panelu właściciela i aplikacji kuchni. Tylko litery, cyfry i znaki: . _ -')}
                          </p>
                        </div>

                        {/* Hasło */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="mb-[4px] block text-[14px] font-medium text-[#09090B] dark:text-white">
                              <FontAwesomeIcon icon={faLock} className="mr-1.5 text-gray-400" />
                              {t('Hasło')}
                            </label>
                            <div className="relative">
                              <CustomTextField
                                type={showPassword ? 'text' : 'password'}
                                name="ownerPassword"
                                placeholder={t('Min. 6 znaków')}
                                maxLength={100}
                                value={values.ownerPassword}
                                onChange={handleChange}
                                showLabel={false}
                                style={{
                                  paddingRight: '2.5rem',
                                  borderColor: onErrorMessageMatcher('ownerPassword', errors?.ownerPassword, RestaurantErrors) ? 'red' : '',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                              >
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                              </button>
                            </div>
                            <PasswordStrength password={values.ownerPassword ?? ''} />
                          </div>

                          <div>
                            <label className="mb-[4px] block text-[14px] font-medium text-[#09090B] dark:text-white">
                              <FontAwesomeIcon icon={faLock} className="mr-1.5 text-gray-400" />
                              {t('Powtórz hasło')}
                            </label>
                            <div className="relative">
                              <CustomTextField
                                type={showPasswordConfirm ? 'text' : 'password'}
                                name="ownerPasswordConfirm"
                                placeholder={t('Powtórz hasło')}
                                maxLength={100}
                                value={values.ownerPasswordConfirm}
                                onChange={handleChange}
                                showLabel={false}
                                style={{
                                  paddingRight: '2.5rem',
                                  borderColor:
                                    values.ownerPasswordConfirm &&
                                    values.ownerPassword !== values.ownerPasswordConfirm
                                      ? 'red'
                                      : '',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswordConfirm((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                aria-label={showPasswordConfirm ? 'Ukryj hasło' : 'Pokaż hasło'}
                              >
                                <FontAwesomeIcon icon={showPasswordConfirm ? faEyeSlash : faEye} />
                              </button>
                            </div>
                            {values.ownerPasswordConfirm &&
                              values.ownerPassword !== values.ownerPasswordConfirm && (
                                <p className="mt-1 text-xs text-red-500">
                                  {t('Hasła nie są zgodne')}
                                </p>
                              )}
                          </div>
                        </div>
                      </div>

                      {/* ── Sekcja: Dane Restauracji ── */}
                      <h3 className="text-lg font-semibold mb-4 mt-6 text-gray-800 dark:text-gray-200">{t('Dane Restauracji')}</h3>

                      {/* Nazwa restauracji */}
                      <div>
                        <CustomTextField
                          type="text"
                          name="name"
                          placeholder={t('Name')}
                          maxLength={35}
                          value={values.name}
                          onChange={handleChange}
                          showLabel={true}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'name',
                              errors?.name,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>

                      {/* ── Adres z Mapbox Autocomplete ── */}
                      <div>
                        <label className="mb-[4px] block text-[14px] font-medium text-[#09090B] dark:text-white">
                          <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1.5 text-blue-400" />
                          {t('Address')}
                        </label>
                        <AutoComplete
                          value={addressQuery}
                          suggestions={addressSuggestions}
                          completeMethod={searchAddresses}
                          field="description"
                          onSelect={(e) => {
                            applyAddress(e.value as IPlaceSuggestion, setFieldValue);
                          }}
                          onChange={(e) => {
                            setAddressQuery(e.value as string);
                            if (typeof e.value === 'string') {
                              setFieldValue('address', e.value);
                            }
                          }}
                          inputClassName={`w-full rounded-[6px] border px-3 py-2 text-sm dark:bg-dark-900 dark:text-white dark:border-dark-600 ${
                            onErrorMessageMatcher('address', errors?.address, RestaurantErrors)
                              ? 'border-red-500'
                              : 'border-[#D1D5DB]'
                          }`}
                          panelClassName="shadow-xl rounded-xl border border-gray-200 dark:border-dark-600 dark:bg-dark-900"
                          placeholder={t('Wpisz adres restauracji...')}
                          delay={300}
                          minLength={2}
                          className="w-full"
                          itemTemplate={(item: IPlaceSuggestion) => (
                            <div className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-dark-800">
                              <FontAwesomeIcon icon={faMapMarkerAlt} className="mt-0.5 text-blue-400 shrink-0" />
                              <span className="text-sm">{item.description}</span>
                            </div>
                          )}
                        />
                        {errors.address && touched.address && (
                          <small className="ml-1 p-error">
                            {errors.address}
                          </small>
                        )}
                      </div>

                      {/* ── Prowizja ── */}
                      <div>
                        <CustomNumberField
                          prefix="%"
                          min={0}
                          max={100}
                          placeholder={t('Prowizja (Commission Rate)')}
                          minFractionDigits={2}
                          maxFractionDigits={2}
                          name="commissionRate"
                          showLabel={true}
                          value={values.commissionRate}
                          onChange={setFieldValue}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'commissionRate',
                              errors?.commissionRate as string | undefined,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>

                      {/* ── Zdjęcia ── */}
                      <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4">
                        {/* Logo (kwadratowe) */}
                        <CustomUploadImageComponent
                          key="logo"
                          name="logo"
                          title={t('Upload Profile Image')}
                          onSetImageUrl={setFieldValue}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'logo',
                              errors?.logo as string,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                          fileTypes={['image/webp', 'image/jpg', 'image/jpeg']}
                          maxFileHeight={1080}
                          maxFileWidth={1080}
                          maxFileSize={MAX_SQUARE_FILE_SIZE}
                          orientation="SQUARE"
                          existingImageUrl={values.logo}
                          showExistingImage={true}
                        />
                        {/* Zdjęcie główne (landscape 1980×841) */}
                        <CustomUploadImageComponent
                          key={'image'}
                          name="image"
                          title={`${t('Upload Image')} (1980 × 841 px)`}
                          onSetImageUrl={setFieldValue}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'image',
                              errors?.image as string,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                          existingImageUrl={values.image}
                          showExistingImage={true}
                          fileTypes={['image/webp', 'image/jpg', 'image/jpeg']}
                          maxFileHeight={841}
                          maxFileWidth={1980}
                          maxFileSize={MAX_LANSDCAPE_FILE_SIZE}
                          orientation="LANDSCAPE"
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">
                          {t('Zalecany wymiar zdjęcia głównego: 1980 × 841 px (landscape). Logo: kwadrat, maks. 1080 × 1080 px.')}
                        </p>
                      </div>

                      {/* Submit */}
                      <div className="mt-6 flex justify-end">
                        <CustomButton
                          className="h-12 w-fit border-none bg-blue-600 hover:bg-blue-700 px-8 text-white font-medium rounded-xl shadow-md transition-all duration-200"
                          label={t('Utwórz Restaurację')}
                          type="submit"
                          loading={isSubmitting}
                        />
                      </div>
                      <div className="flex justify-end">
                        {errors.address && touched.address && (
                          <small className="ml-5 p-error">
                            {errors.address}
                          </small>
                        )}
                      </div>
                    </div>
                  </Form>
                );
              }}
            </Formik>
          </div>

          <OwnerCredentialsModal
            visible={isCredentialsModalVisible}
            credentials={ownerCredentials}
            onHide={() => setIsCredentialsModalVisible(false)}
          />
        </div>
      </div>
    </div>
  );
}
