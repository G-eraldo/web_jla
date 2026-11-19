import { fetchAllStrapiPages } from '~/lib/strapi-pagination'

export function useJewelryCollections() {
  const { find } = useStrapi()
  return useAsyncData('jewelry-collections', () =>
    fetchAllStrapiPages(pagination => find('jewelry-collections', { pagination }))
  )
}
