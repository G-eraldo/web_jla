<script setup>
import { Menu, ShoppingBag, X } from 'lucide-vue-next'

const cart = useCartStore()
const cartOpen = ref(false)
const menuOpen = ref(false)
const navigation = [{ label: 'Boutique', to: '/collections/tous-les-bijoux' }, { label: 'Colliers', to: '/collections/colliers' }, { label: 'Boucles', to: '/collections/boucles' }, { label: 'Bracelets', to: '/collections/bracelets' }]
const money = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-[#e9ddd3] bg-[#fffaf6]">
    <div
      class="bg-[#302722] px-3 py-2 text-center text-[9px] uppercase tracking-[.14em] text-white sm:text-[10px] sm:tracking-[.2em]">
      Livraison à domicile ou en point relais ·</div>
    <div class="relative mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 md:h-28">
      <button class="md:hidden" aria-label="Ouvrir le menu" @click="menuOpen = !menuOpen">
        <Menu class="h-5 w-5" />
      </button>
      <nav class="hidden gap-5 text-xs uppercase tracking-[.14em] md:flex lg:gap-7">
        <NuxtLink v-for="item in navigation" :key="item.label" :to="item.to">{{ item.label }}</NuxtLink>
      </nav>
      <NuxtLink to="/" class="absolute left-1/2 -translate-x-1/2"><img src="/logo-maison-jla.png" alt="Maison JLA"
          class="h-16 w-20 object-contain md:h-20 md:w-24"></NuxtLink>
      <button
        class="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-[.13em] sm:gap-2 sm:text-xs sm:tracking-[.16em]"
        aria-label="Ouvrir le panier" @click="cartOpen = true">
        <ShoppingBag class="h-5 w-5" /><span class="hidden sm:inline">Panier</span><span v-if="cart.itemCount"
          class="rounded-full bg-[#b58132] px-1.5 py-0.5 text-white">{{ cart.itemCount }}</span>
      </button>
    </div>
    <nav v-if="menuOpen" class="border-t border-[#e9ddd3] px-5 py-4 md:hidden">
      <NuxtLink v-for="item in navigation" :key="item.label" :to="item.to"
        class="block py-3 text-xs uppercase tracking-[.16em]" @click="menuOpen = false">{{ item.label }}</NuxtLink>
    </nav>
  </header>
  <Teleport to="body">
    <div v-if="cartOpen" class="fixed inset-0 z-50 bg-black/30" @click.self="cartOpen = false">
      <aside class="ml-auto flex h-full w-full max-w-sm flex-col bg-[#fffaf6] p-5 sm:p-6">
        <div class="flex justify-between border-b pb-4">
          <h2 class="font-serif text-2xl">Votre panier</h2><button aria-label="Fermer" @click="cartOpen = false">
            <X />
          </button>
        </div>
        <div class="flex-1 overflow-auto py-6">
          <p v-if="!cart.items.length" class="text-sm text-[#776b64]">Votre écrin est vide.</p>
          <div v-for="item in cart.items" :key="item.id" class="mb-4 flex justify-between gap-3">
            <div>
              <p class="font-serif text-lg">{{ item.name }}</p><button class="text-xs underline"
                @click="cart.removeItem(item.id)">Retirer</button>
            </div><span class="shrink-0">{{ money(item.price * item.quantity) }}</span>
          </div>
        </div>
        <NuxtLink v-if="cart.items.length" to="/checkout"
          class="bg-[#302722] py-4 text-center text-xs uppercase tracking-widest text-white" @click="cartOpen = false">
          Passer commande</NuxtLink>
      </aside>
    </div>
  </Teleport>
</template>
