'use client';

// Core
import { Form, Formik } from 'formik';
import { useContext, useEffect, useState } from 'react';

// Interface and Types
import { IRestaurantOwnerDetailsForm } from '@/lib/utils/interfaces/forms';

// Constants and Methods
import { RestaurantOwnerDetailsErrors } from '@/lib/utils/constants';
import { onErrorMessageMatcher } from '@/lib/utils/methods/error';

// Components
import CustomButton from '@/lib/ui/useable-components/button';
import CustomTextField from '@/lib/ui/useable-components/input-field';
import CustomIconTextField from '@/lib/ui/useable-components/input-icon-field';

// Schema
import { RestaurantOwnerDetailsSchema } from '@/lib/utils/schema';

// Context
import { RestaurantsContext } from '@/lib/context/super-admin/restaurants.context';
import { IRestaurantsVendorDetailsComponentProps } from '@/lib/utils/interfaces/restaurants.interface';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';

const initialValues: IRestaurantOwnerDetailsForm = {
  ownerName: '',
  ownerEmail: '',
};

// JedzTo — "Set Vendor" step is now just the owner's name + email. The
// login account (with a generated temporary password) is created
// automatically, atomically with the restaurant, in the next step's
// createRestaurant call — there is no vendor picker/creation here anymore.
export default function VendorDetails({
  stepperProps,
}: IRestaurantsVendorDetailsComponentProps) {
  // Props
  const { onStepChange, order } = stepperProps ?? {
    onStepChange: () => {},
    type: '',
    order: -1,
  };

  // Hooks
  const t = useTranslations();

  // Context
  const { restaurantsContextData, onSetRestaurantsContextData } =
    useContext(RestaurantsContext);

  // States
  const [formInitialValues, setFormValues] =
    useState<IRestaurantOwnerDetailsForm>({ ...initialValues });

  // Handlers
  const onOwnerSubmitHandler = (formData: IRestaurantOwnerDetailsForm) => {
    onSetRestaurantsContextData({
      ...restaurantsContextData,
      vendor: {
        ownerName: formData.ownerName.trim(),
        ownerLogin: formData.ownerEmail.trim(),
      },
    });

    onStepChange(order + 1);
  };

  // Use Effects — prefill when navigating back to this step.
  useEffect(() => {
    const vendor = restaurantsContextData?.vendor;
    if (vendor?.ownerName || vendor?.ownerLogin) {
      setFormValues({
        ownerName: vendor.ownerName ?? '',
        ownerEmail: vendor.ownerLogin ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-start dark:text-white dark:bg-dark-950">
      <div className="h-full w-full">
        <div className="flex flex-col gap-2">
          <div>
            <Formik
              initialValues={formInitialValues}
              validationSchema={RestaurantOwnerDetailsSchema}
              enableReinitialize={true}
              onSubmit={(values) => onOwnerSubmitHandler(values)}
              validateOnChange={false}
            >
              {({ values, errors, handleChange, handleSubmit, isSubmitting }) => {
                return (
                  <Form onSubmit={handleSubmit}>
                    <div className="space-y-3">
                      <div>
                        <CustomTextField
                          type="text"
                          name="ownerName"
                          placeholder={t('Owner Name')}
                          maxLength={70}
                          value={values.ownerName}
                          onChange={handleChange}
                          showLabel={true}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'ownerName',
                              errors?.ownerName,
                              RestaurantOwnerDetailsErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>

                      <div>
                        <CustomIconTextField
                          type="email"
                          name="ownerEmail"
                          placeholder={t('Owner Email')}
                          maxLength={70}
                          showLabel={true}
                          iconProperties={{
                            icon: faEnvelope,
                            position: 'right',
                            style: { marginTop: '1px' },
                          }}
                          value={values.ownerEmail}
                          onChange={handleChange}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'ownerEmail',
                              errors?.ownerEmail,
                              RestaurantOwnerDetailsErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>

                      <p className="text-sm text-gray-500 dark:text-dark-200">
                        {t(
                          'A login account with a temporary password will be generated automatically for this owner.'
                        )}
                      </p>

                      <div className="mt-4 flex justify-end">
                        <CustomButton
                          className="h-10 w-fit border border-gray-300 dark:border-dark-600 bg-black px-8 text-white"
                          label={t('Save & Next')}
                          type="submit"
                          loading={isSubmitting}
                        />
                      </div>
                    </div>
                  </Form>
                );
              }}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
}
