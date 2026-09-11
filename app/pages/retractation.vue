<script setup>
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Renoncer au contrat — Maison JLA',
  description: 'Exercez en ligne votre droit de rétractation pour une commande Maison JLA.',
  robots: 'noindex,follow'
})

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  orderReference: '',
  products: '',
  orderedAt: '',
  receivedAt: '',
  website: ''
})
const review = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const receipt = ref(null)

function prepareConfirmation() {
  errorMessage.value = ''
  review.value = true
}

async function confirmWithdrawal() {
  loading.value = true
  errorMessage.value = ''
  try {
    receipt.value = await $fetch('/api/retractation', { method: 'POST', body: form })
  } catch (error) {
    errorMessage.value = error.data?.message || 'La demande n’a pas pu être envoyée. Vous pouvez écrire à contact@maisonjla.fr.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="bg-[#fffaf6] px-6 py-16 sm:px-8 sm:py-24">
    <div class="mx-auto max-w-3xl">
      <p class="text-xs uppercase tracking-[.2em] text-[#9b712d]">Droit de rétractation</p>
      <h1 class="mt-4 font-serif text-5xl text-[#302722] sm:text-6xl">Renoncer au contrat ici</h1>
      <p class="mt-6 max-w-2xl text-sm leading-7 text-[#776b64]">Ce formulaire permet de notifier en ligne votre rétractation. Vous recevrez un accusé de réception par e-mail avec le contenu, la date et l’heure de votre demande.</p>

      <div v-if="receipt" class="mt-10 border border-[#bfa36d] bg-white p-6 text-sm leading-7 text-[#514640] sm:p-8" role="status">
        <h2 class="font-serif text-3xl text-[#302722]">Rétractation enregistrée</h2>
        <p class="mt-4">Votre déclaration a été enregistrée le <strong>{{ receipt.sentAt }}</strong>. <template v-if="receipt.receiptPending">L’accusé de réception est en attente : conservez cette page et écrivez à contact@maisonjla.fr si vous ne recevez rien.</template><template v-else>Un accusé de réception a été adressé à <strong>{{ form.email }}</strong>.</template></p>
        <p class="mt-3">Référence de demande : <strong>{{ receipt.reference }}</strong></p>
        <p class="mt-3">Vous devez renvoyer les produits au plus tard dans les quatorze jours suivant cette notification, selon les modalités des <NuxtLink class="underline underline-offset-4" to="/conditions-generales-de-vente">conditions générales de vente</NuxtLink>.</p>
      </div>

      <form v-else-if="!review" class="mt-10 space-y-6" @submit.prevent="prepareConfirmation">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm">Prénom<input v-model.trim="form.firstName" required autocomplete="given-name" class="mt-2 w-full border border-[#d9d0c8] bg-white p-4"></label>
          <label class="text-sm">Nom<input v-model.trim="form.lastName" required autocomplete="family-name" class="mt-2 w-full border border-[#d9d0c8] bg-white p-4"></label>
          <label class="text-sm sm:col-span-2">E-mail pour l’accusé de réception<input v-model.trim="form.email" required type="email" autocomplete="email" class="mt-2 w-full border border-[#d9d0c8] bg-white p-4"></label>
          <label class="text-sm sm:col-span-2">Numéro de commande<input v-model.trim="form.orderReference" required placeholder="JLA-…" class="mt-2 w-full border border-[#d9d0c8] bg-white p-4"></label>
          <label class="text-sm sm:col-span-2">Produit ou produits concernés<textarea v-model.trim="form.products" required rows="4" class="mt-2 w-full border border-[#d9d0c8] bg-white p-4"></textarea></label>
          <label class="text-sm">Date de commande<input v-model="form.orderedAt" required type="date" class="mt-2 w-full border border-[#d9d0c8] bg-white p-4"></label>
          <label class="text-sm">Date de réception, si livré<input v-model="form.receivedAt" type="date" class="mt-2 w-full border border-[#d9d0c8] bg-white p-4"></label>
          <label class="hidden" aria-hidden="true">Site internet<input v-model="form.website" tabindex="-1" autocomplete="off"></label>
        </div>
        <p class="text-xs leading-6 text-[#776b64]">Les informations demandées sont nécessaires pour identifier votre contrat et traiter la rétractation. Consultez notre <NuxtLink class="underline underline-offset-4" to="/politique-confidentialite">politique de confidentialité</NuxtLink>.</p>
        <button class="bg-[#302722] px-7 py-4 text-sm text-white">Vérifier ma déclaration</button>
      </form>

      <div v-else class="mt-10 text-sm leading-7 text-[#514640]">
        <h2 class="font-serif text-3xl text-[#302722]">Confirmez votre déclaration</h2>
        <dl class="mt-6 grid gap-4 border-y border-[#d9d0c8] py-6 sm:grid-cols-[12rem_1fr]">
          <dt class="font-medium">Nom</dt><dd>{{ form.firstName }} {{ form.lastName }}</dd>
          <dt class="font-medium">E-mail</dt><dd>{{ form.email }}</dd>
          <dt class="font-medium">Commande</dt><dd>{{ form.orderReference }}</dd>
          <dt class="font-medium">Produits</dt><dd class="whitespace-pre-line">{{ form.products }}</dd>
          <dt class="font-medium">Commandée le</dt><dd>{{ form.orderedAt }}</dd>
          <dt class="font-medium">Reçue le</dt><dd>{{ form.receivedAt || 'Non renseigné' }}</dd>
        </dl>
        <p class="mt-6">En confirmant, vous notifiez à Maison JLA votre décision non ambiguë de vous rétracter du contrat identifié ci-dessus.</p>
        <p v-if="errorMessage" class="mt-4 text-red-600" role="alert">{{ errorMessage }}</p>
        <div class="mt-7 flex flex-wrap gap-3">
          <button type="button" class="bg-[#302722] px-7 py-4 text-sm text-white disabled:opacity-60" :disabled="loading" @click="confirmWithdrawal">{{ loading ? 'Envoi…' : 'Confirmer la rétractation' }}</button>
          <button type="button" class="border border-[#302722] px-7 py-4 text-sm" :disabled="loading" @click="review = false">Modifier</button>
        </div>
      </div>
    </div>
  </section>
</template>
