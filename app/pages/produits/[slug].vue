<script setup>
import { Check, ChevronDown, PackageCheck, ShieldCheck, ShoppingBag } from 'lucide-vue-next'

definePageMeta({ key: route => route.params.slug })

const route = useRoute()
const { listProducts } = useStoreProducts()
const { data: products, pending, error, refresh } = await useAsyncData('product-catalog', listProducts)
const product = computed(() => products.value?.find(item => item.slug === route.params.slug))
if (!pending.value && !error.value && !product.value) throw createError({ statusCode: 404, message: 'Bijou introuvable' })

const cart = useCartStore()
const added = ref(false)
const announcement = ref('')
const selectedImage = ref(0)
const quantityInCart = computed(() => cart.items.find(item => item.id === product.value?.id)?.quantity || 0)
const available = computed(() => Math.max(0, (product.value?.stock || 0) - quantityInCart.value))
const gallery = computed(() => product.value?.images?.length ? product.value.images : product.value?.image ? [product.value.image] : [])
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
watch(() => route.params.slug, () => { added.value = false; announcement.value = ''; selectedImage.value = 0 })
useSeoMeta({
  title: () => product.value?.name || 'Bijou Maison JLA',
  description: () => {
    const text = product.value?.description || 'Bijou fantaisie Maison JLA.'
    const price = product.value ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(product.value.price) : ''
    return `${text.slice(0, 120)}${price ? ` ${price}.` : ''} Livraison en France métropolitaine.`.slice(0, 160)
  },
  ogTitle: () => product.value?.name || 'Bijou Maison JLA',
  ogDescription: () => product.value?.description?.slice(0, 160),
  ogImage: () => product.value?.image,
  ogType: 'website'
})
useSchemaOrg([
  defineBreadcrumb({
    itemListElement: () => product.value
      ? [
          { name: 'Accueil', item: '/' },
          { name: category.value.label, item: category.value.to },
          { name: product.value.name }
        ]
      : []
  }),
  defineProduct({
    name: () => product.value?.name,
    description: () => product.value?.description,
    image: () => product.value?.images?.length ? product.value.images : product.value?.image,
    sku: () => product.value?.safety?.productReference,
    brand: { '@type': 'Brand', name: 'Maison JLA' },
    category: () => product.value?.category,
    offers: () => product.value
      ? defineOffer({
          price: product.value.price,
          priceCurrency: 'EUR',
          availability: product.value.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: `/produits/${product.value.slug}`,
          itemCondition: 'https://schema.org/NewCondition'
        })
      : undefined
  })
])
</script>

