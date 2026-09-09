<script setup>
import { amountUntilFreeShipping, shippingAmountFor, SHIPPING_PRICES } from '~/lib/shipping'

const cart = useCartStore()
const form = reactive({ firstName: '', lastName: '', email: '', phone: '', addressLine1: '', addressLine2: '', postalCode: '', city: '' })
const delivery = reactive({ method: 'home', pickupPoint: '', pickupPointId: '' })
const acceptedTerms = ref(false)
const errorMessage = ref('')
const loading = ref(false)
const relayPoints = ref([])
const selectedRelayId = ref('')
const relayLoading = ref(false)
const relayError = ref('')
let relaySearchTimer
const money = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
const shippingAmount = computed(() => shippingAmountFor(delivery.method, cart.total))
const freeShippingRemaining = computed(() => amountUntilFreeShipping(cart.total))
const hasFreeShipping = computed(() => freeShippingRemaining.value === 0)
const totalAmount = computed(() => cart.totalAfterDiscount + shippingAmount.value)

useSeoMeta({ title: 'Finaliser ma commande — Maison JLA', description: 'Renseignez vos coordonnées et finalisez votre commande Maison JLA en toute sécurité.' })

async function checkout() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch('/api/checkout', { method: 'POST', body: { customer: form, delivery, acceptedTerms: acceptedTerms.value, promoCode: cart.promoCode || null, items: cart.items.map(item => ({ id: item.id, quantity: item.quantity })) } })
    await navigateTo(result.checkoutUrl, { external: true })
  } catch (error) {
    errorMessage.value = error.data?.statusMessage || error.message || 'Le paiement est indisponible.'
  } finally {
    loading.value = false
  }
}

function selectRelay(point) {
  selectedRelayId.value = point.id
  delivery.pickupPointId = point.id
  delivery.pickupPoint = point.label
}

async function searchRelayPoints() {
  const postalCode = form.postalCode.trim()
  if (delivery.method !== 'pickup' || !/^\d{5}$/.test(postalCode)) return
  relayLoading.value = true
  relayError.value = ''
  relayPoints.value = []
  selectedRelayId.value = ''
  delivery.pickupPoint = ''
  delivery.pickupPointId = ''
  try {
    const result = await $fetch('/api/mondial-relay/points', { query: { postalCode } })
    relayPoints.value = result.points
    if (!relayPoints.value.length) relayError.value = 'Aucun point relais disponible autour de ce code postal.'
  } catch (error) {
    relayError.value = error.data?.statusMessage || 'La recherche de points relais est indisponible.'
  } finally {
    relayLoading.value = false
  }
}

watch([() => delivery.method, () => form.postalCode], () => {
  clearTimeout(relaySearchTimer)
  if (delivery.method !== 'pickup') return
  relaySearchTimer = setTimeout(searchRelayPoints, 350)
})

onBeforeUnmount(() => clearTimeout(relaySearchTimer))
</script>

