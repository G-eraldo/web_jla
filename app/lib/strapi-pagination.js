export const STRAPI_PAGE_SIZE = 100

export async function fetchAllStrapiPages(fetchPage, pageSize = STRAPI_PAGE_SIZE) {
  const records = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const response = await fetchPage({ page, pageSize })
    const data = Array.isArray(response?.data) ? response.data : []
    records.push(...data)

    const pageCount = Number(response?.meta?.pagination?.pageCount)
    hasNextPage = Number.isInteger(pageCount)
      ? page < pageCount
      : data.length === pageSize
    page += 1
  }

  return records
}
