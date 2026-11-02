'use client'

import { useContext, useEffect, useMemo, useState } from 'react'
import { useMutation } from '@apollo/client'
import { useTranslations } from 'next-intl'

import { FoodsContext } from '@/lib/context/restaurant/foods.context'
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context'
import { useQueryGQL } from '@/lib/hooks/useQueryQL'
import useToast from '@/lib/hooks/useToast'
import {
  DELETE_FOOD,
  GET_FOODS_BY_RESTAURANT_ID,
  UPDATE_FOOD_OUT_OF_STOCK,
} from '@/lib/api/graphql'
import {
  IFood,
  IFoodByRestaurantResponse,
  IFoodNew,
  IQueryResult,
  IVariationForm,
} from '@/lib/utils/interfaces'
import Image from '@/lib/ui/useable-components/safe-image'
import CustomInputSwitch from '@/lib/ui/useable-components/custom-input-switch'
import CustomDialog from '@/lib/ui/useable-components/delete-dialog'
import CustomTextField from '@/lib/ui/useable-components/input-field'

function priceOf(food: IFoodNew) {
  const p = food.variations?.[0]?.price
  return p != null ? `${Number(p).toFixed(2)} zł` : '—'
}

export default function FoodsMain() {
  const t = useTranslations()
  const { showToast } = useToast()
  const { restaurantLayoutContextData } = useContext(RestaurantLayoutContext)
  const { onSetFoodContextData, onFoodFormVisible } = useContext(FoodsContext)
  const restaurantId = restaurantLayoutContextData?.restaurantId || ''

  const [foodItems, setFoodItems] = useState<IFoodNew[]>([])
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState({ id: '', categoryId: '' })
  const [stockLoadingId, setStockLoadingId] = useState('')

  const {
    data: foodsData,
    loading,
    refetch,
  } = useQueryGQL(
    GET_FOODS_BY_RESTAURANT_ID,
    { id: restaurantId },
    {
      fetchPolicy: 'cache-and-network',
      enabled: !!restaurantId,
    }
  ) as IQueryResult<IFoodByRestaurantResponse | undefined, undefined>

  const [deleteFood, { loading: deleting }] = useMutation(DELETE_FOOD, {
    onCompleted: () => {
      showToast({
        type: 'success',
        title: t('Delete Food'),
        message: t('Food has been deleted successfully'),
      })
      setDeleteId({ id: '', categoryId: '' })
      refetch()
    },
  })

  const [updateFoodOutOfStock] = useMutation(UPDATE_FOOD_OUT_OF_STOCK, {
    refetchQueries: [
      {
        query: GET_FOODS_BY_RESTAURANT_ID,
        variables: { id: restaurantId },
      },
    ],
    onCompleted: () => setStockLoadingId(''),
    onError: () => {
      setStockLoadingId('')
      showToast({
        type: 'error',
        title: t('Food Stock'),
        message: t('Food Stock status failed'),
      })
    },
  })

  useEffect(() => {
    if (!foodsData?.restaurant?.categories) return
    const refined: IFoodNew[] = []
    foodsData.restaurant.categories.forEach((ctg) => {
      ctg.foods.forEach((fd: IFood) => {
        refined.push({
          __typename: fd.__typename,
          _id: fd._id,
          description: fd.description,
          image: fd.image,
          isActive: fd.isActive,
          isOutOfStock: fd.isOutOfStock,
          subCategory: { code: fd.subCategory || '', label: '' },
          category: { code: ctg._id, label: ctg.title },
          title: fd.title,
          ingredients: fd.ingredients || [],
          variations: fd.variations,
        })
      })
    })
    setFoodItems(refined)
  }, [foodsData])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return foodItems
    return foodItems.filter(
      (f) =>
        f.title?.toLowerCase().includes(q) ||
        f.category?.label?.toLowerCase().includes(q)
    )
  }, [foodItems, search])

  const grouped = useMemo(() => {
    const map = new Map<string, IFoodNew[]>()
    for (const item of filtered) {
      const key = item.category?.label || t('Category')
      const list = map.get(key) || []
      list.push(item)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [filtered, t])

  const openEdit = (data: IFoodNew) => {
    const variations =
      (data.variations?.map(({ discounted, ...variation }) => ({
        ...variation,
        discounted,
        addons: (variation.addons || []).map((addonId: string) => ({
          code: addonId,
          label: addonId,
        })),
      })) as IVariationForm[]) || []

    onSetFoodContextData({
      food: {
        _id: data._id,
        data,
        variations,
      },
      isEditing: true,
    })
    onFoodFormVisible(true)
  }

  return (
    <div className="panel-list-screen">
      <div className="mb-4 max-w-md">
        <CustomTextField
          type="text"
          name="menu-search"
          showLabel={false}
          placeholder={t('Keyword Search')}
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
        />
      </div>

      {loading && !foodItems.length ? (
        <p className="text-[var(--panel-muted)]">{t('Loading')}…</p>
      ) : null}

      {!loading && !filtered.length ? (
        <p className="text-[var(--panel-muted)]">{t('NoData')}</p>
      ) : null}

      <div className="flex flex-col gap-6">
        {grouped.map(([category, items]) => (
          <section key={category}>
            <h3 className="mb-2 mt-0 text-xs font-bold uppercase tracking-wide text-[var(--panel-muted)]">
              {category}
            </h3>
            <div className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-white">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-3 border-b border-[var(--panel-border)] px-3 py-3 last:border-b-0"
                >
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-[#F5F7FA]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        width={56}
                        height={56}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="min-w-0 flex-1 bg-transparent p-0 text-left"
                    onClick={() => openEdit(item)}
                  >
                    <div className="truncate font-semibold text-[var(--panel-text)]">
                      {item.title}
                    </div>
                    <div className="text-sm text-[var(--panel-muted)]">
                      {priceOf(item)}
                    </div>
                  </button>
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        item.isOutOfStock
                          ? 'text-[#FF9F0A]'
                          : 'text-[#30D158]'
                      }`}
                    >
                      {item.isOutOfStock ? t('OutOfStock') : t('Available')}
                    </span>
                    <CustomInputSwitch
                      loading={stockLoadingId === item._id}
                      isActive={!item.isOutOfStock}
                      onChange={async () => {
                        setStockLoadingId(item._id)
                        await updateFoodOutOfStock({
                          variables: {
                            id: item._id,
                            categoryId: item.category?.code,
                            restaurant: restaurantId,
                          },
                        })
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-sm font-semibold text-[var(--primary-color)]"
                    onClick={() => openEdit(item)}
                  >
                    {t('Edit')}
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-sm font-semibold text-red-500"
                    onClick={() =>
                      setDeleteId({
                        id: item._id,
                        categoryId: item.category?.code || '',
                      })
                    }
                  >
                    {t('Delete')}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <CustomDialog
        loading={deleting}
        visible={!!deleteId?.id}
        onHide={() => setDeleteId({ id: '', categoryId: '' })}
        onConfirm={() => {
          deleteFood({
            variables: { ...deleteId, restaurant: restaurantId },
          })
        }}
        message={t('Are you sure you want to delete this option?')}
      />
    </div>
  )
}
