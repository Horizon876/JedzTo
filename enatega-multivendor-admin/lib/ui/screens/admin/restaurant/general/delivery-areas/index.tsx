import DeliveryAreasHeader from '@/lib/ui/screen-components/protected/restaurant/delivery-areas/view/header';
import DeliveryAreasMain from '@/lib/ui/screen-components/protected/restaurant/delivery-areas/view/main';

export default function DeliveryAreasScreen() {
  return (
    <div className="flex h-screen flex-col overflow-hidden p-3">
      <DeliveryAreasHeader />
      <DeliveryAreasMain />
    </div>
  );
}
