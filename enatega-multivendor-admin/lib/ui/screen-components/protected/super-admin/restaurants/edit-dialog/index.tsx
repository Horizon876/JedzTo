'use client';

import { useState, useEffect, useContext } from 'react';
import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';

import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { Password } from 'primereact/password';

import { ToastContext } from '@/lib/context/global/toast.context';
import { EDIT_RESTAURANT } from '@/lib/api/graphql';

interface IRestaurantEditDialogProps {
  restaurantData: Record<string, unknown> | null;
  visible: boolean;
  onHide: () => void;
  onSuccess: () => void;
}

export default function RestaurantEditDialog({
  restaurantData,
  visible,
  onHide,
  onSuccess,
}: IRestaurantEditDialogProps) {
  const { showToast } = useContext(ToastContext);

  const [commissionRate, setCommissionRate] = useState<number | null>(10);
  const [password, setPassword] = useState<string>('');

  useEffect(() => {
    if (visible && restaurantData) {
      setCommissionRate((restaurantData.commissionRate as number) || 0);
      setPassword('');
    }
  }, [visible, restaurantData]);

  const [editRestaurant, { loading }] = useMutation(EDIT_RESTAURANT, {
    onCompleted: () => {
      showToast({
        type: 'success',
        title: 'Sukces',
        message: 'Dane restauracji zostały zaktualizowane.',
        duration: 3000,
      });
      onSuccess();
      onHide();
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Błąd',
        message: error.message || 'Nie udało się zaktualizować danych.',
        duration: 3000,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantData) return;

    const restaurantInput: Record<string, unknown> = {
      _id: restaurantData._id,
      commissionRate: commissionRate,
    };

    if (password.trim() !== '') {
      restaurantInput.password = password.trim();
    }

    editRestaurant({
      variables: { restaurantInput },
    });
  };

  const footer = (
    <div className="flex justify-end gap-2 mt-4">
      <Button label="Anuluj" icon="pi pi-times" onClick={onHide} className="p-button-text" disabled={loading} />
      <Button label="Zapisz" icon="pi pi-check" onClick={handleSubmit} loading={loading} autoFocus />
    </div>
  );

  return (
    <Dialog
      header={`Szybka Edycja: ${restaurantData?.name || ''}`}
      visible={visible}
      style={{ width: '400px' }}
      onHide={onHide}
      footer={footer}
      className="custom-dialog bg-white dark:bg-dark-900"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="commissionRate" className="font-bold text-gray-700 dark:text-gray-200">
            Prowizja systemu (%)
          </label>
          <InputNumber
            id="commissionRate"
            value={commissionRate}
            onValueChange={(e) => setCommissionRate(e.value || 0)}
            min={0}
            max={100}
            suffix=" %"
            className="w-full"
            inputClassName="w-full"
          />
        </div>
        
        <div className="flex flex-col gap-2 mt-2">
          <label htmlFor="password" className="font-bold text-gray-700 dark:text-gray-200">
            Nowe Hasło Właściciela
          </label>
          <Password
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            toggleMask
            feedback={false}
            placeholder="Pozostaw puste by nie zmieniać"
            className="w-full"
            inputClassName="w-full"
          />
        </div>
      </form>
    </Dialog>
  );
}
