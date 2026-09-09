<script setup>
definePageMeta({ key: route => route.params.slug })

const route = useRoute()
const { listProducts } = useStoreProducts()
const { data: products, pending, error, refresh } = await useAsyncData('product-catalog', listProducts)
const product = computed(() => products.value?.find(item => item.slug === route.params.slug))
if (!pending.value && !error.value && !product.value) throw createError({ statusCode: 404, statusMessage: 'Bijou introuvable' })

const cart = useCartStore()
const added = ref(false)
const announcement = ref('')
const quantityInCart = computed(() => cart.items.find(item => item.id === product.value?.id)?.quantity || 0)
const available = computed(() => Math.max(0, (product.value?.stock || 0) - quantityInCart.value))
const categories = { colliers: 'Colliers', boucles: 'Boucles d’oreilles', bracelets: 'Bracelets', bagues: 'Bagues' }
const category = computed(() => categories[product.value?.categorySlug] ? { label: categories[product.value.categorySlug], to: `/collections/${product.value.categorySlug}` } : { label: 'Tous les bijoux', to: '/collections/tous-les-bijoux' })
const suggestions = computed(() => (products.value || []).filter(item => item.id !== product.value?.id && item.stock > 0).sort((a, b) => Number(b.categorySlug === product.value?.categorySlug) - Number(a.categorySlug === product.value?.categorySlug)).slice(0, 4))
const money = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
function addToCart() {
  if (!product.value || available.value < 1) return
  cart.addItem(product.value)
  added.value = true
  announcement.value = `${product.value.name} ajouté au panier. Quantité dans votre panier : ${quantityInCart.value}.`
}
watch(() => route.params.slug, () => { added.value = false; announcement.value = '' })
useSeoMeta({
  title: () => `${product.value?.name || 'Nos bijoux'} — Maison JLA`,
  description: () => product.value?.description?.slice(0, 160),
  ogTitle: () => `${product.value?.name || 'Nos bijoux'} — Maison JLA`,
  ogDescription: () => product.value?.description?.slice(0, 160),
  ogImage: () => product.value?.image
})
</script>

