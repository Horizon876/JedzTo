'use client';

import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { TabView, TabPanel } from 'primereact/tabview';
import {
  GET_RESTAURANT_SETTLEMENTS,
} from '@/lib/api/graphql/queries/settlements';
import { SETTLE_RESTAURANT_PERIOD } from '@/lib/api/graphql/mutations/settlements';

function periodOptions() {
  const now = new Date();
  const opts = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    opts.push({ label: key, value: key });
  }
  return opts;
}

function money(n: number) {
  return `${Number(n || 0).toFixed(2)} zł`;
}

export default function SettlementsScreen() {
  const t = useTranslations();
  const options = periodOptions();
  
  // Zakładki: 0 = Bieżący, 1 = Historia
  const [activeTab, setActiveTab] = useState(0);
  
  // Dla zakładki Historia, domyślnie wybieramy poprzedni miesiąc (indeks 1, jeśli istnieje)
  const [historyPeriodKey, setHistoryPeriodKey] = useState(options[1]?.value || options[0]?.value);

  const currentPeriodKey = options[0].value;
  const periodKey = activeTab === 0 ? currentPeriodKey : historyPeriodKey;
  const { data, loading, refetch } = useQuery(GET_RESTAURANT_SETTLEMENTS, {
    variables: { periodKey },
    fetchPolicy: 'cache-and-network',
  });
  const [settle, { loading: settling }] = useMutation(SETTLE_RESTAURANT_PERIOD, {
    onCompleted: () => refetch(),
  });

  const [printData, setPrintData] = useState<any>(null);

  useEffect(() => {
    if (printData) {
      setTimeout(() => window.print(), 100);
    }
    const handleAfterPrint = () => setPrintData(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [printData]);

  const rows = data?.restaurantSettlements || [];
  const totals = useMemo(() => {
    return rows.reduce(
      (acc: any, r: any) => ({
        gross: acc.gross + Number(r.totalGross || 0),
        payout: acc.payout + Number(r.onlinePayoutDue || 0),
        owed: acc.owed + Number(r.cashCommissionOwed || 0),
        commission: acc.commission + Number(r.commissionDue || 0),
      }),
      { gross: 0, payout: 0, owed: 0, commission: 0 }
    );
  }, [rows]);

  return (
    <>
      {printData && (
        <div className="hidden print:block bg-white text-black min-h-screen p-10 font-sans absolute top-0 left-0 w-full z-[99999]">
          <div className="max-w-3xl mx-auto border border-gray-200 p-8 rounded-lg">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-widest text-gray-800">Raport Rozliczeniowy</h1>
                <p className="text-gray-500 mt-1">Okres: <span className="font-semibold">{printData.periodKey}</span></p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-800">{printData.restaurantName}</h2>
                <p className="text-gray-500">Identyfikator: {printData.restaurantId?.slice(-6)}</p>
              </div>
            </div>
            
            <div className="mb-8 grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-500 uppercase">Obrót Online</p>
                <p className="text-xl font-semibold">{money(printData.onlineGross)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-500 uppercase">Obrót Gotówkowy</p>
                <p className="text-xl font-semibold">{money(printData.cashGross)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg col-span-2 border border-gray-100">
                <p className="text-sm text-gray-500 uppercase">Całkowity Obrót</p>
                <p className="text-2xl font-bold">{money(printData.totalGross)}</p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 border-b pb-2">Rozliczenie Prowizji</h3>
              <table className="w-full text-left">
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 text-gray-600">Stawka prowizji</td>
                    <td className="py-3 font-semibold text-right">{printData.commissionRate}%</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 text-gray-600">Prowizja (od zamówień online)</td>
                    <td className="py-3 font-semibold text-right">{money(printData.commissionOnOnline)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 text-gray-600">Prowizja (od zamówień w gotówce)</td>
                    <td className="py-3 font-semibold text-right">{money(printData.commissionOnCash)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="py-3 px-2 font-bold text-gray-800">Suma należnej prowizji</td>
                    <td className="py-3 px-2 font-bold text-right text-gray-800">{money(printData.commissionDue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-10">
              {(() => {
                const finalPayout = Number(printData.onlineGross || 0) - Number(printData.commissionDue || 0);
                if (finalPayout > 0) {
                  return (
                    <div className="border-2 border-green-500 bg-green-50 p-6 rounded-lg text-center">
                      <p className="text-sm text-green-700 uppercase font-bold tracking-wider mb-2">DO WYPŁATY DLA RESTAURACJI</p>
                      <p className="text-4xl font-bold text-green-600">{money(finalPayout)}</p>
                    </div>
                  );
                } else if (finalPayout < 0) {
                  return (
                    <div className="border-2 border-red-500 bg-red-50 p-6 rounded-lg text-center">
                      <p className="text-sm text-red-700 uppercase font-bold tracking-wider mb-2">DO ZWROTU OD RESTAURACJI NA RZECZ PLATFORMY</p>
                      <p className="text-4xl font-bold text-red-600">{money(-finalPayout)}</p>
                    </div>
                  );
                } else {
                  return (
                    <div className="border-2 border-gray-300 bg-gray-50 p-6 rounded-lg text-center">
                      <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-2">ROZLICZONO NA ZERO</p>
                      <p className="text-4xl font-bold text-gray-600">{money(0)}</p>
                    </div>
                  );
                }
              })()}
            </div>
            
            <div className="mt-12 text-center text-sm text-gray-400">
              <p>Wygenerowano automatycznie z systemu JedzTo</p>
            </div>
          </div>
        </div>
      )}

      <div className="screen-container p-4 text-white bg-dark-950 min-h-full print:hidden">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary-color">
            Finanse i Rozliczenia
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Zestawienie prowizji i ostatecznych bilansów do wypłaty
          </p>
        </div>
      </div>

      <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)} className="mb-6">
        <TabPanel header="Bieżący miesiąc">
        </TabPanel>
        <TabPanel header="Poprzednie miesiące">
          <div className="pt-2 pb-4">
            <span className="text-gray-400 mr-3">Wybierz miesiąc:</span>
            <Dropdown
              value={historyPeriodKey}
              options={options.slice(1)} // Pomijamy bieżący miesiąc
              onChange={(e) => setHistoryPeriodKey(e.value)}
              className="w-40"
            />
          </div>
        </TabPanel>
      </TabView>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: t('OnlineGross') + ' + cash', value: totals.gross },
          { label: t('CommissionDue'), value: totals.commission },
          { label: t('OnlinePayoutDue'), value: totals.payout },
          { label: t('CashOwedToPlatform'), value: totals.owed },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-dark-600 bg-dark-900 p-4"
          >
            <div className="text-xs uppercase tracking-wide text-gray-400">
              {card.label}
            </div>
            <div className="mt-2 text-xl font-bold text-primary-color">
              {money(card.value)}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400">Loadingâ€¦</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r: any) => (
            <div
              key={`${r.restaurantId}-${r.periodKey}`}
              className="rounded-xl border border-dark-600 bg-dark-900 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{r.restaurantName}</h2>
                  <p className="text-sm text-gray-400">
                    {t('CommissionPercent')}: {r.commissionRate}% ·{' '}
                    {r.status === 'SETTLED' ? t('Settled') : t('OpenPeriod')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.status !== 'SETTLED' ? (
                    <Button
                      label={t('MarkSettled')}
                      loading={settling}
                      onClick={() =>
                        settle({
                          variables: {
                            restaurantId: r.restaurantId,
                            periodKey: r.periodKey,
                          },
                        })
                      }
                      className="bg-primary-color border-primary-color"
                    />
                  ) : (
                    <span className="rounded-lg bg-[#30D158]/15 px-3 py-1 text-sm font-bold text-[#30D158]">
                      {t('Settled')}
                    </span>
                  )}
                  <Button
                    label="Drukuj PDF"
                    icon="pi pi-file-pdf"
                    severity="secondary"
                    className="p-button-outlined"
                    onClick={() => setPrintData(r)}
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <div className="text-gray-400">{t('OnlineGross')}</div>
                  <div className="font-semibold">{money(r.onlineGross)}</div>
                </div>
                <div>
                  <div className="text-gray-400">{t('CashGross')}</div>
                  <div className="font-semibold">{money(r.cashGross)}</div>
                </div>
                <div>
                  <div className="text-gray-400">{t('CommissionDue')}</div>
                  <div className="font-semibold">{money(r.commissionDue)}</div>
                </div>
                <div className="bg-dark-800 p-2 rounded-md border border-dark-600">
                  <div className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Ostateczne rozliczenie</div>
                  {(() => {
                    const finalPayout = Number(r.onlineGross || 0) - Number(r.commissionDue || 0);
                    if (finalPayout > 0) return <div className="font-bold text-[#30D158]">Platforma wypłaca: {money(finalPayout)}</div>;
                    if (finalPayout < 0) return <div className="font-bold text-[#FF9F0A]">Restauracja dopłaca: {money(-finalPayout)}</div>;
                    return <div className="font-bold text-gray-400">Na zero (0.00 zł)</div>;
                  })()}
                </div>
              </div>
            </div>
          ))}
          {!rows.length && (
            <p className="text-gray-400">Brak restauracji / zamówień w tym miesiącu.</p>
          )}
        </div>
      )}
    </div>
    </>
  );
}
