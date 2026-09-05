<script setup>
const route = useRoute()
const { listProducts } = useStoreProducts()
const { data: products } = await useAsyncData('product-catalog', listProducts)
const product = products.value.find(item => item.slug === route.params.slug)
if (!product) throw createError({ statusCode: 404, statusMessage: 'Bijou introuvable' })

const cart = useCartStore()
const money = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
useSeoMeta({ title: `${product.name} — Maison JLA` })
</script>

<template>
  <section class="mx-auto max-w-7xl px-6 py-12">
    <NuxtLink to="/collections/tous-les-bijoux" class="text-xs uppercase tracking-widest">← Retour</NuxtLink>
    <div class="mt-8 grid gap-12 lg:grid-cols-2">
      <img :src="product.image" :alt="product.name" class="aspect-[4/5] w-full object-cover"
        :class="{ 'opacity-55': product.stock < 1 }">
      <div class="flex flex-col justify-center">
        <p class="text-xs uppercase tracking-widest text-[#9b712d]">{{ product.category }}</p>
        <h1 class="mt-3 font-serif text-5xl">{{ product.name }}</h1>
        <p class="mt-4 font-serif text-2xl">{{ money(product.price) }}</p>
        <p class="mt-6 whitespace-pre-line text-sm leading-7 text-[#776b64]">{{ product.description }}</p>
        <p v-if="product.stock < 1" class="mt-6 text-sm font-medium text-[#9b712d]">Ce bijou est actuellement en rupture
          de stock.</p>
        <button
          class="mt-8 bg-[#302722] px-6 py-4 text-xs uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="product.stock < 1" @click="cart.addItem(product)">{{ product.stock < 1 ? 'Rupture de stock'
            : 'Ajouter au panier' }}</button>
      </div>
    </div>
  </section>
</template>
