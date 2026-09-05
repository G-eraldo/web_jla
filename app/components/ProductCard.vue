<script setup>
defineProps({ product: { type: Object, required: true } })
const money = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
</script>

<template>
  <NuxtLink :to="`/produits/${product.slug}`" class="group block" :class="{ 'opacity-55': product.stock < 1 }">
    <div class="relative">
      <img :src="product.image" :alt="product.name" class="aspect-[4/5] w-full object-cover">
      <span v-if="product.stock < 1"
        class="absolute left-3 top-3 bg-[#302722] px-3 py-2 text-[10px] uppercase tracking-widest text-white">Rupture de
        stock</span>
    </div>
    <div class="flex justify-between pt-3">
      <div>
        <p class="font-serif text-xl">{{ product.name }}</p>
        <p class="text-[10px] uppercase tracking-widest text-[#887971]">{{ product.category }}</p>
      </div>
      <span>{{ money(product.price) }}</span>
    </div>
  </NuxtLink>
</template>
