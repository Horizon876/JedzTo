'use client';

import { useContext, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { InputSwitch } from 'primereact/inputswitch';
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context';
import { GET_RESTAURANT_BY_ID } from '@/lib/api/graphql';
import { SET_RESTAURANT_HOLIDAYS } from '@/lib/api/graphql/mutations/settlements';
import useToast from '@/lib/hooks/useToast';
import CustomTimeInput from '@/lib/ui/useable-components/time-input';

type HolidayRow = {
  key: string;
  date: string;
  closed: boolean;
  open: string;
  close: string;
  label: string;
};

function toYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HolidaysScreen() {
  const t = useTranslations();
  const { showToast } = useToast();
  const {
    restaurantLayoutContextData: { restaurantId },
  } = useContext(RestaurantLayoutContext);

  const { data, refetch } = useQuery(GET_RESTAURANT_BY_ID, {
    variables: { id: restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network',
  });

  const [rows, setRows] = useState<HolidayRow[]>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [label, setLabel] = useState('');
  const [closed, setClosed] = useState(true);
  const [open, setOpen] = useState('10:00');
  const [close, setClose] = useState('18:00');

  useEffect(() => {
    const list = data?.restaurant?.holidayExceptions || [];
    setRows(
      list.map((h: any, i: number) => ({
        key: h._id || `${h.date}-${i}`,
        date: h.date,
        closed: h.closed !== false,
        open: h.open || '10:00',
        close: h.close || '18:00',
        label: h.label || '',
      }))
    );
  }, [data]);

  const [save, { loading }] = useMutation(SET_RESTAURANT_HOLIDAYS, {
    onCompleted: () => {
      refetch();
      showToast({
        type: 'success',
        title: t('Success'),
        message: t('Holidays updated successfully'),
        duration: 3000,
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: t('Error'),
        message: error.graphQLErrors?.[0]?.message || t('ActionFailedTryAgain'),
        duration: 3000,
      });
    },
  });

  const persist = (next: HolidayRow[]) => {
    setRows(next);
    void save({
      variables: {
        restaurantId,
        holidays: next.map((r) => ({
          date: r.date,
          closed: r.closed,
          open: r.closed ? null : r.open,
          close: r.closed ? null : r.close,
          label: r.label,
        })),
      },
    });
  };

  return (
    <div className="screen-container p-6 bg-dark-950 text-white min-h-full">
      <h1 className="text-2xl font-black text-primary-color mb-2">
        {t('Holidays')}
      </h1>
      <p className="text-gray-400 mb-6">{t('HolidaysDescription')}</p>

      <div className="rounded-2xl border border-dark-600 bg-dark-900 p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-400 block mb-1">
            {t('HolidayDate')}
          </label>
          <Calendar
            value={date}
            onChange={(e) => setDate(e.value as Date)}
            dateFormat="yy-mm-dd"
            showIcon
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">
            {t('HolidayLabel')}
          </label>
          <InputText
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('HolidayLabelPlaceholder')}
          />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <InputSwitch
            checked={closed}
            onChange={(e) => setClosed(Boolean(e.value))}
          />
          <span>{t('HolidayClosed')}</span>
        </div>
        {!closed && (
          <>
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                {t('Start Time')}
              </label>
              <CustomTimeInput
                name="holiday-open"
                showLabel={false}
                value={open}
                onChange={(value: string) => setOpen(value)}
                placeholder={t('Start Time')}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                {t('End Time')}
              </label>
              <CustomTimeInput
                name="holiday-close"
                showLabel={false}
                value={close}
                onChange={(value: string) => setClose(value)}
                placeholder={t('End Time')}
              />
            </div>
          </>
        )}
        <Button
          label={t('AddHoliday')}
          loading={loading}
          className="bg-primary-color border-primary-color"
          onClick={() => {
            if (!date) return;
            if (!closed && (!open || !close)) return;
            const ymd = toYmd(date);
            if (rows.some((r) => r.date === ymd)) {
              showToast({
                type: 'error',
                title: t('Error'),
                message: t('HolidayAlreadyExists'),
                duration: 3000,
              });
              return;
            }
            persist([
              ...rows,
              {
                key: ymd,
                date: ymd,
                closed,
                open,
                close,
                label: label || ymd,
              },
            ]);
            setDate(null);
            setLabel('');
            setClosed(true);
            setOpen('10:00');
            setClose('18:00');
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div
            key={r.key}
            className="flex items-center justify-between rounded-xl border border-dark-600 bg-dark-900 px-4 py-3"
          >
            <div>
              <div className="font-bold">{r.date}</div>
              <div className="text-sm text-gray-400">
                {r.label} ·{' '}
                {r.closed
                  ? t('HolidayClosed')
                  : `${t('HolidayCustomHours')}: ${r.open}–${r.close}`}
              </div>
            </div>
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              onClick={() => persist(rows.filter((x) => x.key !== r.key))}
            />
          </div>
        ))}
        {!rows.length && (
          <p className="text-gray-400">{t('HolidaysEmpty')}</p>
        )}
      </div>
    </div>
  );
}
