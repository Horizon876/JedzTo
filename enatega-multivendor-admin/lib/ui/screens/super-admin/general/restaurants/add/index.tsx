'use client';

import React, { useEffect } from 'react';
import RestaurantsForm from '@/lib/ui/screen-components/protected/super-admin/restaurants/add-form';
import { RestaurantsProvider, RestaurantsContext } from '@/lib/context/super-admin/restaurants.context';
import { useSearchParams } from 'next/navigation';
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import { GET_RESTAURANT_BY_ID } from '@/lib/api/graphql/queries/restaurants';

// Utworzony wrapper by używać contextu do ustawienia pobranych danych
function RestaurantsAddFormWrapper() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { onSetRestaurantsContextData } = React.useContext(RestaurantsContext);

  const { data, loading } = useQueryGQL(
    GET_RESTAURANT_BY_ID,
    id ? { id } : {},
    { fetchPolicy: 'network-only', skip: !id }
  ) as unknown as Record<string, unknown>;

  useEffect(() => {
    if (data?.restaurant) {
      const rest = data.restaurant;
      onSetRestaurantsContextData({
        restaurant: {
          ...rest,
          _id: {
            label: rest.name,
            code: rest._id,
          },
        },
        vendor: {
          ownerName: rest.owner?.email || '',
          ownerLogin: rest.owner?.email || '',
        },
        isEditing: true,
      });
    }
  }, [data, onSetRestaurantsContextData]);

  if (loading && id) {
    return <div className="flex h-screen items-center justify-center">Ładowanie danych...</div>;
  }

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-[#0a0a0a] min-h-screen">
      <RestaurantsForm forceVisible={true} />
    </div>
  );
}

export default function RestaurantsAddFormScreen() {
  return (
    <RestaurantsProvider>
      <RestaurantsAddFormWrapper />
    </RestaurantsProvider>
  );
}
