'use client';

import { useState } from 'react';
// Core
import { Form, Formik } from 'formik';
import { useContext, useMemo } from 'react';

// Interface and Types
import {
  ICreateRestaurantPayload,
  IDropdownSelectItem,
  IGeneratedOwnerCredentials,
  IQueryResult,
} from '@/lib/utils/interfaces';

// Component
import CustomButton from '@/lib/ui/useable-components/button';
import CustomDropdownComponent from '@/lib/ui/useable-components/custom-dropdown';
import CustomMultiSelectComponent from '@/lib/ui/useable-components/custom-multi-select';
import CustomTextField from '@/lib/ui/useable-components/input-field';
import ShopTypesForm from '@/lib/ui/screen-components/protected/super-admin/shop-types/form';
import CuisineForm from '@/lib/ui/screen-components/protected/super-admin/cuisines/form';
import OwnerCredentialsModal from './owner-credentials-modal';

// Constants
import {
  MAX_LANSDCAPE_FILE_SIZE,
  MAX_SQUARE_FILE_SIZE,
  RestaurantErrors,
} from '@/lib/utils/constants';

// Interface
import { IRestaurantForm } from '@/lib/utils/interfaces';
import { IEditState, IShopType } from '@/lib/utils/interfaces';

// Methods
import { onErrorMessageMatcher } from '@/lib/utils/methods/error';

// Schemas
import {
  CREATE_RESTAURANT,
  GET_CUISINES,
  GET_RESTAURANTS,
} from '@/lib/api/graphql';
import { RestaurantsContext } from '@/lib/context/super-admin/restaurants.context';
import { ToastContext } from '@/lib/context/global/toast.context';
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import CustomNumberField from '@/lib/ui/useable-components/number-input-field';
import CustomUploadImageComponent from '@/lib/ui/useable-components/upload/upload-image';
import {
  ICuisine,
  IGetCuisinesData,
} from '@/lib/utils/interfaces/cuisine.interface';
import { IRestaurantsAddRestaurantComponentProps } from '@/lib/utils/interfaces/restaurants.interface';
import { toTextCase } from '@/lib/utils/methods';
import { RestaurantSchema } from '@/lib/utils/schema/restaurant';
import {
  ApolloCache,
  ApolloError,
  useMutation,
  useQuery,
} from '@apollo/client';
import { useTranslations } from 'next-intl';
import CustomPhoneTextField from '@/lib/ui/useable-components/phone-input-field';
import { useShopTypes } from '@/lib/hooks/useShopType';

const initialValues: IRestaurantForm = {
  name: '',
  phoneNumber: '',
  address: '',
  deliveryTime: 1,
  minOrder: 1,
  salesTax: 0.0,
  shopType: null,
  cuisines: [],
  image:
    'https://t4.ftcdn.net/jpg/04/76/57/27/240_F_476572792_zMwqHpmGal1fzh0tDJ3onkLo88IjgNbL.jpg',
  logo: 'https://res.cloudinary.com/dc6xw0lzg/image/upload/v1735894342/dvi5fjbsgdlrzwip0whg.jpg',
};

