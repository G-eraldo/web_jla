<script setup>
defineProps({ product: { type: Object, required: true } })
const money = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
</script>

<template>
  <NuxtLink :to="`/produits/${product.slug}`" class="group block min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#947756]">
    <div class="relative overflow-hidden bg-[#f0e8e0]">
      <img :src="product.image" :alt="product.name" loading="lazy" decoding="async" width="640" height="800" class="aspect-[4/5] w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.035]" :class="{ 'opacity-65': product.stock < 1 }">
      <span v-if="product.stock < 1"
        class="absolute left-2 top-2 bg-[#fffaf5]/95 px-2.5 py-2 text-[9px] uppercase tracking-widest text-[#78695f] sm:left-3 sm:top-3">Épuisé</span>
      <span aria-hidden="true" class="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#fffaf5]/95 text-[#382b25] transition-transform group-hover:translate-x-0.5"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></span>
    </div>
    <div class="pt-3.5 sm:pt-4">
      <p class="text-[9px] uppercase tracking-[0.16em] text-[#887971]">{{ product.category }}</p>
      <h3 class="mt-1.5 font-serif text-base leading-snug text-[#382b25] transition-colors group-hover:text-[#947756] sm:text-xl">{{ product.name }}</h3>
      <p class="mt-2 text-xs text-[#5f5047] sm:text-sm">{{ money(product.price) }}</p>
    </div>
  </NuxtLink>
</template>