<template>
  <section class="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
    <p v-if="pending" role="status" class="py-20 text-center text-sm text-[#776b64]">Votre bijou se prépare…</p>
    <div v-else-if="error" role="alert" class="py-20 text-center">
      <h1 class="font-serif text-3xl">La fiche n’a pas pu être chargée.</h1>
      <button type="button" class="mt-6 min-h-12 bg-[#302722] px-6 text-sm text-white" @click="refresh()">Réessayer</button>
    </div>
    <template v-else-if="product">
      <nav aria-label="Fil d’Ariane" class="flex flex-wrap items-center gap-2 text-[11px] leading-6 text-[#776b64] sm:gap-3 sm:text-xs">
        <NuxtLink to="/" class="hover:underline">Accueil</NuxtLink><span aria-hidden="true">/</span>
        <NuxtLink :to="category.to" class="hover:underline">{{ category.label }}</NuxtLink><span aria-hidden="true">/</span>
        <span aria-current="page" class="text-[#302722]">{{ product.name }}</span>
      </nav>
      <div class="mt-6 grid items-start gap-8 sm:mt-8 lg:grid-cols-2 lg:gap-16 xl:gap-24">
        <div class="relative overflow-hidden bg-[#f0e8e0]">
          <img :src="product.image" :alt="product.name" width="800" height="1000" fetchpriority="high" class="aspect-[4/5] w-full object-cover" :class="{ 'opacity-65': product.stock < 1 }">
          <span class="absolute left-4 top-4 bg-[#fffaf6]/95 px-3 py-2 text-[9px] uppercase tracking-[.16em]">Maison JLA</span>
        </div>
        <div class="py-2 lg:py-8">
          <NuxtLink :to="category.to" class="text-[10px] uppercase tracking-[.2em] text-[#986c35] hover:underline">{{ category.label }}</NuxtLink>
          <h1 class="mt-4 font-serif text-4xl leading-[1.08] text-[#302722] sm:text-5xl xl:text-6xl">{{ product.name }}</h1>
          <p class="mt-5 text-xl text-[#514137] sm:text-2xl">{{ money(product.price) }}</p>
          <div class="my-7 h-px bg-[#e9ddd3]" />
          <p class="whitespace-pre-line text-sm leading-7 text-[#776b64]">{{ product.description }}</p>
          <section v-if="product.safety" aria-labelledby="safety-title" class="mt-7 border-y border-[#e9ddd3] py-5 text-sm leading-6 text-[#514137]">
            <h2 id="safety-title" class="font-serif text-2xl text-[#302722]">Sécurité et traçabilité</h2>
            <dl class="mt-4 space-y-3 text-xs leading-6 text-[#776b64]">
              <div><dt class="font-medium text-[#302722]">Référence</dt><dd>{{ product.safety.productReference }}<template v-if="product.safety.batchNumber"> · Lot {{ product.safety.batchNumber }}</template></dd></div>
              <div><dt class="font-medium text-[#302722]">Composition</dt><dd>{{ product.safety.mainMaterials }}</dd></div>
              <div><dt class="font-medium text-[#302722]">Fabricant</dt><dd>{{ product.safety.manufacturerBrand }} — {{ product.safety.manufacturerCompany }}<br><span class="whitespace-pre-line">{{ product.safety.manufacturerPostalAddress }}</span><br><a :href="`mailto:${product.safety.manufacturerEmail}`" class="underline underline-offset-4">{{ product.safety.manufacturerEmail }}</a></dd></div>
              <div><dt class="font-medium text-[#302722]">Avertissements</dt><dd class="whitespace-pre-line">{{ product.safety.safetyWarnings }}</dd></div>
            </dl>
          </section>
          <p v-if="product.stock < 1" class="mt-7 text-sm text-[#986c35]">Ce bijou est actuellement épuisé.</p>
          <p v-else class="mt-7 flex items-center gap-2 text-xs text-[#646b51]"><span class="h-1.5 w-1.5 rounded-full bg-[#78805e]" />Disponible</p>
          <ClientOnly>
            <button type="button" class="mt-4 flex min-h-14 w-full items-center justify-center bg-[#302722] px-5 text-sm text-white transition hover:bg-[#514137] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50" :disabled="available < 1" @click="addToCart">
              {{ product.stock < 1 ? 'Rupture de stock' : available < 1 ? 'Quantité disponible déjà au panier' : added ? 'Ajouter un autre exemplaire' : 'Ajouter au panier' }}
            </button>
            <template #fallback><button type="button" disabled class="mt-4 min-h-14 w-full bg-[#302722] px-5 text-sm text-white opacity-50">Ajouter au panier</button></template>
          </ClientOnly>
          <p role="status" aria-live="polite" aria-atomic="true" class="mt-3 text-sm leading-6 text-[#646b51]">{{ announcement }}</p>
          <NuxtLink v-if="added" to="/checkout" class="mt-2 flex min-h-12 items-center justify-center border border-[#302722] px-5 text-sm transition hover:bg-[#f3e9e2]">Finaliser ma commande →</NuxtLink>
          <p class="mt-4 text-center text-[11px] text-[#776b64]">Paiement sécurisé par Mollie</p>
          <div class="mt-8 border-y border-[#e9ddd3] py-5">
            <p class="text-sm">À votre porte, ou tout près de chez vous.</p>
            <p class="mt-2 text-xs leading-6 text-[#776b64]">À domicile ou en point relais, la livraison est offerte dès 60 € d’achat.</p>
            <NuxtLink to="/livraison" class="mt-2 inline-flex min-h-8 items-center text-xs underline underline-offset-4">Tout savoir sur la livraison</NuxtLink>
          </div>
        </div>
      </div>
      <section v-if="suggestions.length" aria-labelledby="suggestions-title" class="pb-12 pt-16 sm:pb-16 sm:pt-24">
        <div class="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p class="text-[10px] uppercase tracking-[.2em] text-[#986c35]">Les jolis accords</p><h2 id="suggestions-title" class="mt-3 font-serif text-3xl sm:text-4xl">Et si vous les aimiez aussi ?</h2></div>
          <NuxtLink to="/collections/tous-les-bijoux" class="py-2 text-xs underline underline-offset-4">Explorer la collection →</NuxtLink>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-6 lg:grid-cols-4"><ProductCard v-for="item in suggestions" :key="item.id" :product="item" /></div>
      </section>
    </template>
  </section>
</template>
