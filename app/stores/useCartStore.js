import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', {
  state: () => ({ items: [] }),
  getters: {
    itemCount: state => state.items.reduce((total, item) => total + item.quantity, 0),
    total: state => state.items.reduce((total, item) => total + item.quantity * item.price, 0)
  },
  actions: {
    addItem(product) {
      if (!Number.isInteger(product.stock) || product.stock < 1) return

      const item = this.items.find(entry => entry.id === product.id)
      if (item) {
        if (item.quantity < product.stock) item.quantity++
        return
      }

      this.items.push({ ...product, quantity: 1 })
    },
    removeItem(id) {
      this.items = this.items.filter(item => item.id !== id)
    },
    clearCart() {
      this.items = []
    }
  },
  persist: true
})
