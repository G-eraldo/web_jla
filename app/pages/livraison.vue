<script setup>
definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Livraison & paiement — Maison JLA', description: 'Livraison offerte dès 60 € d’achat en France métropolitaine, à domicile ou en point relais, et paiement sécurisé.' })
</script>
<template>
  <section class="mx-auto max-w-5xl px-6 py-14 sm:py-20">
    <p class="text-[10px] uppercase tracking-[.22em] text-[#9b712d]">Pour commander sereinement</p>
    <h1 class="mt-4 font-serif text-4xl sm:text-5xl">Livraison & paiement</h1>
    <p class="mt-5 max-w-2xl text-sm leading-7 text-[#776b64]">En France métropolitaine, la livraison vous est offerte
      dès 60 € d’achat, à domicile comme en point relais. En dessous de ce montant, choisissez l’option qui vous
      convient.</p>
    <div class="my-10 grid gap-5 sm:grid-cols-2">
      <section class="bg-[#f2e9e2] p-7">
        <p class="text-xs uppercase tracking-widest">En point relais</p>
        <h2 class="mt-3 font-serif text-3xl">Mondial Relay · 4,90 €</h2>
        <p class="mt-4 text-sm leading-7 text-[#776b64]">Choisissez votre point relais lors de la commande, à partir de
          votre code postal. Livraison offerte dès 60 € d’achat.</p>
      </section>
      <section class="bg-[#f2e2de] p-7">
        <p class="text-xs uppercase tracking-widest">Chez vous</p>
        <h2 class="mt-3 font-serif text-3xl">À domicile · 6,90 €</h2>
        <p class="mt-4 text-sm leading-7 text-[#776b64]">Renseignez votre adresse de livraison. Les frais sont affichés
          dans le récapitulatif avant le paiement et offerts dès 60 € d’achat.</p>
      </section>
    </div>
    <div class="divide-y divide-[#e9ddd3]">
      <section class="py-7">
        <h2 class="font-serif text-2xl">Comment se passe le paiement ?</h2>
        <p class="mt-3 text-sm leading-7 text-[#776b64]">Le paiement est traité par Mollie sur sa page sécurisée. Les
          moyens de paiement disponibles y sont présentés. Une fois le paiement confirmé, vous recevez un e-mail
          récapitulatif.</p>
      </section>
      <section class="py-7">
        <h2 class="font-serif text-2xl">Où retrouver ma commande ?</h2>
        <p class="mt-3 text-sm leading-7 text-[#776b64]">Conservez l’e-mail de confirmation et votre référence de
          commande. Vérifiez également vos courriers indésirables si vous ne retrouvez pas le message.</p>
      </section>
      <section class="py-7">
        <h2 class="font-serif text-2xl">Une question sur votre commande ?</h2>
        <p class="mt-3 text-sm leading-7 text-[#776b64]">Les coordonnées de Maison JLA sont disponibles dans les
          <NuxtLink to="/mentions-legales" class="underline underline-offset-4">mentions légales</NuxtLink>. Pensez à
          préciser votre référence de commande.
        </p>
      </section>
    </div>
    <NuxtLink to="/collections/tous-les-bijoux" class="mt-8 inline-flex bg-[#302722] px-7 py-4 text-sm text-white">
      Découvrir les bijoux</NuxtLink>
  </section>
</template>
