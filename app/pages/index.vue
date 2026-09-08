<script setup>
definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Maison JLA — Les petits détails, les grands coups de cœur', description: 'Colliers, bracelets, bagues et boucles d’oreilles : découvrez les bijoux fantaisie Maison JLA et trouvez votre touche de lumière.' })
const { listProducts } = useStoreProducts()
const { data: products, pending, error } = await useAsyncData('products', listProducts)
const categories = computed(() => [
  { slug: 'colliers', name: 'Colliers', note: 'Tout près du cœur' },
  { slug: 'boucles', name: 'Boucles d’oreilles', note: 'Une touche d’éclat' },
  { slug: 'bracelets', name: 'Bracelets', note: 'Au fil des gestes' },
  { slug: 'bagues', name: 'Bagues', note: 'Le détail qui change tout' },
].map(category => ({ ...category, image: products.value?.find(product => product.categorySlug === category.slug)?.image })))
const selection = computed(() => {
  const available = (products.value || []).filter(product => product.stock > 0)
  const distinct = categories.value.map(category => available.find(product => product.categorySlug === category.slug)).filter(Boolean)
  return [...distinct, ...available.filter(product => !distinct.includes(product))].slice(0, 4)
})
const hero = computed(() => selection.value.find(product => product.categorySlug === 'colliers') || selection.value[0])
</script>

<template>
  <div>
    <section class="grid overflow-hidden bg-[#f2e9e2] lg:grid-cols-2">
      <div class="flex flex-col justify-center px-6 py-14 sm:px-12 sm:py-20 lg:px-20 xl:pl-28">
        <p class="text-[10px] font-medium uppercase tracking-[.24em] text-[#8a653e]">Maison JLA · Bijoux fantaisie</p>
        <h1 class="mt-6 max-w-lg font-serif text-5xl leading-[1.08] tracking-tight sm:text-6xl xl:text-7xl">Un petit
          détail.<br>Un grand <span class="italic text-[#916b56]">coup de cœur.</span></h1>
        <p class="mt-7 max-w-sm text-sm leading-7 text-[#776b64]">Des bijoux à choisir pour soi, à offrir avec le cœur
          et à porter au gré de ses envies.</p>
        <NuxtLink to="/collections/tous-les-bijoux"
          class="mt-8 inline-flex min-h-12 w-fit items-center gap-8 bg-[#302722] px-7 py-4 text-xs text-white transition hover:bg-[#654b3d]">
          Trouver mon bijou </NuxtLink>
        <p class="mt-7 text-xs text-[#776b64]">Colliers, bracelets, bagues & boucles d’oreilles</p>
      </div>
      <div class="relative min-h-80 bg-[#e6d7c7] sm:min-h-[460px] lg:min-h-[590px]">
        <img v-if="hero" :src="hero.image" :alt="hero.name" fetchpriority="high"
          class="absolute inset-0 h-full w-full object-cover object-center">
        <NuxtLink v-if="hero" :to="`/produits/${hero.slug}`"
          class="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-4 bg-[#fffaf6]/95 px-5 py-4 text-sm sm:bottom-8 sm:left-8 sm:right-8">
          <span><span class="mb-1 block text-[9px] uppercase tracking-[.18em] text-[#887971]">Sous les
              projecteurs</span>{{ hero.name }}</span>
        </NuxtLink>
      </div>
    </section>

    <div class="border-b border-[#e9ddd3] px-6 py-5">
      <div class="mx-auto grid max-w-5xl gap-3 text-center text-[11px] text-[#776b64] sm:grid-cols-3"><span>Paiement
          sécurisé avec Mollie</span><span>Livraison offerte dès 60 € d’achat</span><span>Confirmation de commande
          par e-mail</span></div>
    </div>

    <section class="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
      <div class="mb-8 text-center">
        <p class="text-[10px] uppercase tracking-[.22em] text-[#9b712d]">À chaque envie, son bijou</p>
        <h2 class="mt-3 font-serif text-3xl sm:text-4xl">Et vous, plutôt…</h2>
      </div>
      <div class="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        <NuxtLink v-for="category in categories" :key="category.slug" :to="`/collections/${category.slug}`"
          class="group">
          <div class="aspect-[4/5] overflow-hidden rounded-t-full bg-[#f2e9e2]"><img v-if="category.image"
              :src="category.image" alt="" loading="lazy"
              class="h-full w-full object-cover transition duration-500 motion-safe:group-hover:scale-105"></div>
          <div class="mt-4 text-center">
            <h3 class="font-serif text-xl sm:text-2xl">{{ category.name }}</h3>
            <p class="mt-1 text-xs text-[#776b64]">{{ category.note }}</p>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section class="border-y border-[#e9ddd3] bg-[#f8f2ed]">
      <div class="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <div class="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p class="text-[10px] uppercase tracking-[.22em] text-[#9b712d]">La sélection Maison JLA</p>
            <h2 class="mt-3 font-serif text-3xl sm:text-4xl">À porter, à aimer.</h2>
          </div>
          <NuxtLink to="/collections/tous-les-bijoux" class="border-b border-[#302722] pb-1 text-xs">Voir tous les
            bijoux </NuxtLink>
        </div>
        <p v-if="pending" role="status" class="py-10 text-sm">Nos bijoux arrivent…</p>
        <p v-else-if="error" role="alert" class="py-10 text-sm">La sélection est momentanément indisponible.</p>
        <div v-else-if="selection.length" class="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-6 lg:grid-cols-4">
          <ProductCard v-for="product in selection" :key="product.id" :product="product" />
        </div>
        <p v-else class="py-10 text-sm">La prochaine sélection se prépare. Retrouvez toutes les pièces dans la boutique.
        </p>
      </div>
    </section>

    <section class="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:px-8 sm:py-24 md:grid-cols-2 md:items-center md:gap-20">
      <div class="flex min-h-72 flex-col items-center justify-center bg-[#f2e2de] p-10 text-center"><span
          class="text-xs uppercase tracking-[.3em] text-[#916b56]">L’esprit Maison JLA</span>
        <p class="mt-6 font-serif text-4xl leading-tight sm:text-5xl">Le plaisir<br>des jolies <span
            class="italic">choses.</span></p><span aria-hidden="true" class="mt-8 text-3xl text-[#916b56]">✧</span>
      </div>
      <div>
        <p class="text-[10px] uppercase tracking-[.22em] text-[#9b712d]">Des bijoux, des envies, vous.</p>
        <h2 class="mt-4 font-serif text-3xl leading-tight sm:text-4xl">Votre quotidien mérite<br>sa touche de lumière.
        </h2>
        <p class="mt-6 max-w-md text-sm leading-7 text-[#776b64]">Un collier délicat, une bague qui attire le regard,
          des boucles qui donnent le sourire. Maison JLA vous invite à trouver ces petits détails qui vous ressemblent.
        </p>
        <NuxtLink to="/la-maison" class="mt-7 inline-block border-b border-[#302722] pb-2 text-xs">Découvrir la maison
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