export default function RestaurantDetailsForm({
  stepperProps,
}: IRestaurantsAddRestaurantComponentProps) {
  // Hooks
  const t = useTranslations();
  const [isAddShopTypeVisible, setIsAddShopTypeVisible] = useState(false);
  const [isEditShopType, setIsEditShopType] = useState<IEditState<IShopType>>({
    bool: false,
    data: {
      __typename: '',
      _id: '',
      name: '',
      isActive: true,
      image: '',
    },
  });
  const [isAddCuisineVisible, setIsAddCuisineVisible] = useState(false);
  const [isEditCuisine, setIsEditCuisine] = useState<IEditState<ICuisine>>({
    bool: false,
    data: {
      _id: '',
      description: '',
      image: '',
      name: '',
      shopType: '',
      __typename: '',
    },
  });
  const [ownerCredentials, setOwnerCredentials] =
    useState<IGeneratedOwnerCredentials | null>(null);
  const [isCredentialsModalVisible, setIsCredentialsModalVisible] =
    useState(false);

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

      // The temporary password only ever appears in this one response —
      // show it now so the admin can copy it before it's gone for good.
      if (createRestaurant?.owner) {
        setOwnerCredentials(createRestaurant.owner);
        setIsCredentialsModalVisible(true);
      }

      onStepChange(order + 1);
    },
    update: update,
  });

  const cuisineResponse = useQueryGQL(GET_CUISINES, {
    debounceMs: 300,
  }) as IQueryResult<IGetCuisinesData | undefined, undefined>;
  cuisineResponse.data?.cuisines;

  const { dropdownList, loading } = useShopTypes({
    invoke_now: true,
    transform_to_dropdown_list: true,
  });

  // Memoized Constants
  const cuisinesDropdown = useMemo(
    () =>
      cuisineResponse.data?.cuisines?.map((cuisin: ICuisine) => {
        return { label: toTextCase(cuisin.name, 'title'), code: cuisin.name };
      }),
    [cuisineResponse.data?.cuisines]
  );

  // Handlers
  const onCreateRestaurant = async (data: IRestaurantForm) => {
    try {
      const ownerName = restaurantsContextData?.vendor?.ownerName;
      const ownerEmail = restaurantsContextData?.vendor?.ownerEmail;
      if (!ownerName || !ownerEmail) {
        showToast({
          type: 'error',
          title: t('Create Store'),
          message: t('Store Creation Failed - Please set the owner details'),
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
          ownerEmail,
          restaurant: {
            name: data.name,
            address: data.address,
            phone: data.phoneNumber,
            image: data.image,
            logo: data.logo,
            deliveryTime: data.deliveryTime,
            minimumOrder: data.minOrder,
            shopType: data.shopType?.code,
            salesTax: data.salesTax,
            cuisines: data.cuisines.map(
              (cuisin: IDropdownSelectItem) => cuisin.code
            ),
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

    // GET_RESTAURANTS returns a flat `restaurants: [Restaurant]` array (no
    // pagination wrapper) — see queries/restaurants/index.ts.
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
          {/* <div className="flex flex-col mb-2">
            <span className="text-lg">Add Restaurant</span>
          </div>
 */}
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

                      <div>
                        <label className="mb-[4px] text-[14px] font-medium text-[#09090B]">
                          {t('Phone')}
                        </label>
                        <CustomPhoneTextField
                          mask="999-999-9999"
                          name="phoneNumber"
                          showLabel={true}
                          // placeholder="Phone Number"
                          onChange={(e) => {
                            // console.log("phone number format ==> ", e, code);
                            setFieldValue('phoneNumber', e);
                            // setCountryCode(code);
                          }}
                          value={values.phoneNumber}
                          // value={values.phoneNumber?.toString().match(/\(\+(\d+)\)\s(.+)/)?.[2]}
                          type="text"
                          className="rounded-[6px] border-[#D1D5DB]"
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'phoneNumber',
                              errors?.phoneNumber,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>

                      <div>
                        <CustomTextField
                          placeholder={t('Address')}
                          name="address"
                          type="text"
                          maxLength={100}
                          showLabel={true}
                          value={values.address ?? ''}
                          onChange={handleChange}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'address',
                              errors?.address,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                        {errors.address && touched.address && (
                          <small className="ml-1 p-error">
                            {errors.address}
                          </small>
                        )}
                      </div>

                      <div>
                        <CustomNumberField
                          suffix="m"
                          min={1}
                          max={500}
                          placeholder={t('Delivery Time')}
                          name="deliveryTime"
                          showLabel={true}
                          value={values.deliveryTime}
                          onChange={setFieldValue}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'deliveryTime',
                              errors?.deliveryTime,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>

                      <div>
                        <CustomNumberField
                          min={1}
                          max={99999}
                          placeholder={t('Min Order')}
                          name="minOrder"
                          showLabel={true}
                          value={values.minOrder}
                          onChange={setFieldValue}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'minOrder',
                              errors?.minOrder,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>
                      <div>
                        <CustomNumberField
                          prefix="%"
                          min={0}
                          max={100}
                          placeholder={t('Service Charges')}
                          minFractionDigits={2}
                          maxFractionDigits={2}
                          name="salesTax"
                          showLabel={true}
                          value={values.salesTax}
                          onChange={setFieldValue}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'salesTax',
                              errors?.salesTax,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>
                      <div>
                        <CustomDropdownComponent
                          name="shopType"
                          placeholder={t('Shop Category')}
                          selectedItem={values.shopType}
                          setSelectedItem={setFieldValue}
                          loading={loading}
                          options={dropdownList || []}
                          showLabel={true}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'shopType',
                              errors?.shopType,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                          extraFooterButton={{
                            title: t('Add Shop Category'),
                            onChange: () => setIsAddShopTypeVisible(true),
                          }}
                        />
                      </div>

                      <div>
                        <CustomMultiSelectComponent
                          name="cuisines"
                          placeholder={t('Cuisines')}
                          options={cuisinesDropdown ?? []}
                          selectedItems={values.cuisines}
                          setSelectedItems={setFieldValue}
                          showLabel={true}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'cuisines',
                              errors?.cuisines as string,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                          extraFooterButton={{
                            title: t('Add Cuisine'),
                            onChange: () => setIsAddCuisineVisible(true),
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4">
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
                        <CustomUploadImageComponent
                          key={'image'}
                          name="image"
                          title={t('Upload Image')}
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
                      </div>

                      <div className="mt-4 flex justify-between">
                        <CustomButton
                          className="h-10 w-fit border border-gray-300 dark:hover:bg-dark-600 dark:border-dark-600 bg-black px-8 text-white"
                          label={t('Back')}
                          type="button"
                          onClick={() => onStepChange(order - 1)}
                        />

                        <CustomButton
                          className="h-10 w-fit border border-gray-300 dark:hover:bg-dark-600 dark:border-dark-600 bg-black px-8 text-white"
                          label={t('Save & Next')}
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

          <ShopTypesForm
            visible={isAddShopTypeVisible}
            setVisible={setIsAddShopTypeVisible}
            isEditing={isEditShopType}
            setIsEditing={setIsEditShopType}
          />

          <CuisineForm
            visible={isAddCuisineVisible}
            setVisible={setIsAddCuisineVisible}
            isEditing={isEditCuisine}
            setIsEditing={setIsEditCuisine}
          />

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
