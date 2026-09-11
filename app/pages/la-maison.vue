<script setup>
definePageMeta({ layout: 'default' })
useSeoMeta({
  title: 'L’esprit de la maison',
  description: 'L’univers Maison JLA : des bijoux fantaisie à choisir selon vos envies, pour soi ou pour offrir, sans attendre une grande occasion.',
  ogTitle: 'L’esprit de la maison',
  ogDescription: 'Des bijoux fantaisie à choisir selon vos envies, pour soi ou pour offrir.'
})
</script>
<template>
  <div>
    <section class="bg-[#f2e2de] px-6 py-16 text-center sm:py-24">
      <p class="text-[10px] uppercase tracking-[.24em] text-[#916b56]">La maison</p>
      <h1 class="mx-auto mt-5 max-w-2xl font-serif text-4xl leading-tight sm:text-6xl">Les jolis détails font<br>les
        beaux <span class="italic">jours.</span></h1>
    </section>
    <section class="mx-auto grid max-w-5xl gap-10 px-6 py-16 sm:py-24 md:grid-cols-2 md:gap-20">
      <h2 class="font-serif text-3xl leading-snug sm:text-4xl">Un bijou n’a pas besoin<br>d’une grande occasion.</h2>
      <div class="space-y-5 text-sm leading-7 text-[#776b64]">
        <p>Il y a les bijoux que l’on offre et ceux que l’on s’offre. Ceux que l’on choisit pour leur éclat, leur
          couleur, ou simplement parce qu’ils nous plaisent.</p>
        <p>C’est cet esprit que vous retrouvez chez Maison JLA : des bijoux fantaisie en acier inoxydable à porter à
          votre façon. Colliers,
          bracelets, bagues et boucles d’oreilles se rencontrent dans une collection à explorer au fil de vos envies.
        </p>
        <NuxtLink to="/collections/tous-les-bijoux" class="inline-flex bg-[#302722] px-6 py-3 text-white">Explorer la
          collection</NuxtLink>
      </div>
    </section>
  </div>
</template>
