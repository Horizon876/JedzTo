'use client'

import { Form, Formik } from 'formik'
import { useContext, useMemo } from 'react'
import { useMutation } from '@apollo/client'
import { Sidebar } from 'primereact/sidebar'
import { Chips } from 'primereact/chips'
import { useTranslations } from 'next-intl'
import * as Yup from 'yup'

import { FoodsContext } from '@/lib/context/restaurant/foods.context'
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context'
import { ToastContext } from '@/lib/context/global/toast.context'
import { useQueryGQL } from '@/lib/hooks/useQueryQL'
import {
  CREATE_FOOD,
  EDIT_FOOD,
  GET_CATEGORY_BY_RESTAURANT_ID,
  GET_FOODS_BY_RESTAURANT_ID,
} from '@/lib/api/graphql'
import {
  ICategory,
  ICategoryByRestaurantResponse,
  IFoodAddFormComponentProps,
  IQueryResult,
} from '@/lib/utils/interfaces'

import CustomTextField from '@/lib/ui/useable-components/input-field'
import CustomTextAreaField from '@/lib/ui/useable-components/custom-text-area-field'
import CustomDropdownComponent from '@/lib/ui/useable-components/custom-dropdown'
import CustomNumberField from '@/lib/ui/useable-components/number-input-field'
import CustomUploadImageComponent from '@/lib/ui/useable-components/upload/upload-image'
import CustomButton from '@/lib/ui/useable-components/button'

type SimpleFoodValues = {
  title: string
  description: string
  price: number | null
  category: { label: string; code: string } | null
  image: string
  ingredients: string[]
}

const schema = Yup.object({
  title: Yup.string().required('Required'),
  description: Yup.string(),
  price: Yup.number().min(0).required('Required'),
  category: Yup.object().nullable().required('Required'),
  image: Yup.string(),
  ingredients: Yup.array().of(Yup.string()),
})

