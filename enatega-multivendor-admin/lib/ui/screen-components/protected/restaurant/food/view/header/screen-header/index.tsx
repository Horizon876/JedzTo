import { useContext } from 'react'
import { useTranslations } from 'next-intl'
import { FoodsContext } from '@/lib/context/restaurant/foods.context'
import { PageHeader } from '@/lib/ui/screen-components/protected/layout/shared'
import PublishMenuButton from '@/lib/ui/screen-components/protected/restaurant/menu-publishing/publish-menu-button'

const FoodHeader = () => {
  const t = useTranslations()
  const { onFoodFormVisible } = useContext(FoodsContext)

  return (
    <PageHeader
      title={t('Products')}
      addLabel={t('Add Product')}
      onAdd={() => onFoodFormVisible(true)}
      actions={<PublishMenuButton />}
    />
  )
}

export default FoodHeader
