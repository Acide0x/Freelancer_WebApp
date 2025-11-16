// Sample product data
export const products = [
  {
    id: 1,
    name: "Fresh Organic Bananas",
    price: 2.99,
    originalPrice: 3.49,
    image: "/placeholder.svg?height=300&width=300",
    category: "Fruits & Vegetables",
    rating: 4.5,
    discount: 15,
    description:
      "Sweet, ripe organic bananas perfect for snacking or baking. Rich in potassium and natural sugars.",
    inStock: true,
    unit: "per lb",
    nutritionFacts: {
      calories: 105,
      protein: "1.3g",
      carbs: "27g",
      fat: "0.4g",
    },
  },
  {
    id: 2,
    name: "Whole Wheat Bread",
    price: 3.49,
    image: "/placeholder.svg?height=300&width=300",
    category: "Bakery",
    rating: 4.8,
    description:
      "Freshly baked whole wheat bread with a perfect crust and soft interior. Made with organic flour.",
    inStock: true,
    unit: "per loaf",
  },
  {
    id: 3,
    name: "Fresh Milk - 1 Gallon",
    price: 4.99,
    image: "/placeholder.svg?height=300&width=300",
    category: "Dairy & Eggs",
    rating: 4.6,
    description:
      "Farm-fresh whole milk from local dairy farms. Rich in calcium and protein.",
    inStock: true,
    unit: "per gallon",
    nutritionFacts: {
      calories: 150,
      protein: "8g",
      carbs: "12g",
      fat: "8g",
    },
  },
  {
    id: 4,
    name: "Premium Ground Coffee",
    price: 12.99,
    originalPrice: 15.99,
    image: "/placeholder.svg?height=300&width=300",
    category: "Beverages",
    rating: 4.9,
    discount: 20,
    description:
      "Rich, aromatic ground coffee beans sourced from the finest coffee farms. Perfect for your morning brew.",
    inStock: true,
    unit: "per 12oz bag",
  },
  {
    id: 5,
    name: "Organic Chicken Breast",
    price: 8.99,
    image: "/placeholder.svg?height=300&width=300",
    category: "Meat & Seafood",
    rating: 4.7,
    description:
      "Premium organic chicken breast, hormone-free and antibiotic-free. Perfect for healthy meals.",
    inStock: true,
    unit: "per lb",
    nutritionFacts: {
      calories: 165,
      protein: "31g",
      carbs: "0g",
      fat: "3.6g",
    },
  },
  {
    id: 6,
    name: "Fresh Spinach",
    price: 2.49,
    image: "/placeholder.svg?height=300&width=300",
    category: "Fruits & Vegetables",
    rating: 4.4,
    description:
      "Fresh, crisp spinach leaves packed with iron and vitamins. Great for salads and cooking.",
    inStock: true,
    unit: "per bunch",
    nutritionFacts: {
      calories: 23,
      protein: "2.9g",
      carbs: "3.6g",
      fat: "0.4g",
    },
  },
  {
    id: 7,
    name: "Greek Yogurt",
    price: 5.99,
    image: "/placeholder.svg?height=300&width=300",
    category: "Dairy & Eggs",
    rating: 4.6,
    description:
      "Creamy Greek yogurt with live cultures. High in protein and probiotics.",
    inStock: true,
    unit: "per 32oz container",
  },
  {
    id: 8,
    name: "Salmon Fillet",
    price: 15.99,
    image: "/placeholder.svg?height=300&width=300",
    category: "Meat & Seafood",
    rating: 4.8,
    description:
      "Fresh Atlantic salmon fillet, rich in omega-3 fatty acids. Wild-caught and sustainably sourced.",
    inStock: true,
    unit: "per lb",
  },
  {
    id: 9,
    name: "Artisan Sourdough",
    price: 4.99,
    image: "/placeholder.svg?height=300&width=300",
    category: "Bakery",
    rating: 4.9,
    description:
      "Traditional sourdough bread with a tangy flavor and chewy texture. Made with natural starter.",
    inStock: true,
    unit: "per loaf",
  },
  {
    id: 10,
    name: "Orange Juice",
    price: 3.99,
    image: "/placeholder.svg?height=300&width=300",
    category: "Beverages",
    rating: 4.3,
    description:
      "Fresh-squeezed orange juice with no added sugars. Packed with vitamin C.",
    inStock: true,
    unit: "per 64oz bottle",
  },
];

// Categories list
export const categories = [
  { name: "Fruits & Vegetables", icon: "🥕", count: 150 },
  { name: "Dairy & Eggs", icon: "🥛", count: 45 },
  { name: "Meat & Seafood", icon: "🥩", count: 80 },
  { name: "Bakery", icon: "🍞", count: 35 },
  { name: "Beverages", icon: "🥤", count: 120 },
  { name: "Snacks", icon: "🍿", count: 200 },
  { name: "Frozen Foods", icon: "🧊", count: 90 },
  { name: "Household", icon: "🧽", count: 75 },
];

// Utility functions
export function getProductsByCategory(category) {
  return products.filter((product) => product.category === category);
}

export function getProductById(id) {
  return products.find((product) => product.id === id);
}