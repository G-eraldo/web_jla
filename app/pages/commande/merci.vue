<script setup>
definePageMeta({ layout: 'default' })

useSeoMeta({ title: 'Merci pour votre commande — Maison JLA', robots: 'noindex, nofollow' })

const route = useRoute()
const cart = useCartStore()

onMounted(() => {
  if (typeof route.query.reference === 'string' && route.query.reference) cart.clearCart()
})
</script>

<template>
  <section class="mx-auto max-w-2xl px-6 py-28 text-center">
    <p class="text-xs uppercase tracking-widest text-[#9b712d]">Retour de paiement</p>
    <h1 class="mt-5 font-serif text-5xl">Merci infiniment.</h1>
    <p class="mx-auto mt-6 max-w-lg text-sm leading-6 text-[#776b64]">Nous vérifions votre paiement de façon sécurisée.
      Vous recevrez un e-mail de confirmation dès qu’il sera validé.</p>
    <NuxtLink to="/collections/tous-les-bijoux"
      class="mt-8 inline-block bg-[#302722] px-6 py-4 text-xs uppercase tracking-widest text-white">Continuer la
      découverte</NuxtLink>
  </section>
</template>
