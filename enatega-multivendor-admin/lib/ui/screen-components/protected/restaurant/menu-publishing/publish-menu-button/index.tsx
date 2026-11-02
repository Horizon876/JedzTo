'use client';

// Core
import { useContext } from 'react';
import { useTranslations } from 'next-intl';

// GraphQL
import { useMutation, useQuery } from '@apollo/client';
import { GET_MENU_PUBLISH_STATUS, PUBLISH_MENU } from '@/lib/api/graphql';

// Context
import { ToastContext } from '@/lib/context/global/toast.context';
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context';

// Components
import TextIconClickable from '@/lib/ui/useable-components/text-icon-clickable';
import { formatDateTime } from '@/lib/utils/methods';
import { faCircleCheck, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

interface IMenuPublishStatus {
  menuPublishedAt: string | null;
  hasUnpublishedMenuChanges: boolean;
  publishedCategories: number;
  publishedItems: number;
}

// Menu edits stay invisible to customers until they are pushed. This button is
// that push, plus a readout of what the app is currently serving.
const PublishMenuButton = () => {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);
  const { restaurantLayoutContextData } = useContext(RestaurantLayoutContext);
  const restaurantId = restaurantLayoutContextData?.restaurantId;

  const { data, refetch } = useQuery(GET_MENU_PUBLISH_STATUS, {
    variables: { restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 15000,
  });

  const status: IMenuPublishStatus | undefined = data?.menuPublishStatus;

  const [publishMenu, { loading }] = useMutation(PUBLISH_MENU, {
    onCompleted: (result) => {
      const published = result?.publishMenu;
      showToast({
        type: 'success',
        title: t('Send to app'),
        message: t('Menu published to app', {
          categories: published?.publishedCategories ?? 0,
          items: published?.publishedItems ?? 0,
        }),
        duration: 4000,
      });
      refetch();
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: t('Send to app'),
        message: error.graphQLErrors[0]?.message ?? error.message,
        duration: 4000,
      });
    },
  });

  if (!restaurantId) return null;

  const pending = status?.hasUnpublishedMenuChanges;
  const publishedAt = status?.menuPublishedAt
    ? formatDateTime(status.menuPublishedAt)
    : null;

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right text-xs leading-tight sm:block">
        {pending ? (
          <span className="font-medium text-amber-600">
            {t('Unpublished menu changes')}
          </span>
        ) : (
          <span className="text-gray-500">{t('Menu is up to date')}</span>
        )}
        {publishedAt && (
          <div className="text-gray-400">
            {t('Last published')}: {publishedAt}
          </div>
        )}
      </div>

      <TextIconClickable
        className={`rounded border sm:w-auto ${
          pending
            ? 'border-amber-500 bg-amber-500 text-white'
            : 'border-gray-300 bg-white text-gray-700 dark:border-dark-600'
        }`}
        icon={pending ? faPaperPlane : faCircleCheck}
        iconStyles={{ color: pending ? 'white' : '#6b7280' }}
        title={loading ? `${t('Send to app')}...` : t('Send to app')}
        onClick={() => !loading && publishMenu({ variables: { restaurantId } })}
      />
    </div>
  );
};

export default PublishMenuButton;
