<script setup>
import { LockKeyhole, Package, Truck } from 'lucide-vue-next';
</script>

<template>
  <footer class="bg-[#f3e9e2] text-[#302722]">
    <div class="border-b border-[#dfd1c7]">
      <div class="mx-auto grid max-w-7xl gap-6 px-6 py-8 sm:grid-cols-3 sm:gap-8 sm:px-8">
        <div class="flex items-center gap-4 sm:justify-center">
          <LockKeyhole class="h-5 w-5 shrink-0 text-[#986c35]" />
          <div>
            <p class="text-sm">Paiement sécurisé</p>
            <p class="mt-1 text-xs text-[#776b64]">En toute confiance avec Mollie</p>
          </div>
        </div>
        <div class="flex items-center gap-4 sm:justify-center">
          <Truck class="h-5 w-5 shrink-0 text-[#986c35]" />
          <div>
            <p class="text-sm">Livraison offerte dès 60 €</p>
            <p class="mt-1 text-xs text-[#776b64]">À domicile ou en point relais</p>
          </div>
        </div>
        <div class="flex items-center gap-4 sm:justify-center">
          <Package class="h-5 w-5 shrink-0 text-[#986c35]" />
          <div>
            <p class="text-sm">Le plaisir d’un joli détail</p>
            <p class="mt-1 text-xs text-[#776b64]">Pour vous ou pour offrir</p>
          </div>
        </div>
      </div>
    </div>
    <div
      class="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.6fr_1fr_1fr] lg:gap-16 lg:py-20">
      <div>
        <NuxtLink to="/" class="font-serif text-4xl tracking-wide">Maison JLA<span class="text-[#986c35]">.</span>
        </NuxtLink>
        <p class="mt-5 max-w-xs text-sm leading-7 text-[#776b64]">Des bijoux à aimer, à porter, à offrir.<br>Et ce petit
          supplément d’éclat qui change tout.</p>
        <NuxtLink to="/la-maison"
          class="mt-6 inline-flex min-h-11 items-center gap-3 border-b border-[#a48e7b] text-xs tracking-wide">L’univers
          de la Maison
        </NuxtLink>
      </div>
      <nav aria-label="Collections du pied de page">
        <h2 class="mb-4 text-[10px] uppercase tracking-[.2em] text-[#776b64]">Trouver votre coup de cœur</h2>
        <NuxtLink to="/collections/tous-les-bijoux" class="block py-2 text-sm hover:underline underline-offset-4">Tous
          les bijoux</NuxtLink>
        <NuxtLink to="/collections/colliers" class="block py-2 text-sm hover:underline underline-offset-4">Colliers
        </NuxtLink>
        <NuxtLink to="/collections/boucles" class="block py-2 text-sm hover:underline underline-offset-4">Boucles
          d’oreilles</NuxtLink>
        <NuxtLink to="/collections/bracelets" class="block py-2 text-sm hover:underline underline-offset-4">Bracelets
        </NuxtLink>
        <NuxtLink to="/collections/bagues" class="block py-2 text-sm hover:underline underline-offset-4">Bagues
        </NuxtLink>
      </nav>
      <nav aria-label="Informations du pied de page">
        <h2 class="mb-4 text-[10px] uppercase tracking-[.2em] text-[#776b64]">À vos côtés</h2>
        <NuxtLink to="/livraison" class="block py-2 text-sm hover:underline underline-offset-4">Livraison & questions
          fréquentes</NuxtLink>
        <NuxtLink to="/la-maison" class="block py-2 text-sm hover:underline underline-offset-4">La Maison</NuxtLink>
        <NuxtLink to="/contact" class="block py-2 text-sm hover:underline underline-offset-4">Contact</NuxtLink>
        <NuxtLink to="/mentions-legales" class="block py-2 text-sm hover:underline underline-offset-4">Mentions légales
        </NuxtLink>
        <NuxtLink to="/conditions-generales-de-vente" class="block py-2 text-sm hover:underline underline-offset-4">Conditions générales de vente
        </NuxtLink>
        <NuxtLink to="/retractation" class="block py-2 text-sm hover:underline underline-offset-4">Renoncer au contrat ici
        </NuxtLink>
        <NuxtLink to="/politique-confidentialite" class="block py-2 text-sm hover:underline underline-offset-4">
          Politique de confidentialité</NuxtLink>
      </nav>
    </div>
    <div
      class="mx-auto flex max-w-7xl flex-col gap-2 border-t border-[#dfd1c7] px-6 py-6 text-[11px] text-[#776b64] sm:flex-row sm:justify-between sm:px-8">
      <p>© Maison JLA. Tous droits réservés.</p>
      <p>Les jolis détails du quotidien.</p>
    </div>
  </footer>
</template>
