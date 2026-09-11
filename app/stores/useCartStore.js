import { defineStore } from "pinia";

export const useCartStore = defineStore("cart", {
  state: () => ({
    items: [],
    promoCode: "",
    promotion: null,
    promoStatus: "idle",
    promoMessage: "",
    promoRequestId: 0,
  }),
  getters: {
    itemCount: (state) =>
      state.items.reduce((total, item) => total + item.quantity, 0),
    total: (state) =>
      state.items.reduce(
        (total, item) => total + item.quantity * item.price,
        0,
      ),
    discountAmount: (state) => Number(state.promotion?.discountAmount || 0),
    totalAfterDiscount() {
      return Math.max(
        0,
        Math.round((this.total - this.discountAmount) * 100) / 100,
      );
    },
  },
  actions: {
    queuePromoRefresh() {
      if (!this.promoCode) return;
      this.promotion = null;
      this.promoMessage = "";
      if (typeof window !== "undefined")
        void this.applyPromoCode(this.promoCode, { silent: true });
    },
    addItem(product) {
      if (!Number.isInteger(product.stock) || product.stock < 1) return;

      const item = this.items.find((entry) => entry.id === product.id);
      if (item) {
        if (item.quantity < product.stock) {
          item.quantity++;
          this.queuePromoRefresh();
        }
        return;
      }

      this.items.push({ ...product, quantity: 1 });
      this.queuePromoRefresh();
    },
    removeItem(id) {
      if (!this.items.some((item) => item.id === id)) return;
      this.items = this.items.filter((item) => item.id !== id);
      if (!this.items.length) this.removePromoCode();
      else this.queuePromoRefresh();
    },
    async applyPromoCode(input, { silent = false } = {}) {
      const code = String(input || "")
        .trim()
        .toUpperCase()
        .slice(0, 40);
      if (silent && this.promoStatus === "loading") return false;
      const requestId = ++this.promoRequestId;
      this.promoCode = code;
      this.promotion = null;
      this.promoMessage = "";

      if (!code) {
        this.promoStatus = "idle";
        if (!silent) this.promoMessage = "Saisissez un code promo.";
        return false;
      }
      if (!this.items.length || this.total <= 0) {
        this.promoStatus = "error";
        this.promoMessage = "Ajoutez un bijou avant d’utiliser un code promo.";
        return false;
      }

      this.promoStatus = "loading";
      try {
        const promotion = await $fetch("/api/promo-code", {
          method: "POST",
          body: { code, subtotalAmount: this.total },
        });
        if (requestId !== this.promoRequestId) return false;
        this.promoCode = promotion.code;
        this.promotion = promotion;
        this.promoStatus = "applied";
        this.promoMessage = `Code ${promotion.code} appliqué.`;
        return true;
      } catch (error) {
        if (requestId !== this.promoRequestId) return false;
        this.promoStatus = "error";
        this.promoMessage =
          error?.data?.message || "Ce code promo est invalide ou expiré.";
        return false;
      }
    },
    removePromoCode() {
      this.promoRequestId++;
      this.promoCode = "";
      this.promotion = null;
      this.promoStatus = "idle";
      this.promoMessage = "";
    },
    hydrateFromCatalog(products) {
      const catalog = new Map(
        (products || []).map((product) => [product.id, product]),
      );
      this.items = this.items.flatMap((item) => {
        const product = catalog.get(item.id);
        if (!product || product.stock < 1) return [];
        return [
          {
            ...product,
            quantity: Math.min(Number(item.quantity) || 1, product.stock, 10),
          },
        ];
      });
      if (!this.items.length) this.removePromoCode();
      else this.queuePromoRefresh();
    },
    clearCart() {
      this.items = [];
      this.removePromoCode();
    },
  },
  persist: {
    pick: ["items", "promoCode"],
    serializer: {
      serialize: (value) =>
        JSON.stringify({
          items: (value.items || []).map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
          promoCode: value.promoCode || "",
        }),
      deserialize: (value) => JSON.parse(value),
    },
  },
});
