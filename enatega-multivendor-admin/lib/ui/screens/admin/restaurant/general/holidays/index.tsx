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

type HolidayRow = {
  key: string;
  date: string;
  closed: boolean;
  label: string;
};

function toYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HolidaysScreen() {
  const t = useTranslations();
  const {
    restaurantLayoutContextData: { restaurantId },
  } = useContext(RestaurantLayoutContext);

  const { data, refetch } = useQuery(GET_RESTAURANT_BY_ID, {
    variables: { id: restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'network-only',
  });

  const [rows, setRows] = useState<HolidayRow[]>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [label, setLabel] = useState('');
  const [closed, setClosed] = useState(true);

  useEffect(() => {
    const list = data?.restaurant?.holidayExceptions || [];
    setRows(
      list.map((h: any, i: number) => ({
        key: h._id || `${h.date}-${i}`,
        date: h.date,
        closed: h.closed !== false,
        label: h.label || '',
      }))
    );
  }, [data]);

  const [save, { loading }] = useMutation(SET_RESTAURANT_HOLIDAYS, {
    onCompleted: () => refetch(),
  });

  const persist = (next: HolidayRow[]) => {
    setRows(next);
    void save({
      variables: {
        restaurantId,
        holidays: next.map((r) => ({
          date: r.date,
          closed: r.closed,
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
      <p className="text-gray-400 mb-6">
        Ustaw dni zamknięcia (np. 15 sierpnia), żeby nikt nie złożył zamówienia.
      </p>

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
          <label className="text-xs text-gray-400 block mb-1">Label</label>
          <InputText
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Święto"
          />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <InputSwitch checked={closed} onChange={(e) => setClosed(Boolean(e.value))} />
          <span>{t('HolidayClosed')}</span>
        </div>
        <Button
          label={t('AddHoliday')}
          loading={loading}
          className="bg-primary-color border-primary-color"
          onClick={() => {
            if (!date) return;
            const ymd = toYmd(date);
            if (rows.some((r) => r.date === ymd)) return;
            persist([
              ...rows,
              {
                key: ymd,
                date: ymd,
                closed,
                label: label || ymd,
              },
            ]);
            setDate(null);
            setLabel('');
            setClosed(true);
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
                {r.label} · {r.closed ? t('HolidayClosed') : 'Open hours'}
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
          <p className="text-gray-400">Brak wyjątków — obowiązuje tygodniowy grafik.</p>
        )}
      </div>
    </div>
  );
}
