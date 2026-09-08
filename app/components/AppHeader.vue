<script setup>
import { ArrowRight, Menu, ShoppingBag, X } from 'lucide-vue-next'

const cart = useCartStore()
const route = useRoute()
const cartDialog = ref(null)
const menuOpen = ref(false)
const navigation = [
  { label: 'Tous les bijoux', to: '/collections/tous-les-bijoux' },
  { label: 'Colliers', to: '/collections/colliers' },
  { label: 'Boucles d’oreilles', to: '/collections/boucles' },
  { label: 'Bracelets', to: '/collections/bracelets' },
  { label: 'Bagues', to: '/collections/bagues' },
  { label: 'La Maison', to: '/la-maison' }
]
const money = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
const openCart = () => {
  menuOpen.value = false
  cartDialog.value?.showModal()
}
const closeCart = () => cartDialog.value?.close()
watch(() => route.fullPath, () => {
  menuOpen.value = false
  closeCart()
})
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-[#e9ddd3] bg-[#fffaf6]/95 backdrop-blur-md">
    <div class="bg-[#302722] px-4 py-2.5 text-center text-[10px] tracking-[.12em] text-[#fffaf6] sm:text-xs">
      De petits bijoux. De grandes histoires. <span class="hidden sm:inline">— Livraison à domicile & en point
        relais</span>
    </div>
    <div class="relative mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 md:h-24">
      <button type="button"
        class="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-[#f6e7e6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 md:hidden"
        :aria-label="menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'" :aria-expanded="menuOpen"
        aria-controls="mobile-navigation" @click="menuOpen = !menuOpen">
        <X v-if="menuOpen" class="h-5 w-5" />
        <Menu v-else class="h-5 w-5" />
      </button>
      <NuxtLink to="/la-maison"
        class="hidden text-xs tracking-wide text-[#776b64] transition hover:text-[#302722] md:block">Des bijoux à votre
        image</NuxtLink>
      <NuxtLink to="/" aria-label="Maison JLA — Accueil" class="absolute left-1/2 -translate-x-1/2 text-center">
        <span class="block font-serif text-3xl tracking-[.08em] text-[#302722] sm:text-4xl">Maison JLA<span
            class="text-[#b58132]">.</span></span>
        <span class="mt-1 block text-[8px] uppercase tracking-[.35em] text-[#776b64]">Les jolis détails du
          quotidien</span>
      </NuxtLink>
      <button type="button"
        class="ml-auto flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2 text-xs transition hover:bg-[#f6e7e6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-3"
        aria-label="Ouvrir le panier" aria-haspopup="dialog" @click="openCart">
        <ShoppingBag class="h-5 w-5" /><span class="hidden sm:inline">Mon panier</span>
        <ClientOnly><span v-if="cart.itemCount"
            class="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#302722] px-1 text-[10px] text-white">{{
              cart.itemCount }}</span></ClientOnly>
      </button>
    </div>
    <nav aria-label="Navigation principale"
      class="hidden justify-center gap-9 border-t border-[#e9ddd3]/60 px-6 md:flex">
      <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to"
        class="border-b-2 border-transparent py-3.5 text-xs tracking-wide transition hover:border-[#b58132] hover:text-[#986c35]"
        active-class="!border-[#b58132] text-[#986c35]">{{ item.label }}</NuxtLink>
    </nav>
    <nav v-if="menuOpen" id="mobile-navigation" aria-label="Navigation mobile"
      class="max-h-[70dvh] overflow-y-auto border-t border-[#e9ddd3] px-6 pb-6 pt-2 md:hidden"
      @keydown.esc="menuOpen = false">
      <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to"
        class="flex items-center justify-between border-b border-[#e9ddd3] py-4 font-serif text-xl"
        @click="menuOpen = false">{{ item.label }}
        <ArrowRight class="h-4 w-4 text-[#9b712d]" />
      </NuxtLink>
      <NuxtLink to="/livraison" class="mt-5 block py-2 text-sm text-[#776b64]">Livraison & questions fréquentes
      </NuxtLink>
    </nav>
  </header>
  <Teleport to="body">
    <!-- Le dialog natif assure le focus modal et la fermeture avec Échap sans dépendance UI supplémentaire. -->
    <dialog ref="cartDialog" aria-labelledby="cart-title"
      class="fixed inset-y-0 right-0 left-auto m-0 ml-auto h-dvh max-h-none w-full max-w-md border-0 bg-[#fffaf6] p-0 text-[#302722] shadow-2xl backdrop:bg-[#302722]/40"
      @click="event => { if (event.target === cartDialog) closeCart() }">
      <div class="flex h-full flex-col p-6 sm:p-8">
        <div class="flex items-center justify-between border-b border-[#e9ddd3] pb-5">
          <h2 id="cart-title" class="font-serif text-3xl">Votre panier</h2>
          <button type="button" aria-label="Fermer le panier"
            class="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#f6e7e6]" @click="closeCart">
            <X class="h-5 w-5" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto py-6">
          <div v-if="!cart.items.length" class="py-16 text-center">
            <ShoppingBag class="mx-auto h-9 w-9 text-[#b58132]" />
            <p class="mt-6 font-serif text-2xl">Votre écrin attend ses bijoux.</p>
            <p class="mt-3 text-sm leading-6 text-[#776b64]">Un coup de cœur se cache peut-être dans la collection.</p>
            <NuxtLink to="/collections/tous-les-bijoux"
              class="mt-7 inline-flex min-h-12 items-center justify-center bg-[#302722] px-6 text-sm text-white"
              @click="closeCart">Découvrir les bijoux</NuxtLink>
          </div>
          <div v-for="item in cart.items" :key="item.id" class="flex gap-4 border-b border-[#e9ddd3] py-5 first:pt-0">
            <img v-if="item.image" :src="item.image" :alt="item.name"
              class="h-24 w-20 shrink-0 bg-[#f6e7e6] object-cover">
            <div class="min-w-0 flex-1">
              <p class="font-serif text-lg leading-snug">{{ item.name }}</p>
              <p class="mt-2 text-xs text-[#776b64]">Quantité : {{ item.quantity }}</p>
              <div class="mt-3 flex items-center justify-between gap-2"><button type="button"
                  class="min-h-8 text-xs text-[#776b64] underline underline-offset-4 hover:text-[#302722]"
                  @click="cart.removeItem(item.id)">Retirer</button><span class="text-sm">{{ money(item.price *
                  item.quantity) }}</span></div>
            </div>
          </div>
        </div>
        <div v-if="cart.items.length" class="border-t border-[#e9ddd3] pt-5">
          <div class="flex items-center justify-between text-base"><span>Sous-total</span><span>{{ money(cart.total)
              }}</span></div>
          <p class="mt-2 text-xs leading-5 text-[#776b64]">Frais de livraison calculés à l’étape suivante.</p>
          <NuxtLink to="/checkout"
            class="mt-5 flex min-h-14 items-center justify-center gap-3 bg-[#302722] px-4 text-sm text-white transition hover:bg-[#514137]"
            @click="closeCart">Passer commande
            <ArrowRight class="h-4 w-4" />
          </NuxtLink>
          <p class="mt-3 text-center text-[11px] text-[#776b64]">Paiement sécurisé par Mollie</p>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>
