<script setup>
definePageMeta({ layout: 'default', robots: false })
useSeoMeta({ title: 'Merci pour votre commande', robots: 'noindex, nofollow' })

const route = useRoute()
const cart = useCartStore()
const paymentStatus = ref('pending')
let statusTimer
let statusAttempts = 0

async function refreshPaymentStatus(reference) {
  try {
    const result = await $fetch('/api/mollie/sync', { method: 'POST', body: { reference } })
    paymentStatus.value = result.status
  } catch {
    paymentStatus.value = 'pending'
  }

  if (['paid', 'refund_pending', 'refunded', 'refund_review', 'refund_failed'].includes(paymentStatus.value)) {
    cart.clearCart()
    return
  }

  if (['canceled', 'failed', 'expired'].includes(paymentStatus.value)) {
    await navigateTo({ path: '/commande/paiement-annule', query: { reference } }, { replace: true })
    return
  }

  statusAttempts += 1
  if (paymentStatus.value === 'pending' && statusAttempts < 6) {
    statusTimer = setTimeout(() => refreshPaymentStatus(reference), 2000)
  }
}

onMounted(() => {
  if (typeof route.query.reference !== 'string' || !route.query.reference) return
  refreshPaymentStatus(route.query.reference)
})

onBeforeUnmount(() => clearTimeout(statusTimer))
</script>

<template>
  <section class="mx-auto max-w-2xl px-6 py-28 text-center">
    <p class="text-xs uppercase tracking-widest text-[#9b712d]">Retour de paiement</p>
    <h1 class="mt-5 font-serif text-5xl">Merci infiniment.</h1>
    <p v-if="paymentStatus === 'paid'" class="mx-auto mt-6 max-w-lg text-sm leading-6 text-[#776b64]">Votre paiement est
      confirmé. Votre e-mail de confirmation et votre facture vont vous parvenir.</p>
    <p v-else-if="paymentStatus === 'refund_pending'" class="mx-auto mt-6 max-w-lg text-sm leading-6 text-[#776b64]">Votre paiement a été reçu, mais nous ne pouvons pas préparer cette commande. Son remboursement est en cours. Vous recevrez un e-mail de suivi dès que possible.</p>
    <p v-else-if="paymentStatus === 'refunded'" class="mx-auto mt-6 max-w-lg text-sm leading-6 text-[#776b64]">Ce paiement a été remboursé. Le remboursement peut prendre quelques jours ouvrés pour apparaître sur votre compte. Contactez-nous si vous avez besoin d’aide.</p>
    <p v-else-if="['refund_review', 'refund_failed'].includes(paymentStatus)" role="alert" class="mx-auto mt-6 max-w-lg text-sm leading-6 text-[#776b64]">Votre paiement nécessite une vérification. Nous faisons le nécessaire ; contactez contact@maisonjla.fr si vous n’avez pas reçu de nouvelles.</p>
    <p v-else class="mx-auto mt-6 max-w-lg text-sm leading-6 text-[#776b64]">Nous vérifions votre paiement de façon
      sécurisée.
      Vous recevrez un e-mail de confirmation dès qu’il sera validé.</p>
    <NuxtLink to="/collections/tous-les-bijoux"
      class="mt-8 inline-block bg-[#302722] px-6 py-4 text-xs uppercase tracking-widest text-white">Continuer la
      découverte</NuxtLink>
  </section>
</template>
