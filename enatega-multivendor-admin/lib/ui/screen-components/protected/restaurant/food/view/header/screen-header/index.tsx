// Interface and Types

// Components
import { FoodsContext } from '@/lib/context/restaurant/foods.context';
import HeaderText from '@/lib/ui/useable-components/header-text';
import TextIconClickable from '@/lib/ui/useable-components/text-icon-clickable';
import PublishMenuButton from '@/lib/ui/screen-components/protected/restaurant/menu-publishing/publish-menu-button';

// Icons
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import { useContext } from 'react';

const FoodHeader = () => {
  // Hooks
  const t = useTranslations();

  // Context
  const { onFoodFormVisible } = useContext(FoodsContext);

  return (
    <div className="w-full flex-shrink-0 sticky top-0 bg-white dark:bg-dark-950 z-10 shadow-sm p-3">
      <div className="flex w-full justify-between">
        <HeaderText text={t('Products')} />
        <div className="flex items-center gap-4">
          <PublishMenuButton />
          <TextIconClickable
            className="rounded border dark:border-dark-600
             border-gray-300 bg-black text-white sm:w-auto"
            icon={faAdd}
            iconStyles={{ color: 'white' }}
            title={t('Add Product')}
            onClick={() => onFoodFormVisible(true)}
          />
        </div>
      </div>
    </div>
  );
};

export default FoodHeader;
