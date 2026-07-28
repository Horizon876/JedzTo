import HeaderText from '@/lib/ui/useable-components/header-text';
import { useTranslations } from 'next-intl';

const DeliveryAreasHeader = () => {
  const t = useTranslations();

  return (
    <div className="w-full flex-shrink-0">
      <div className="flex w-full flex-col justify-between">
        <HeaderText className="heading" text={t('Delivery Areas')} />
        <p className="text-sm text-gray-400">
          {t('Delivery Areas Description')}
        </p>
      </div>
    </div>
  );
};

export default DeliveryAreasHeader;
