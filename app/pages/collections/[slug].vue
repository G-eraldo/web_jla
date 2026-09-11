<script setup>
import { collectionSeo, COLLECTION_SEO } from '~/lib/seo'

definePageMeta({ layout: 'default' })
const route = useRoute()
const labels = Object.fromEntries(Object.entries(COLLECTION_SEO).map(([slug, item]) => [slug, item.title]))
const seo = computed(() => collectionSeo(route.params.slug))
if (!seo.value) throw createError({ statusCode: 404, message: 'Collection introuvable' })
const title = computed(() => seo.value.title)
useSeoMeta({
  title: () => seo.value.title,
  description: () => seo.value.description,
  ogTitle: () => seo.value.title,
  ogDescription: () => seo.value.description
})
const { listProducts } = useStoreProducts()
const { data: products, pending, error, refresh } = await useAsyncData('product-catalog', listProducts, { default: () => [] })
useSchemaOrg([
  defineItemList({
    name: () => seo.value.title,
    itemListElement: () => (products.value || [])
      .filter(product => route.params.slug === 'tous-les-bijoux' || product.categorySlug === route.params.slug)
      .slice(0, 12)
      .map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: product.name,
        url: `/produits/${product.slug}`
      }))
  })
])
const search = ref('')
const sort = ref('selection')
const availableOnly = ref(false)
const page = ref(1)
const pageSize = 12
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const filteredProducts = computed(() => {
  const query = normalize(search.value.trim())
  const result = (products.value || []).filter(product =>
    (route.params.slug === 'tous-les-bijoux' || product.categorySlug === route.params.slug)
    && (!availableOnly.value || product.stock > 0)
    && (!query || normalize(`${product.name} ${product.category}`).includes(query))
  )
  if (sort.value === 'price-asc') result.sort((a, b) => a.price - b.price)
  if (sort.value === 'price-desc') result.sort((a, b) => b.price - a.price)
  if (sort.value === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return result
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredProducts.value.length / pageSize)))
const visibleProducts = computed(() => filteredProducts.value.slice((page.value - 1) * pageSize, page.value * pageSize))
watch([search, sort, availableOnly, () => route.params.slug], () => { page.value = 1 })
watch(pageCount, count => { page.value = Math.min(page.value, count) })
function resetFilters() { search.value = ''; availableOnly.value = false; sort.value = 'selection' }
function changePage(nextPage) {
  page.value = nextPage
  document.getElementById('catalogue-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div>
    <section class="border-b border-[#e8ded5] bg-[#f6eee9] px-5 py-12 text-center sm:px-8 sm:py-16">
      <p class="text-[10px] uppercase tracking-[0.25em] text-[#947756]">La collection Maison JLA</p>
      <h1 class="mt-4 font-serif text-4xl text-[#382b25] sm:text-6xl">{{ title }}</h1>
      <p class="mx-auto mt-5 max-w-lg text-sm leading-7 text-[#78695f]">Des bijoux à choisir pour soi, à offrir, à porter encore et encore. Le plus beau détail, c’est le vôtre.</p>
    </section>
    <section class="mx-auto max-w-7xl px-5 pb-16 pt-7 sm:px-8 sm:pb-24">
      <nav aria-label="Catégories de bijoux" class="flex flex-wrap justify-center gap-2 border-b border-[#e8ded5] pb-7">
        <NuxtLink v-for="(label, slug) in labels" :key="slug" :to="`/collections/${slug}`" :aria-current="route.params.slug === slug ? 'page' : undefined" class="rounded-full border px-4 py-2.5 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#947756]" :class="route.params.slug === slug ? 'border-[#382b25] bg-[#382b25] text-white' : 'border-[#e8ded5] text-[#78695f] hover:border-[#947756] hover:text-[#382b25]'">{{ label }}</NuxtLink>
      </nav>
      <div class="grid gap-4 py-7 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <div class="relative">
          <label for="catalogue-search" class="sr-only">Rechercher un bijou</label>
          <svg aria-hidden="true" class="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[#947756]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
          <input id="catalogue-search" v-model="search" type="search" placeholder="Rechercher un bijou…" class="min-h-12 w-full rounded-none border border-[#e8ded5] bg-white py-3 pl-12 pr-4 text-sm text-[#382b25] outline-none focus:border-[#947756]">
        </div>
        <label class="flex min-h-12 cursor-pointer items-center gap-3 text-xs text-[#78695f] lg:px-4"><input v-model="availableOnly" type="checkbox" class="h-4 w-4 accent-[#382b25]"> En stock uniquement</label>
        <div class="flex items-center gap-3 sm:col-span-2 lg:col-span-1">
          <label for="catalogue-sort" class="shrink-0 text-xs text-[#78695f]">Trier par</label>
          <select id="catalogue-sort" v-model="sort" class="min-h-12 w-full border border-[#e8ded5] bg-white px-3 py-3 text-xs text-[#382b25] outline-none focus:border-[#947756] lg:w-auto"><option value="selection">Notre sélection</option><option value="price-asc">Prix croissant</option><option value="price-desc">Prix décroissant</option><option value="name">Nom : A à Z</option></select>
        </div>
      </div>
      <div id="catalogue-results" class="scroll-mt-28">
        <p class="mb-5 text-xs text-[#78695f]" role="status" aria-live="polite">{{ pending ? 'Les bijoux arrivent…' : `${filteredProducts.length} bijou${filteredProducts.length > 1 ? 'x' : ''}` }}</p>
        <div v-if="pending" class="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-6 md:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Chargement des bijoux"><div v-for="item in 8" :key="item" class="aspect-[4/5] animate-pulse bg-[#f0e8e0]" /></div>
        <div v-else-if="error" role="alert" class="bg-[#f6eee9] px-6 py-12 text-center"><h2 class="font-serif text-2xl">La collection se fait attendre</h2><p class="mt-3 text-sm text-[#78695f]">Nous n’avons pas pu charger les bijoux. Réessayez dans un instant.</p><button type="button" class="mt-6 border-b border-[#382b25] pb-1 text-sm" @click="refresh()">Réessayer</button></div>
        <div v-else-if="visibleProducts.length" class="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4"><ProductCard v-for="product in visibleProducts" :key="product.id" :product="product" /></div>
        <div v-else class="bg-[#f6eee9] px-6 py-14 text-center"><h2 class="font-serif text-2xl">Aucun bijou pour cette recherche</h2><p class="mt-3 text-sm leading-6 text-[#78695f]">Essayez un autre nom ou découvrez le reste de notre collection.</p><button v-if="search || availableOnly" type="button" class="mt-6 bg-[#382b25] px-6 py-3 text-xs text-white" @click="resetFilters">Effacer les filtres</button><NuxtLink v-else to="/collections/tous-les-bijoux" class="mt-6 inline-block bg-[#382b25] px-6 py-3 text-xs text-white">Voir tous les bijoux</NuxtLink></div>
      </div>
      <nav v-if="pageCount > 1" aria-label="Pagination des bijoux" class="mt-12 flex items-center justify-center gap-3 border-t border-[#e8ded5] pt-8"><button type="button" :disabled="page === 1" class="min-h-11 border border-[#e8ded5] px-4 text-xs transition-colors hover:border-[#947756] disabled:cursor-not-allowed disabled:opacity-35" @click="changePage(page - 1)">Précédent</button><span class="px-2 text-xs text-[#78695f]">{{ page }} / {{ pageCount }}</span><button type="button" :disabled="page === pageCount" class="min-h-11 border border-[#e8ded5] px-4 text-xs transition-colors hover:border-[#947756] disabled:cursor-not-allowed disabled:opacity-35" @click="changePage(page + 1)">Suivant</button></nav>
    </section>
  </div>
</template>
