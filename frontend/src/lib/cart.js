import { create } from "zustand";
import { persist } from "zustand/middleware";

// Define the useCart store
export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      // Add item to cart
      addItem: (product) =>
        set((state) => {
          const existingItem = state.items.find((item) => item.product.id === product.id);
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }
          return { items: [...state.items, { product, quantity: 1 }] };
        }),
      // Remove item from cart
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        })),
      // Update quantity of an item
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity === 0
              ? state.items.filter((item) => item.product.id !== productId)
              : state.items.map((item) =>
                  item.product.id === productId ? { ...item, quantity } : item
                ),
        })),
      // Clear entire cart
      clearCart: () => set({ items: [] }),
      // Get total number of items in cart
      getTotalItems: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },
      // Get total price of all items
      getTotalPrice: () => {
        const { items } = get();
        return items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },
    }),
    {
      name: "cart-storage", // key in localStorage
    }
  )
);