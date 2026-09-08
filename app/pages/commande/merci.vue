<script setup>
definePageMeta({ layout: 'default' })

useSeoMeta({ title: 'Merci pour votre commande — Maison JLA', robots: 'noindex, nofollow' })

const route = useRoute()
const cart = useCartStore()
const paymentStatus = ref('pending')

onMounted(async () => {
  if (typeof route.query.reference !== 'string' || !route.query.reference) return
  cart.clearCart()
  try {
    const result = await $fetch('/api/mollie/status', { query: { reference: route.query.reference } })
    paymentStatus.value = result.status
  } catch {
    paymentStatus.value = 'pending'
  }
})
</script>

<template>
  <section class="mx-auto max-w-2xl px-6 py-28 text-center">
    <p class="text-xs uppercase tracking-widest text-[#9b712d]">Retour de paiement</p>
    <h1 class="mt-5 font-serif text-5xl">Merci infiniment.</h1>
    <p v-if="paymentStatus === 'paid'" class="mx-auto mt-6 max-w-lg text-sm leading-6 text-[#776b64]">Votre paiement est confirmé. Votre e-mail de confirmation et votre facture vont vous parvenir.</p>
    <p v-else class="mx-auto mt-6 max-w-lg text-sm leading-6 text-[#776b64]">Nous vérifions votre paiement de façon sécurisée.
      Vous recevrez un e-mail de confirmation dès qu’il sera validé.</p>
    <NuxtLink to="/collections/tous-les-bijoux"
      class="mt-8 inline-block bg-[#302722] px-6 py-4 text-xs uppercase tracking-widest text-white">Continuer la
      découverte</NuxtLink>
  </section>
</template>
