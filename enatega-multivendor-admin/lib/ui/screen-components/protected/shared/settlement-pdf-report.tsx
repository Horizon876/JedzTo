'use client'

import {
  finalSettlementBalance,
  moneyPln,
} from '@/lib/utils/settlement-period'

export type SettlementPdfData = {
  periodKey?: string
  restaurantName?: string
  onlineGross?: number
  cashGross?: number
  totalGross?: number
  commissionRate?: number
  commissionOnOnline?: number
  commissionOnCash?: number
  commissionDue?: number
  cashFeeDue?: number
}

export default function SettlementPdfReport({
  data,
}: {
  data: SettlementPdfData
}) {
  const onlineGross = Number(data.onlineGross || 0)
  const commissionOnOnline = Number(data.commissionOnOnline || 0)
  const commissionOnCash = Number(data.commissionOnCash || 0)
  const commissionDue = Number(data.commissionDue || 0)
  const cashFeeDue = Number(data.cashFeeDue || 0)
  const amount = finalSettlementBalance({
    onlineGross,
    commissionDue,
    cashFeeDue,
  })
  const afterOnlineCommission = onlineGross - commissionOnOnline

  return (
    <div className="absolute left-0 top-0 z-[99999] hidden min-h-screen w-full bg-white p-10 font-sans text-black print:block">
      <div className="mx-auto max-w-3xl rounded-lg border border-gray-200 p-8">
        <div className="mb-8 flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-widest text-gray-800">
              Raport Rozliczeniowy
            </h1>
            <p className="mt-1 text-gray-500">
              Okres:{' '}
              <span className="font-semibold">
                {String(data.periodKey || '')}
              </span>
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-800">
              {String(data.restaurantName || '')}
            </h2>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm uppercase text-gray-500">Obrót Online</p>
            <p className="text-xl font-semibold">{moneyPln(onlineGross)}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm uppercase text-gray-500">Obrót Gotówkowy</p>
            <p className="text-xl font-semibold">
              {moneyPln(Number(data.cashGross || 0))}
            </p>
          </div>
          <div className="col-span-2 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm uppercase text-gray-500">Całkowity Obrót</p>
            <p className="text-2xl font-bold">
              {moneyPln(Number(data.totalGross || 0))}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="mb-4 border-b pb-2 text-lg font-bold">
            Rozliczenie prowizji
          </h3>
          <table className="w-full text-left">
            <tbody>
              <tr className="border-b">
                <td className="py-3 text-gray-600">Stawka prowizji</td>
                <td className="py-3 text-right font-semibold">
                  {String(data.commissionRate || 0)}%
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-gray-600">
                  Prowizja od płatności online
                </td>
                <td className="py-3 text-right font-semibold">
                  {moneyPln(commissionOnOnline)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-gray-600">Prowizja od gotówki</td>
                <td className="py-3 text-right font-semibold">
                  {moneyPln(commissionOnCash)}
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-2 py-3 font-bold text-gray-800">
                  Suma należnej prowizji
                </td>
                <td className="px-2 py-3 text-right font-bold text-gray-800">
                  {moneyPln(commissionDue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-8">
          <h3 className="mb-2 border-b pb-2 text-lg font-bold">
            Kompensata (rozliczenie końcowe)
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            Płatności online trafiają na konto platformy, a gotówkę zbiera lokal.
            Prowizja liczona jest od produktów, dostawy, ewentualnej opłaty za
            transport oraz opłaty za płatność gotówką. Sama opłata gotówkowa
            należy w całości do platformy — nie wchodzi do obrotu lokalu. Zamiast
            osobnych przelewów w obie strony, należności lokalu są{' '}
            <strong>potrącane z wypłaty online</strong> (kompensata).
          </p>
          <table className="w-full text-left">
            <tbody>
              <tr className="border-b">
                <td className="py-3 text-gray-600">
                  Środki z płatności online (u platformy)
                </td>
                <td className="py-3 text-right font-semibold">
                  {moneyPln(onlineGross)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-gray-600">− Prowizja od online</td>
                <td className="py-3 text-right font-semibold">
                  −{moneyPln(commissionOnOnline)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-gray-600">
                  = Po potrąceniu prowizji online
                </td>
                <td className="py-3 text-right font-semibold">
                  {moneyPln(afterOnlineCommission)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-gray-600">
                  − Prowizja od gotówki (kompensata)
                </td>
                <td className="py-3 text-right font-semibold">
                  −{moneyPln(commissionOnCash)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-gray-600">
                  − Opłata za płatność gotówką (dla platformy)
                </td>
                <td className="py-3 text-right font-semibold">
                  −{moneyPln(cashFeeDue)}
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-2 py-3 font-bold text-gray-800">
                  {amount > 0
                    ? 'Do wypłaty dla restauracji'
                    : amount < 0
                      ? 'Do zwrotu od restauracji'
                      : 'Saldo po kompensacie'}
                </td>
                <td className="px-2 py-3 text-right font-bold text-gray-800">
                  {moneyPln(Math.abs(amount))}
                </td>
              </tr>
            </tbody>
          </table>
          {commissionOnCash > 0 && amount > 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              Lokal zatrzymał gotówkę u siebie. Należną prowizję od gotówki (
              {moneyPln(commissionOnCash)})
              {cashFeeDue > 0
                ? ` oraz opłatę transakcyjną (${moneyPln(cashFeeDue)})`
                : ''}{' '}
              odjęto od wypłaty online.
            </p>
          ) : null}
          {cashFeeDue > 0 && commissionOnCash <= 0 && amount > 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              Opłata za płatność gotówką ({moneyPln(cashFeeDue)}) należy do
              platformy i została potrącona z wypłaty.
            </p>
          ) : null}
          {amount < 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              Należności przekraczają środki online u platformy. Różnicę (
              {moneyPln(-amount)}) lokal dopłaca platformie (prowizja
              {cashFeeDue > 0
                ? ` + opłata gotówkowa ${moneyPln(cashFeeDue)}`
                : ''}
              ).
            </p>
          ) : null}
          {amount === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              Po kompensacie nie ma kwoty do wypłaty ani do dopłaty.
            </p>
          ) : null}
        </div>

        <div className="mt-6">
          {amount > 0 ? (
            <div className="rounded-lg border-2 border-green-500 bg-green-50 p-6 text-center">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-green-700">
                Do wypłaty dla restauracji
              </p>
              <p className="text-4xl font-bold text-green-600">
                {moneyPln(amount)}
              </p>
              <p className="mt-2 text-sm text-green-800">
                Platforma przelewa tę kwotę na konto lokalu
              </p>
            </div>
          ) : amount < 0 ? (
            <div className="rounded-lg border-2 border-red-500 bg-red-50 p-6 text-center">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-red-700">
                Do zwrotu od restauracji
              </p>
              <p className="text-4xl font-bold text-red-600">
                {moneyPln(-amount)}
              </p>
              <p className="mt-2 text-sm text-red-800">
                Lokal przelewa tę kwotę na konto platformy
              </p>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-gray-300 bg-gray-50 p-6 text-center">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                Rozliczono na zero
              </p>
              <p className="text-4xl font-bold text-gray-600">{moneyPln(0)}</p>
            </div>
          )}
        </div>

        <div className="mt-12 text-center text-sm text-gray-400">
          <p>Wygenerowano automatycznie z systemu JedzTo</p>
        </div>
      </div>
    </div>
  )
}
