'use client';

// Core
import { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

// GraphQL
import { useMutation, useQuery } from '@apollo/client';
import {
  GET_RESTAURANT_DELIVERY_AREAS,
  UPDATE_DELIVERY_AREAS,
} from '@/lib/api/graphql';

// Context
import { ToastContext } from '@/lib/context/global/toast.context';
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context';

// Components
import CustomButton from '@/lib/ui/useable-components/button';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

interface IDeliveryAreaRow {
  key: string;
  name: string;
  fee: number;
  minOrder: number;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  isActive: boolean;
}

interface IPlaceSuggestion {
  placeId: string;
  description: string;
}

const MAPS_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:8001/'
).replace(/\/?$/, '/');

const emptyRow = (): IDeliveryAreaRow => ({
  key: `area-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  fee: 0,
  minOrder: 0,
  latitude: null,
  longitude: null,
  radiusKm: 3,
  isActive: true,
});

const DeliveryAreasMain = () => {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);
  const { restaurantLayoutContextData } = useContext(RestaurantLayoutContext);
  const restaurantId = restaurantLayoutContextData?.restaurantId;

  const [rows, setRows] = useState<IDeliveryAreaRow[]>([]);
  const [suggestions, setSuggestions] = useState<IPlaceSuggestion[]>([]);

  const { data, loading, refetch } = useQuery(GET_RESTAURANT_DELIVERY_AREAS, {
    variables: { id: restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const areas = data?.restaurant?.deliveryAreas;
    if (!areas) return;
    setRows(
      areas.map(
        (a: Omit<IDeliveryAreaRow, 'key'> & { _id: string }): IDeliveryAreaRow => ({
          key: a._id,
          name: a.name,
          fee: a.fee ?? 0,
          minOrder: a.minOrder ?? 0,
          latitude: a.latitude,
          longitude: a.longitude,
          radiusKm: a.radiusKm ?? 3,
          isActive: a.isActive !== false,
        })
      )
    );
  }, [data]);

  const [updateDeliveryAreas, { loading: saving }] = useMutation(
    UPDATE_DELIVERY_AREAS,
    {
      onCompleted: () => {
        showToast({
          type: 'success',
          title: t('Delivery Areas'),
          message: t('Delivery areas saved'),
          duration: 3000,
        });
        refetch();
      },
      onError: (error) => {
        showToast({
          type: 'error',
          title: t('Delivery Areas'),
          message: error.graphQLErrors[0]?.message ?? error.message,
          duration: 4000,
        });
      },
    }
  );

  // Turns a typed town name into coordinates using the API's Mapbox-backed
  // geocoding proxy, so owners never have to know latitude/longitude.
  const searchPlaces = async (event: AutoCompleteCompleteEvent) => {
    try {
      const response = await fetch(
        `${MAPS_BASE_URL}maps/autocomplete?input=${encodeURIComponent(event.query)}&language=pl`
      );
      const json = await response.json();
      setSuggestions(json?.data?.predictions ?? []);
    } catch {
      setSuggestions([]);
    }
  };

  const applyPlace = async (rowKey: string, suggestion: IPlaceSuggestion) => {
    try {
      const response = await fetch(
        `${MAPS_BASE_URL}maps/place-details?placeId=${encodeURIComponent(suggestion.placeId)}`
      );
      const json = await response.json();
      const location = json?.data?.result?.geometry?.location;
      if (!location) return;
      updateRow(rowKey, {
        name: suggestion.description.split(',')[0].trim(),
        latitude: location.lat,
        longitude: location.lng,
      });
    } catch {
      showToast({
        type: 'error',
        title: t('Delivery Areas'),
        message: t('Could not resolve this place'),
        duration: 3000,
      });
    }
  };

  const updateRow = (key: string, patch: Partial<IDeliveryAreaRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r.key !== key));

  const invalidRows = useMemo(
    () =>
      rows.filter(
        (r) => !r.name.trim() || r.latitude == null || r.longitude == null
      ),
    [rows]
  );

  const onSave = async () => {
    if (invalidRows.length) {
      showToast({
        type: 'error',
        title: t('Delivery Areas'),
        message: t('Every area needs a name picked from the list'),
        duration: 4000,
      });
      return;
    }

    await updateDeliveryAreas({
      variables: {
        restaurantId,
        areas: rows.map((r) => ({
          name: r.name.trim(),
          fee: r.fee ?? 0,
          minOrder: r.minOrder ?? 0,
          latitude: r.latitude,
          longitude: r.longitude,
          radiusKm: r.radiusKm,
          isActive: r.isActive,
        })),
      },
    });
  };

  if (!restaurantId) {
    return (
      <div className="mt-7 rounded border p-8 text-sm text-gray-500">
        {t('No restaurant selected')}
      </div>
    );
  }

  return (
    <div className="mt-7 max-h-[calc(100vh-152px)] overflow-auto rounded border px-6 py-6">
      {loading && !rows.length ? (
        <p className="text-sm text-gray-500">{t('Loading')}...</p>
      ) : (
        <>
          <div className="space-y-4">
            {rows.map((row) => (
              <div
                key={row.key}
                className="grid grid-cols-1 items-end gap-4 rounded-lg border border-gray-200 p-4 dark:border-dark-600 md:grid-cols-12"
              >
                <div className="md:col-span-4">
                  <label className="mb-1 block text-sm font-medium dark:text-white">
                    {t('Area')}
                  </label>
                  <AutoComplete
                    value={row.name}
                    suggestions={suggestions}
                    completeMethod={searchPlaces}
                    field="description"
                    delay={350}
                    minLength={2}
                    placeholder={t('Type a town or district')}
                    className="w-full"
                    inputClassName="h-10 w-full rounded-lg border border-gray-300 px-2 text-sm"
                    onChange={(e) =>
                      updateRow(row.key, {
                        name:
                          typeof e.value === 'string'
                            ? e.value
                            : e.value?.description ?? '',
                        ...(typeof e.value === 'string'
                          ? { latitude: null, longitude: null }
                          : {}),
                      })
                    }
                    onSelect={(e) => applyPlace(row.key, e.value)}
                  />
                  {row.latitude == null && (
                    <p className="mt-1 text-xs text-amber-600">
                      {t('Pick a suggestion to set the location')}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium dark:text-white">
                    {t('Delivery fee')} (zł)
                  </label>
                  <InputNumber
                    value={row.fee}
                    onValueChange={(e) =>
                      updateRow(row.key, { fee: e.value ?? 0 })
                    }
                    min={0}
                    max={999}
                    minFractionDigits={0}
                    maxFractionDigits={2}
                    inputClassName="h-10 w-full rounded-lg border border-gray-300 px-2 text-sm"
                    className="w-full"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium dark:text-white">
                    {t('Minimum order')} (zł)
                  </label>
                  <InputNumber
                    value={row.minOrder}
                    onValueChange={(e) =>
                      updateRow(row.key, { minOrder: e.value ?? 0 })
                    }
                    min={0}
                    max={9999}
                    minFractionDigits={0}
                    maxFractionDigits={2}
                    inputClassName="h-10 w-full rounded-lg border border-gray-300 px-2 text-sm"
                    className="w-full"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium dark:text-white">
                    {t('Radius')} (km)
                  </label>
                  <InputNumber
                    value={row.radiusKm}
                    onValueChange={(e) =>
                      updateRow(row.key, { radiusKm: e.value ?? 1 })
                    }
                    min={0.1}
                    max={100}
                    minFractionDigits={1}
                    maxFractionDigits={1}
                    inputClassName="h-10 w-full rounded-lg border border-gray-300 px-2 text-sm"
                    className="w-full"
                  />
                </div>

                <div className="flex items-center gap-3 md:col-span-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium dark:text-white">
                      {t('Active')}
                    </label>
                    <InputSwitch
                      checked={row.isActive}
                      onChange={(e) =>
                        updateRow(row.key, { isActive: Boolean(e.value) })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={t('Remove')}
                    onClick={() => removeRow(row.key)}
                    className="mt-5 rounded p-2 text-red-500 hover:bg-red-50"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!rows.length && (
            <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              {t('No delivery areas yet')}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:text-white"
            >
              <FontAwesomeIcon icon={faPlus} />
              {t('Add area')}
            </button>

            <CustomButton
              className="h-10 w-fit border-gray-300 bg-black px-8 text-white"
              label={t('Save')}
              onClick={onSave}
              loading={saving}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default DeliveryAreasMain;
