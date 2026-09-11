<script setup>
const { listProducts } = useStoreProducts()
const cart = useCartStore()
const { data: products } = await useAsyncData('product-catalog', listProducts)
watch(products, catalog => {
  if (catalog) cart.hydrateFromCatalog(catalog)
}, { immediate: true })
</script>

<template>
  <a href="#main-content" class="sr-only z-50 bg-white p-4 focus:fixed focus:left-4 focus:top-4 focus:not-sr-only">Aller
    au contenu</a>
  <AppHeader />
  <main id="main-content" tabindex="-1">
    <slot />
  </main>
  <AppFooter />
</template>
