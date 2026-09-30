import { fetchAllStrapiPages } from '../../../app/lib/strapi-pagination.js'

export default defineSitemapEventHandler(async () => {
  const config = useRuntimeConfig()
  const strapiUrl = String(config.public.strapiUrl || '').replace(/\/$/, '')
  const mediaPublicUrl = String(config.public.mediaPublicUrl || '').replace(/\/$/, '')
  const oldR2PublicOrigin = 'https://pub-559ed8ce04b047dd87b8709734cbe613.r2.dev'
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
      const imageUrl = image?.startsWith('/')
        ? `${strapiUrl}${image}`
        : mediaPublicUrl && image?.startsWith(`${oldR2PublicOrigin}/`)
          ? `${mediaPublicUrl}${image.slice(oldR2PublicOrigin.length)}`
          : image
      urls.push({
        loc: `/produits/${product.slug}`,
        lastmod: product.updatedAt,
        changefreq: 'weekly',
        priority: 0.8,
        ...(imageUrl ? { images: [{ loc: imageUrl }] } : {})
      })
    }
  } catch {
    // The file-based pages remain in the sitemap even if Strapi is unreachable.
  }

  return urls
})
