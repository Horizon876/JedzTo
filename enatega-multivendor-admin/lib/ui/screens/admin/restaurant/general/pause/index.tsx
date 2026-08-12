'use client';

import { useContext, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context';
import { GET_RESTAURANT_BY_ID } from '@/lib/api/graphql';
import { SET_RESTAURANT_PAUSE } from '@/lib/api/graphql/mutations/settlements';

export default function PauseOrdersScreen() {
  const t = useTranslations();
  const {
    restaurantLayoutContextData: { restaurantId },
  } = useContext(RestaurantLayoutContext);

  const { data, refetch } = useQuery(GET_RESTAURANT_BY_ID, {
    variables: { id: restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network',
  });

  const restaurant = data?.restaurant;
  const paused =
    restaurant?.isAvailable === false ||
    (restaurant?.pausedUntil &&
      new Date(restaurant.pausedUntil).getTime() > Date.now());

  const [setPause, { loading }] = useMutation(SET_RESTAURANT_PAUSE, {
    onCompleted: () => refetch(),
  });

  const untilLabel = useMemo(() => {
    if (!restaurant?.pausedUntil) return null;
    return new Date(restaurant.pausedUntil).toLocaleString();
  }, [restaurant?.pausedUntil]);

  return (
    <div className="screen-container p-6 bg-dark-950 text-white min-h-full">
      <h1 className="text-2xl font-black text-primary-color mb-2">
        {t('PauseOrders')}
      </h1>
      <p className="text-gray-400 mb-8 max-w-xl">{t('RestaurantPausedHint')}</p>

      <div className="rounded-2xl border border-dark-600 bg-dark-900 p-6 max-w-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-bold">{t('WeAreOverloaded')}</div>
            {untilLabel && paused ? (
              <div className="text-sm text-[#FF9F0A] mt-1">Do: {untilLabel}</div>
            ) : null}
          </div>
          <InputSwitch
            checked={Boolean(paused)}
            disabled={loading || !restaurantId}
            onChange={(e) =>
              setPause({
                variables: {
                  restaurantId,
                  paused: Boolean(e.value),
                  pausedUntil: e.value
                    ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
                    : null,
                },
              })
            }
          />
        </div>
        <div className="mt-6 flex gap-2">
          <Button
            label="2h"
            outlined
            disabled={loading}
            onClick={() =>
              setPause({
                variables: {
                  restaurantId,
                  paused: true,
                  pausedUntil: new Date(
                    Date.now() + 2 * 60 * 60 * 1000
                  ).toISOString(),
                },
              })
            }
          />
          <Button
            label={t('ActivateRestaurant')}
            className="bg-primary-color border-primary-color"
            disabled={loading}
            onClick={() =>
              setPause({
                variables: {
                  restaurantId,
                  paused: false,
                  pausedUntil: null,
                },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