<template>
  <section class="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
    <h1 class="font-serif text-4xl sm:text-5xl">Finaliser la commande</h1>
    <form v-if="cart.items.length" class="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[1fr_.7fr] lg:gap-10"
      @submit.prevent="checkout">
      <div class="space-y-10">
        <div>
          <h2 class="font-serif text-2xl sm:text-3xl">Vos coordonnées</h2>
          <div class="mt-6 grid gap-4 sm:grid-cols-2"><input v-model="form.firstName" required autocomplete="given-name"
              placeholder="Prénom" class="w-full border p-4"><input v-model="form.lastName" required
              autocomplete="family-name" placeholder="Nom" class="w-full border p-4"><input v-model="form.email"
              required type="email" autocomplete="email" placeholder="E-mail"
              class="w-full border p-4 sm:col-span-2"><input v-model="form.phone" required type="tel" autocomplete="tel"
              placeholder="Téléphone" class="w-full border p-4 sm:col-span-2"><input v-model="form.addressLine1"
              required autocomplete="address-line1" placeholder="Adresse" class="w-full border p-4 sm:col-span-2"><input
              v-model="form.addressLine2" autocomplete="address-line2" placeholder="Complément d’adresse (facultatif)"
              class="w-full border p-4 sm:col-span-2"><input v-model="form.postalCode" required
              autocomplete="postal-code" placeholder="Code postal" class="w-full border p-4"><input v-model="form.city"
              required autocomplete="address-level2" placeholder="Ville" class="w-full border p-4"></div>
        </div>
        <fieldset>
          <legend class="font-serif text-2xl sm:text-3xl">Livraison</legend>
          <div class="mt-6 grid gap-3 sm:grid-cols-2"><label class="flex cursor-pointer gap-3 border p-4"
              :class="delivery.method === 'home' ? 'border-[#9b712d] bg-[#fdf7f2]' : 'border-[#e9ddd3]'"><input
                v-model="delivery.method" value="home" type="radio" name="delivery-method"><span><strong
                  class="block font-medium">À domicile · {{ hasFreeShipping ? 'Offerte' : money(SHIPPING_PRICES.home) }}</strong><span
                  class="mt-1 block text-sm text-[#776b64]">À l’adresse indiquée, en France
                  métropolitaine.</span></span></label><label class="flex cursor-pointer gap-3 border p-4"
              :class="delivery.method === 'pickup' ? 'border-[#9b712d] bg-[#fdf7f2]' : 'border-[#e9ddd3]'"><input
                v-model="delivery.method" value="pickup" type="radio" name="delivery-method"><span><strong
                  class="block font-medium">Mondial Relay · {{ hasFreeShipping ? 'Offerte' : money(SHIPPING_PRICES.pickup) }}</strong><span
                  class="mt-1 block text-sm text-[#776b64]">Choisissez un point relais disponible.</span></span></label>
          </div>
          <p aria-live="polite" class="mt-3 text-sm text-[#776b64]">
            <template v-if="hasFreeShipping">Bonne nouvelle, la livraison vous est offerte.</template>
            <template v-else>Encore {{ money(freeShippingRemaining) }} pour profiter de la livraison offerte.</template>
          </p>
          <div v-if="delivery.method === 'pickup'" class="mt-4">
            <p v-if="!/^\d{5}$/.test(form.postalCode)" class="text-sm text-[#776b64]">Renseignez d’abord votre code
              postal pour voir les points relais disponibles.</p>
            <p v-else-if="relayLoading" class="text-sm text-[#776b64]">Recherche des points relais…</p>
            <p v-else-if="relayError" class="text-sm text-red-600">{{ relayError }}</p>
            <div v-else class="grid gap-3"><button v-for="point in relayPoints" :key="point.id" type="button"
                class="border p-4 text-left"
                :class="selectedRelayId === point.id ? 'border-[#9b712d] bg-[#fdf7f2]' : 'border-[#e9ddd3]'"
                @click="selectRelay(point)"><span class="flex items-start gap-3"><input
                    :checked="selectedRelayId === point.id" type="radio" name="relay-point" class="mt-1"><span><strong
                      class="block">{{ point.name }}</strong><span class="mt-1 block text-sm text-[#776b64]">{{
                        point.address.join(', ') }}<template v-if="point.address.length">, </template>{{
                        point.postalCode }} {{ point.city }}<template v-if="point.distance"> · à {{
                        Math.round(point.distance / 1000 * 10) / 10 }} km</template></span></span></span></button>
            </div>
          </div>
        </fieldset>
      </div>
      <aside class="h-fit bg-[#f5eee6] p-5 sm:p-8">
        <h2 class="font-serif text-2xl sm:text-3xl">Votre écrin</h2>
        <div class="my-6 border-y py-5">
          <div v-for="item in cart.items" :key="item.id" class="mb-3 flex justify-between gap-3 text-sm"><span>{{
            item.name }}
              × {{ item.quantity }}</span><span class="shrink-0">{{ money(item.price * item.quantity) }}</span></div>
        </div>
        <PromoCodeForm class="mb-5" />
        <div class="space-y-2 border-b pb-5 text-sm">
          <div class="flex justify-between"><span>Sous-total</span><span>{{ money(cart.total) }}</span></div>
          <div v-if="cart.discountAmount" class="flex justify-between text-green-700"><span>Réduction · {{ cart.promoCode
              }}</span><span>− {{ money(cart.discountAmount) }}</span></div>
          <div class="flex justify-between"><span>Livraison {{ delivery.method === 'pickup' ? 'Mondial Relay' : 'à domicile'
              }}</span><span>{{ hasFreeShipping ? 'Offerte' : money(shippingAmount) }}</span></div>
        </div>
        <div class="mt-5 flex justify-between font-serif text-xl sm:text-2xl"><span>Total</span><span>{{
          money(totalAmount)
            }}</span></div>
        <p class="mt-3 text-sm text-[#776b64]">Paiement sécurisé par Mollie. Après validation, l’e-mail de confirmation comprendra votre récapitulatif, votre facture et les CGV applicables.</p>
        <p class="mt-3 text-xs leading-5 text-[#776b64]">Livraison prévue sous 3 à 6 jours ouvrés à compter de la confirmation du paiement.</p>
        <label class="mt-5 flex gap-3 text-sm leading-5"><input v-model="acceptedTerms"
            required type="checkbox" class="mt-1"><span>J’accepte les <NuxtLink class="font-medium underline underline-offset-4" to="/conditions-generales-de-vente" target="_blank">conditions générales de vente</NuxtLink> et reconnais avoir lu la <NuxtLink class="font-medium underline underline-offset-4" to="/politique-confidentialite" target="_blank">politique de confidentialité</NuxtLink>.</span></label>
        <p class="mt-3 text-xs leading-5 text-[#776b64]">Les champs de ce formulaire sont nécessaires pour exécuter la commande, le paiement et la livraison. Maison JLA est responsable du traitement ; Mollie, Resend, Sendcloud et le transporteur reçoivent seulement les données utiles à leur mission. Vos droits s’exercent à maisonjla@outlook.fr. Les détails, durées de conservation et transferts éventuels figurent dans la politique de confidentialité.</p>
        <p v-if="errorMessage" class="mt-5 text-sm text-red-600">{{ errorMessage }}</p><button
          class="mt-6 w-full bg-[#302722] py-4 text-xs uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loading">{{ loading ? 'Redirection…' : 'Payer — commande avec obligation de paiement' }}</button>
      </aside>
    </form>
    <p v-else class="mt-10 text-sm">Votre panier est vide.</p>
  </section>
</template>