<template>
  <main class="mx-auto max-w-[1400px] px-5 pb-16 pt-6 sm:px-8 sm:pb-24 sm:pt-8">
    <p v-if="pending" role="status" class="py-20 text-center text-sm text-[#776b64]">Votre bijou se prépare…</p>
    <div v-else-if="error" role="alert" class="py-20 text-center">
      <h1 class="font-serif text-3xl">La fiche n’a pas pu être chargée.</h1>
      <button type="button" class="mt-6 min-h-12 bg-[#302722] px-6 text-sm text-white" @click="refresh()">Réessayer</button>
    </div>
    <div v-else-if="!product" class="py-20 text-center">
      <h1 class="font-serif text-3xl">Bijou introuvable.</h1>
      <NuxtLink to="/collections/tous-les-bijoux" class="mt-6 inline-block bg-[#302722] px-6 py-3 text-sm text-white">Voir tous les bijoux</NuxtLink>
    </div>
    <template v-else-if="product">
      <nav aria-label="Fil d’Ariane" class="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[.12em] text-[#8a7b72] sm:gap-3">
        <NuxtLink to="/" class="hover:underline">Accueil</NuxtLink><span aria-hidden="true">/</span>
        <NuxtLink :to="category.to" class="hover:underline">{{ category.label }}</NuxtLink><span aria-hidden="true">/</span>
        <span aria-current="page" class="text-[#302722]">{{ product.name }}</span>
      </nav>
      <div class="mt-6 grid items-start gap-9 lg:grid-cols-[minmax(0,1.18fr)_minmax(390px,.82fr)] lg:gap-12 xl:gap-20">
        <div class="grid gap-3 sm:gap-4" :class="{ 'sm:grid-cols-[72px_minmax(0,1fr)]': gallery.length > 1 }">
          <div v-if="gallery.length > 1" class="order-2 flex gap-3 overflow-x-auto sm:order-1 sm:flex-col">
            <button v-for="(image, index) in gallery" :key="image" type="button" class="shrink-0 border bg-[#f0e8e0] transition" :class="selectedImage === index ? 'border-[#302722]' : 'border-transparent opacity-65 hover:opacity-100'" :aria-label="`Afficher la vue ${index + 1} de ${product.name}`" :aria-pressed="selectedImage === index" @click="selectedImage = index">
              <img :src="image" alt="" width="72" height="90" class="h-[90px] w-[72px] object-cover">
            </button>
          </div>
          <div class="relative order-1 overflow-hidden bg-[#f0e8e0] sm:order-2">
            <img :src="gallery[selectedImage]" :alt="product.name" width="900" height="1125" fetchpriority="high" class="aspect-[4/5] w-full object-cover" :class="{ 'opacity-65': product.stock < 1 }">
            <span class="absolute left-4 top-4 bg-[#fffaf6]/90 px-3 py-2 text-[9px] uppercase tracking-[.18em] backdrop-blur-sm">Maison JLA</span>
          </div>
        </div>
        <div class="lg:sticky lg:top-40 lg:py-5">
          <div class="flex items-center justify-between gap-4">
            <NuxtLink :to="category.to" class="text-[10px] uppercase tracking-[.22em] text-[#986c35] hover:underline">{{ category.label }}</NuxtLink>
            <p v-if="product.stock > 0" class="flex items-center gap-2 text-[10px] uppercase tracking-[.14em] text-[#64704f]"><span class="h-1.5 w-1.5 rounded-full bg-[#78805e]" />En stock</p>
          </div>
          <h1 class="mt-5 font-serif text-4xl leading-[1.04] tracking-[-.02em] text-[#302722] sm:text-5xl xl:text-[3.5rem]">{{ product.name }}</h1>
          <p class="mt-4 text-lg text-[#514137]">{{ money(product.price) }}</p>
          <p class="mt-3 text-xs leading-6 text-[#776b64]">Garantie légale de conformité de deux ans et garantie des vices cachés. Aucune garantie commerciale n’est proposée. Vous disposez de 14 jours à compter du lendemain de la réception pour vous rétracter, sans motif ; les frais de retour sont à votre charge. <NuxtLink class="underline underline-offset-4" to="/retractation">Renoncer au contrat ici</NuxtLink>.</p>
          <p class="mt-7 whitespace-pre-line text-sm leading-7 text-[#776b64]">{{ product.description }}</p>
          <aside v-if="product.safety" class="mt-6 border border-[#e9ddd3] bg-[#fffaf6] p-4 text-xs leading-6 text-[#776b64]">
            <p class="font-medium uppercase tracking-[.14em] text-[#302722]">Sécurité et fabricant</p>
            <p class="mt-2 whitespace-pre-line">{{ product.safety.safetyWarnings }}</p>
            <p class="mt-2">{{ product.safety.mainMaterials }} · {{ product.safety.manufacturerBrand }} — {{ product.safety.manufacturerCompany }}</p>
            <p class="mt-1 whitespace-pre-line">{{ product.safety.manufacturerPostalAddress }} · <a :href="`mailto:${product.safety.manufacturerEmail}`" class="underline underline-offset-4">{{ product.safety.manufacturerEmail }}</a></p>
          </aside>
          <p v-if="product.stock < 1" class="mt-7 border-l-2 border-[#b58132] pl-4 text-sm leading-6 text-[#986c35]">Ce bijou est actuellement épuisé.</p>
          <ClientOnly>
            <button type="button" class="mt-8 flex min-h-14 w-full items-center justify-center gap-3 bg-[#302722] px-5 text-sm text-white transition hover:bg-[#514137] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50" :disabled="available < 1" @click="addToCart">
              <Check v-if="added && available > 0" class="h-4 w-4" />
              <ShoppingBag v-else class="h-4 w-4" />
              {{ product.stock < 1 ? 'Rupture de stock' : available < 1 ? 'Quantité disponible déjà au panier' : added ? 'Ajouter un autre exemplaire' : 'Ajouter au panier' }}
            </button>
            <template #fallback><button type="button" disabled class="mt-8 min-h-14 w-full bg-[#302722] px-5 text-sm text-white opacity-50">Ajouter au panier</button></template>
          </ClientOnly>
          <p role="status" aria-live="polite" aria-atomic="true" class="mt-3 text-center text-xs leading-6 text-[#646b51]">{{ announcement }}</p>
          <NuxtLink v-if="added" to="/checkout" class="mt-2 flex min-h-12 items-center justify-center border border-[#302722] px-5 text-sm transition hover:bg-[#f3e9e2]">Finaliser ma commande →</NuxtLink>
          <div class="mt-5 grid grid-cols-2 divide-x divide-[#e9ddd3] border-y border-[#e9ddd3] py-4 text-center">
            <div class="px-3"><ShieldCheck class="mx-auto h-5 w-5 text-[#986c35]" /><p class="mt-2 text-[10px] leading-4 text-[#776b64]">Paiement sécurisé<br>avec Mollie</p></div>
            <div class="px-3"><PackageCheck class="mx-auto h-5 w-5 text-[#986c35]" /><p class="mt-2 text-[10px] leading-4 text-[#776b64]">Livraison offerte<br>dès 60 €</p></div>
          </div>

          <div class="divide-y divide-[#e9ddd3] border-b border-[#e9ddd3]">
            <details class="group">
              <summary class="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm [&::-webkit-details-marker]:hidden">
                <span>Livraison & retours</span><ChevronDown class="h-4 w-4 shrink-0 text-[#986c35] transition-transform group-open:rotate-180" />
              </summary>
              <div class="pb-6 text-xs leading-6 text-[#776b64]">
                <p>Livraison à domicile ou en point relais, offerte dès 60 € d’achat. Vous disposez de 14 jours à compter du lendemain de la réception pour vous rétracter, sans motif. Les frais de retour sont à votre charge.</p>
                <NuxtLink to="/livraison" class="mt-2 inline-flex min-h-8 items-center underline underline-offset-4">Voir les délais et modalités</NuxtLink>
              </div>
            </details>
            <details v-if="product.safety" class="group">
              <summary class="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm [&::-webkit-details-marker]:hidden">
                <span>Sécurité, composition & traçabilité</span><ChevronDown class="h-4 w-4 shrink-0 text-[#986c35] transition-transform group-open:rotate-180" />
              </summary>
              <dl class="grid gap-x-6 gap-y-5 pb-7 text-xs leading-6 text-[#776b64] sm:grid-cols-2">
                <div><dt class="text-[10px] font-medium uppercase tracking-[.14em] text-[#302722]">Référence</dt><dd class="mt-1">{{ product.safety.productReference }}<template v-if="product.safety.batchNumber"> · Lot {{ product.safety.batchNumber }}</template></dd></div>
                <div><dt class="text-[10px] font-medium uppercase tracking-[.14em] text-[#302722]">Composition</dt><dd class="mt-1">{{ product.safety.mainMaterials }}</dd></div>
                <div class="sm:col-span-2"><dt class="text-[10px] font-medium uppercase tracking-[.14em] text-[#302722]">Fabricant</dt><dd class="mt-1">{{ product.safety.manufacturerBrand }} — {{ product.safety.manufacturerCompany }}<br><span class="whitespace-pre-line">{{ product.safety.manufacturerPostalAddress }}</span><br><a :href="`mailto:${product.safety.manufacturerEmail}`" class="underline underline-offset-4">{{ product.safety.manufacturerEmail }}</a></dd></div>
                <div class="sm:col-span-2"><dt class="text-[10px] font-medium uppercase tracking-[.14em] text-[#302722]">Avertissements</dt><dd class="mt-1 whitespace-pre-line">{{ product.safety.safetyWarnings }}</dd></div>
              </dl>
            </details>
          </div>
        </div>
      </div>
      <section v-if="suggestions.length" aria-labelledby="suggestions-title" class="pt-20 sm:pt-28">
        <div class="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p class="text-[10px] uppercase tracking-[.22em] text-[#986c35]">Les jolis accords</p><h2 id="suggestions-title" class="mt-3 font-serif text-3xl sm:text-4xl">À porter ensemble, ou pas.</h2></div>
          <NuxtLink to="/collections/tous-les-bijoux" class="py-2 text-xs underline underline-offset-4">Explorer la collection →</NuxtLink>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-6 lg:grid-cols-4"><ProductCard v-for="item in suggestions" :key="item.id" :product="item" /></div>
      </section>
    </template>
  </main>
</template>
