'use client';

// Core imports
import { useContext } from 'react';

// Context
import { RestaurantsContext } from '@/lib/context/super-admin/restaurants.context';

// Interfaces
import {
  IRestaurantsAddFormComponentProps,
  IRestaurantsContextPropData,
} from '@/lib/utils/interfaces';

// PrimeReact components
import { Sidebar } from 'primereact/sidebar';


// Local components
import RestaurantDetailsForm from './restaurant-details';
import RestaurantLocation from './restaurant-location';
import RestaurantTiming from './restaurant-timing';
import { useTranslations } from 'next-intl';

const RestaurantsForm = ({
  forceVisible = false,
}: IRestaurantsAddFormComponentProps) => {
  const t = useTranslations();
  const {
    isRestaurantsFormVisible,
    onRestaurantsFormVisible,
    activeIndex,
    onActiveStepChange,
    onSetRestaurantsContextData,
    restaurantsContextData,
  } = useContext(RestaurantsContext);

  const isCreated = !!restaurantsContextData?.restaurant?._id;

  const tabs = [
    { label: t('Restaurant Details'), icon: '📝', id: 0 },
    { label: t('Delivery Zone & Location'), icon: '📍', id: 1, disabled: !isCreated },
    { label: t('Opening Hours'), icon: '⏰', id: 2, disabled: !isCreated },
  ];

  // Adjust activeIndex if it's pointing to old steps (0 was vendor, 1 was details)
  // Now: 0 is details, 1 is location, 2 is timing.
  // Wait, restaurant-details expects order. We'll just pass activeIndex.
  const onHandleStepChange = (order: number) => {
    onActiveStepChange(order);
  };

  const onSidebarHideHandler = () => {
    onActiveStepChange(0);
    onRestaurantsFormVisible(false);
    onSetRestaurantsContextData({} as IRestaurantsContextPropData);
  };

  const content = (
    <div className="mx-auto max-w-6xl py-6 w-full px-4">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-1/4 shrink-0">
          <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-600 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                disabled={tab.disabled}
                onClick={() => onActiveStepChange(tab.id)}
                className={`flex items-center justify-start gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${
                  activeIndex === tab.id
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-sm'
                    : tab.disabled
                    ? 'opacity-50 cursor-not-allowed text-gray-400 bg-gray-50 dark:bg-dark-800 border border-transparent'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-800 border border-transparent'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
            {!isCreated && (
              <p className="text-xs text-gray-400 px-4 mt-2 text-center">
                {t('Zapisz dane restauracji, aby odblokować lokalizację i godziny otwarcia.')}
              </p>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="w-full lg:w-3/4">
          <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-600 rounded-2xl p-6 sm:p-8 shadow-xl min-h-[500px]">
            {activeIndex === 0 && (
              <RestaurantDetailsForm
                stepperProps={{
                  onStepChange: onHandleStepChange,
                  order: activeIndex,
                }}
              />
            )}
            {activeIndex === 1 && (
              <RestaurantLocation
                stepperProps={{
                  onStepChange: onHandleStepChange,
                  order: activeIndex,
                  isLastStep: true,
                }}
              />
            )}
            {activeIndex === 2 && (
              <RestaurantTiming
                stepperProps={{
                  onStepChange: onHandleStepChange,
                  order: activeIndex,
                  isLastStep: true,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const headerContent = (
    <div className="flex flex-col px-4 pb-4">
      <h2 className="text-3xl font-black text-blue-600 dark:text-blue-400 mb-1">
        Kreator Restauracji
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        Wypełnij formularz poniżej, aby zdefiniować wszystkie aspekty nowej restauracji.
      </p>
    </div>
  );

  if (forceVisible) {
    return (
      <div className="w-full flex flex-col pt-8 bg-gray-50 dark:bg-dark-950 min-h-screen">
        <div className="max-w-6xl mx-auto w-full px-4">
           {headerContent}
        </div>
        {content}
      </div>
    );
  }

  return (
    <Sidebar
      visible={isRestaurantsFormVisible}
      fullScreen
      onHide={onSidebarHideHandler}
      className="bg-gray-50 dark:bg-dark-950 border-none"
      header={headerContent}
    >
      {content}
    </Sidebar>
  );
};

export default RestaurantsForm;