export default function FoodForm({
  position = 'right',
}: IFoodAddFormComponentProps) {
  const t = useTranslations()
  const { showToast } = useContext(ToastContext)
  const { isFoodFormVisible, onClearFoodData, foodContextData } =
    useContext(FoodsContext)
  const {
    restaurantLayoutContextData: { restaurantId },
  } = useContext(RestaurantLayoutContext)

  const { data: categoriesData } = useQueryGQL(
    GET_CATEGORY_BY_RESTAURANT_ID,
    { id: restaurantId ?? '' },
    { fetchPolicy: 'cache-and-network', enabled: !!restaurantId }
  ) as IQueryResult<ICategoryByRestaurantResponse | undefined, undefined>

  const categories = useMemo(
    () =>
      (categoriesData?.restaurant?.categories || []).map((c: ICategory) => ({
        label: c.title,
        code: c._id,
      })),
    [categoriesData]
  )

  const editing = Boolean(foodContextData?.isEditing)
  const food = foodContextData?.food?.data
  const existingVariation = food?.variations?.[0]

  const initialValues: SimpleFoodValues = {
    title: food?.title || '',
    description: food?.description || '',
    price:
      existingVariation?.price != null ? Number(existingVariation.price) : null,
    category: food?.category?.code
      ? { label: food.category.label || '', code: food.category.code }
      : null,
    image: food?.image || '',
    ingredients: Array.isArray(food?.ingredients)
      ? food.ingredients.filter(Boolean)
      : [],
  }

  const [createFood, { loading: creating }] = useMutation(CREATE_FOOD, {
    refetchQueries: [
      { query: GET_FOODS_BY_RESTAURANT_ID, variables: { id: restaurantId } },
      { query: GET_CATEGORY_BY_RESTAURANT_ID, variables: { id: restaurantId } },
    ],
  })
  const [editFood, { loading: editingFood }] = useMutation(EDIT_FOOD, {
    refetchQueries: [
      { query: GET_FOODS_BY_RESTAURANT_ID, variables: { id: restaurantId } },
    ],
  })

  const saving = creating || editingFood

  return (
    <Sidebar
      visible={isFoodFormVisible}
      position={position}
      onHide={onClearFoodData}
      className="w-full border border-[var(--panel-border)] bg-white sm:w-[420px]"
    >
      <h2 className="mb-4 mt-0 text-xl font-bold text-[var(--panel-text)]">
        {editing ? t('Edit Product') : t('Add Product')}
      </h2>

      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={schema}
        onSubmit={async (values) => {
          try {
            const variation = {
              ...(existingVariation?._id ? { _id: existingVariation._id } : {}),
              title: 'Standard',
              price: Number(values.price || 0),
              discounted: existingVariation?.discounted || 0,
              addons: (existingVariation?.addons || [])
                .map((a: { code?: string } | string) =>
                  typeof a === 'string' ? a : a?.code
                )
                .filter(Boolean),
              isOutOfStock: Boolean(existingVariation?.isOutOfStock),
            }

            const foodInput = {
              _id: editing ? food?._id : undefined,
              restaurant: restaurantId,
              category: values.category?.code,
              title: values.title.trim(),
              description: values.description?.trim() || '',
              image: values.image || '',
              isActive: true,
              isOutOfStock: Boolean(food?.isOutOfStock),
              ingredients: (values.ingredients || [])
                .map((x) => String(x || '').trim())
                .filter(Boolean),
              variations: [variation],
            }

            if (editing) {
              await editFood({ variables: { foodInput } })
            } else {
              await createFood({ variables: { foodInput } })
            }

            showToast({
              type: 'success',
              title: t('Success'),
              message: editing
                ? t('FoodUpdatedSuccessfully')
                : t('FoodCreatedSuccessfully'),
            })
            onClearFoodData()
          } catch (error) {
            const message =
              error instanceof Error ? error.message : t('ActionFailedTryAgain')
            showToast({
              type: 'error',
              title: t('Error'),
              message,
            })
          }
        }}
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          setFieldValue,
          handleSubmit,
        }) => (
          <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <CustomTextField
              name="title"
              placeholder={t('Title')}
              showLabel
              value={values.title}
              onChange={handleChange}
              style={{
                borderColor:
                  touched.title && errors.title ? 'red' : undefined,
              }}
            />

            <CustomNumberField
              name="price"
              placeholder={t('Price')}
              showLabel
              min={0}
              value={values.price}
              onChange={(_name: string, val: number | null) =>
                setFieldValue('price', val)
              }
            />

            <CustomDropdownComponent
              name="category"
              placeholder={t('Category')}
              showLabel
              options={categories}
              selectedItem={values.category}
              setSelectedItem={(key: string, item: unknown) =>
                setFieldValue(key, item)
              }
            />

            <CustomTextAreaField
              name="description"
              placeholder={t('Description')}
              showLabel
              value={values.description}
              onChange={handleChange}
            />

            <div>
              <label
                htmlFor="ingredients"
                className="mb-1 block text-sm font-medium text-[var(--panel-text)]"
              >
                {t('Ingredients')}
              </label>
              <p className="mb-2 mt-0 text-xs text-[var(--panel-muted)]">
                {t('Ingredients hint')}
              </p>
              <Chips
                id="ingredients"
                name="ingredients"
                value={values.ingredients || []}
                onChange={(e) =>
                  setFieldValue('ingredients', e.value || [])
                }
                className="w-full"
                placeholder={t('Ingredients placeholder')}
                pt={{
                  container: {
                    className:
                      'w-full border border-[var(--panel-border)] bg-white',
                  },
                }}
              />
            </div>

            <CustomUploadImageComponent
              key="image"
              name="image"
              title={t('Upload Image')}
              fileTypes={['image/jpg', 'image/webp', 'image/jpeg', 'image/png']}
              maxFileHeight={841}
              maxFileWidth={1980}
              maxFileSize={5 * 1024 * 1024}
              orientation="LANDSCAPE"
              existingImageUrl={values.image}
              showExistingImage={Boolean(values.image)}
              onSetImageUrl={setFieldValue}
            />

            <div className="mt-2 flex gap-2">
              <CustomButton
                className="h-10 w-full border border-[var(--panel-border)] bg-white text-[var(--panel-text)]"
                label={t('Cancel')}
                type="button"
                onClick={onClearFoodData}
              />
              <CustomButton
                className="h-10 w-full bg-[var(--primary-color)] text-white"
                label={saving ? t('Loading') : t('Save')}
                type="submit"
                loading={saving}
              />
            </div>
          </Form>
        )}
      </Formik>
    </Sidebar>
  )
}
