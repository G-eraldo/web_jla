<script setup>
definePageMeta({ layout: 'default', robots: false })
useSeoMeta({ title: 'Paiement annulé', robots: 'noindex, nofollow' })
</script>

<template>
  <section class="mx-auto max-w-2xl px-6 py-28 text-center">
    <p class="text-xs uppercase tracking-widest text-[#9b712d]">Paiement annulé</p>
    <h1 class="mt-5 font-serif text-5xl">Votre panier vous attend.</h1>
    <p class="mx-auto mt-6 max-w-lg text-sm leading-6 text-[#776b64]">Aucun paiement n’a été validé et aucun article n’est déduit de votre commande. Vous pouvez reprendre votre achat quand vous le souhaitez.</p>
    <NuxtLink to="/checkout" class="mt-8 inline-block bg-[#302722] px-6 py-4 text-xs uppercase tracking-widest text-white">Retourner au panier</NuxtLink>
  </section>
</template>
