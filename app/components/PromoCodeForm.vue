<script setup>
const cart = useCartStore()
const code = ref(cart.promoCode)
const inputId = useId()

watch(() => cart.promoCode, value => {
  code.value = value
})

onMounted(() => {
  if (cart.promoCode && !cart.promotion) void cart.applyPromoCode(cart.promoCode, { silent: true })
})

async function applyCode() {
  await cart.applyPromoCode(code.value)
}

function removeCode() {
  cart.removePromoCode()
  code.value = ''
}
</script>

<template>
  <div>
    <form class="flex gap-2" @submit.prevent="applyCode">
      <label class="sr-only" :for="inputId">Code promo</label>
      <input :id="inputId" v-model="code" name="promo-code" maxlength="40" autocomplete="off"
        autocapitalize="characters" placeholder="Code promo"
        class="min-w-0 flex-1 border border-[#d9cfc6] bg-white px-3 py-2.5 text-sm uppercase placeholder:normal-case focus:border-[#9b712d] focus:outline-none">
      <button type="submit" :disabled="cart.promoStatus === 'loading'"
        class="min-h-11 border border-[#302722] px-4 text-xs font-medium transition hover:bg-[#302722] hover:text-white disabled:cursor-wait disabled:opacity-60">
        {{ cart.promoStatus === 'loading' ? 'Vérification…' : 'Appliquer' }}
      </button>
    </form>
    <div class="mt-2 flex items-start justify-between gap-3 text-xs">
      <p aria-live="polite" :class="cart.promoStatus === 'applied' ? 'text-green-700' : 'text-red-600'">
        {{ cart.promoMessage }}
      </p>
      <button v-if="cart.promoCode" type="button"
        class="shrink-0 text-[#776b64] underline underline-offset-4 hover:text-[#302722]" @click="removeCode">
        Retirer
      </button>
    </div>
  </div>
</template>
