import { fetchAllStrapiPages } from '../../../app/lib/strapi-pagination.js'

export default defineSitemapEventHandler(async () => {
  const config = useRuntimeConfig()
  const strapiUrl = String(config.public.strapiUrl || '').replace(/\/$/, '')
  const collections = ['tous-les-bijoux', 'colliers', 'boucles', 'bracelets', 'bagues']
  const urls = collections.map(slug => ({
    loc: `/collections/${slug}`,
    changefreq: 'daily',
    priority: slug === 'tous-les-bijoux' ? 0.9 : 0.8
  }))

  try {
    const products = await fetchAllStrapiPages(({ page, pageSize }) =>
      $fetch(`${strapiUrl}/api/products`, {
        query: {
          'fields[0]': 'slug',
          'fields[1]': 'updatedAt',
          'populate[images][fields][0]': 'url',
          'pagination[page]': page,
          'pagination[pageSize]': pageSize
        }
      })
    )
    for (const product of products) {
      if (!product.slug) continue
      const image = product.images?.[0]?.url
      urls.push({
        loc: `/produits/${product.slug}`,
        lastmod: product.updatedAt,
        changefreq: 'weekly',
        priority: 0.8,
        ...(image ? { images: [{ loc: image.startsWith('/') ? `${strapiUrl}${image}` : image }] } : {})
      })
    }
  } catch {
    // The file-based pages remain in the sitemap even if Strapi is unreachable.
  }

  return urls
})
