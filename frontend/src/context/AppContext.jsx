import React, { createContext, useContext, useState, useEffect } from "react";
import { products } from "../lib/products";

export const AppContext = createContext(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}

export function AppProvider({ children }) {
  const [state, setState] = useState({
    currentPage: "home",
    selectedProduct: null,
    cartItems: [],
    searchQuery: "",
    selectedCategory: "All",
    sortBy: "name",
  });

  useEffect(() => {
    const savedCart = localStorage.getItem("mart-cart");
    if (savedCart) {
      setState((prev) => ({ ...prev, cartItems: JSON.parse(savedCart) }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("mart-cart", JSON.stringify(state.cartItems));
  }, [state.cartItems]);

  const setCurrentPage = (page) =>
    setState((prev) => ({ ...prev, currentPage: page }));

  const setSelectedProduct = (product) =>
    setState((prev) => ({ ...prev, selectedProduct: product }));

  const addToCart = (product) => {
    setState((prev) => {
      const existing = prev.cartItems.find(
        (item) => item.product.id === product.id
      );
      if (existing) {
        return {
          ...prev,
          cartItems: prev.cartItems.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return {
        ...prev,
        cartItems: [...prev.cartItems, { product, quantity: 1 }],
      };
    });
  };

  const removeFromCart = (productId) =>
    setState((prev) => ({
      ...prev,
      cartItems: prev.cartItems.filter((item) => item.product.id !== productId),
    }));

  const updateQuantity = (productId, quantity) =>
    setState((prev) => ({
      ...prev,
      cartItems:
        quantity === 0
          ? prev.cartItems.filter((item) => item.product.id !== productId)
          : prev.cartItems.map((item) =>
              item.product.id === productId ? { ...item, quantity } : item
            ),
    }));

  const clearCart = () => setState((prev) => ({ ...prev, cartItems: [] }));
  const setSearchQuery = (query) =>
    setState((prev) => ({ ...prev, searchQuery: query }));
  const setSelectedCategory = (category) =>
    setState((prev) => ({ ...prev, selectedCategory: category }));
  const setSortBy = (sortBy) =>
    setState((prev) => ({ ...prev, sortBy }));

  const getTotalItems = () =>
    state.cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const getTotalPrice = () =>
    state.cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

  const value = {
    ...state,
    setCurrentPage,
    setSelectedProduct,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    setSearchQuery,
    setSelectedCategory,
    setSortBy,
    getTotalItems,
    getTotalPrice,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}