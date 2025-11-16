"use client"

import { useState, useEffect } from "react"
import { Star, Truck, Shield, Clock, ChevronLeft, ChevronRight, ShoppingCart, Heart, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import pic1 from "@/images/pic1.png";
import pic2 from "@/images/pic2.png";
import pic3 from "@/images/pic3.png";


// Sample product data
const products = [
  {
    id: 1,
    name: "Fresh Organic Apples",
    price: 4.99,
    originalPrice: 6.99,
    rating: 4.8,
    category: "Fruits",
    discount: 20,
    image: pic1,
  },
  {
    id: 2,
    name: "Premium Salmon Fillet",
    price: 12.99,
    originalPrice: 15.99,
    rating: 4.9,
    category: "Seafood",
    discount: 15,
    image: pic2,
  },
  {
    id: 3,
    name: "Organic Whole Milk",
    price: 3.49,
    rating: 4.7,
    category: "Dairy",
    image: pic3,
  },
  {
    id: 4,
    name: "Artisan Sourdough Bread",
    price: 5.99,
    rating: 4.6,
    category: "Bakery",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 5,
    name: "Fresh Avocados",
    price: 2.99,
    originalPrice: 3.99,
    rating: 4.8,
    category: "Fruits",
    discount: 25,
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 6,
    name: "Greek Yogurt",
    price: 4.49,
    rating: 4.5,
    category: "Dairy",
    image: "/placeholder.svg?height=200&width=200",
  },
]

const categories = [
  { name: "Fruits & Vegetables", icon: "🥕", count: 150, color: "bg-green-100 hover:bg-green-200" },
  { name: "Dairy & Eggs", icon: "🥛", count: 45, color: "bg-blue-100 hover:bg-blue-200" },
  { name: "Meat & Seafood", icon: "🥩", count: 80, color: "bg-red-100 hover:bg-red-200" },
  { name: "Bakery", icon: "🍞", count: 35, color: "bg-yellow-100 hover:bg-yellow-200" },
  { name: "Beverages", icon: "🥤", count: 120, color: "bg-purple-100 hover:bg-purple-200" },
  { name: "Snacks", icon: "🍿", count: 200, color: "bg-orange-100 hover:bg-orange-200" },
  { name: "Frozen Foods", icon: "🧊", count: 90, color: "bg-cyan-100 hover:bg-cyan-200" },
  { name: "Household", icon: "🧽", count: 75, color: "bg-pink-100 hover:bg-pink-200" },
]

const heroSlides = [
  {
    title: "Fresh Groceries Delivered",
    subtitle: "Get the freshest produce delivered to your doorstep",
    image: "/placeholder.svg?height=500&width=600",
    bgColor: "from-green-50 to-blue-50",
  },
  {
    title: "Premium Quality Meats",
    subtitle: "Hand-selected cuts from trusted local suppliers",
    image: "/placeholder.svg?height=500&width=600",
    bgColor: "from-red-50 to-orange-50",
  },
  {
    title: "Organic & Natural",
    subtitle: "100% organic produce for a healthier lifestyle",
    image: "/placeholder.svg?height=500&width=600",
    bgColor: "from-emerald-50 to-teal-50",
  },
]

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentProductSlide, setCurrentProductSlide] = useState(0)
  const [email, setEmail] = useState("")
  const [isVisible, setIsVisible] = useState({})
  const [cart, setCart] = useState([])
  const [wishlist, setWishlist] = useState([])

  // Auto-advance hero slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  // Intersection Observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }))
          }
        })
      },
      { threshold: 0.1 },
    )

    const elements = document.querySelectorAll("[data-animate]")
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
  }

  const nextProductSlide = () => {
    setCurrentProductSlide((prev) => (prev + 1) % Math.ceil(products.length / 3))
  }

  const prevProductSlide = () => {
    setCurrentProductSlide((prev) => (prev - 1 + Math.ceil(products.length / 3)) % Math.ceil(products.length / 3))
  }

  const addToCart = (product) => {
    setCart((prev) => [...prev, product])
    // Add animation feedback
    const button = document.querySelector(`[data-product-id="${product.id}"]`)
    if (button) {
      button.classList.add("animate-pulse")
      setTimeout(() => button.classList.remove("animate-pulse"), 600)
    }
  }

  const toggleWishlist = (product) => {
    setWishlist((prev) =>
      prev.find((item) => item.id === product.id) ? prev.filter((item) => item.id !== product.id) : [...prev, product],
    )
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Slider Section */}
      <section className="relative h-screen">
        <div className="absolute inset-0 overflow-hidden">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 bg-gradient-to-r ${slide.bgColor} transition-all duration-1000 ease-in-out ${
                index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"
              }`}
            >
              <div className="container mx-auto h-full">
                <div className="grid lg:grid-cols-2 gap-12 items-center h-full py-20">
                  <div
                    className={`space-y-6 transform transition-all duration-1000 delay-300 ${
                      index === currentSlide ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
                    }`}
                  >
                    <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                      {slide.title.split(" ").map((word, i) => (
                        <span
                          key={i}
                          className={`inline-block transform transition-all duration-700 ${
                            index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                          }`}
                          style={{ transitionDelay: `${i * 100 + 500}ms` }}
                        >
                          {word === "Delivered" || word === "Meats" || word === "Natural" ? (
                            <span className="text-green-600">{word}</span>
                          ) : (
                            word
                          )}{" "}
                        </span>
                      ))}
                    </h1>
                    <p
                      className={`text-xl text-muted-foreground transform transition-all duration-700 delay-700 ${
                        index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                      }`}
                    >
                      {slide.subtitle}
                    </p>
                    <div
                      className={`flex flex-col sm:flex-row gap-4 transform transition-all duration-700 delay-900 ${
                        index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                      }`}
                    >
                      <Button
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 transform hover:scale-105 transition-all duration-300"
                      >
                        Shop Now
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="transform hover:scale-105 transition-all duration-300 bg-transparent"
                      >
                        View Deals
                      </Button>
                    </div>
                    <div
                      className={`flex items-center space-x-6 text-sm text-muted-foreground transform transition-all duration-700 delay-1100 ${
                        index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                      }`}
                    >
                      <div className="flex items-center space-x-2 hover:text-green-600 transition-colors">
                        <Truck className="h-4 w-4" />
                        <span>Free delivery over $50</span>
                      </div>
                      <div className="flex items-center space-x-2 hover:text-green-600 transition-colors">
                        <Clock className="h-4 w-4" />
                        <span>2-hour delivery</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`relative transform transition-all duration-1000 delay-500 ${
                      index === currentSlide
                        ? "translate-x-0 opacity-100 scale-100"
                        : "translate-x-10 opacity-0 scale-95"
                    }`}
                  >
                    <img
                      src={slide.image || "/placeholder.svg"}
                      alt={slide.title}
                      className="rounded-lg shadow-2xl hover:shadow-3xl transition-shadow duration-500"
                    />
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white font-bold animate-bounce">
                      NEW
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Slider Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Slider Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide ? "bg-green-600 scale-125" : "bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16" id="categories" data-animate>
        <div className="container mx-auto">
          <div
            className={`text-center mb-12 transform transition-all duration-1000 ${
              isVisible.categories ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
          >
            <h2 className="text-3xl font-bold mb-4">Shop by Category</h2>
            <p className="text-muted-foreground">Find everything you need in our organized categories</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <Card
                key={index}
                className={`hover:shadow-xl transition-all duration-500 cursor-pointer group transform hover:-translate-y-2 ${category.color} border-0 ${
                  isVisible.categories ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-4 group-hover:scale-125 transition-transform duration-300 group-hover:rotate-12">
                    {category.icon}
                  </div>
                  <h3 className="font-semibold mb-2 group-hover:text-green-600 transition-colors">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.count} items</p>
                  <div className="mt-3 w-0 group-hover:w-full h-0.5 bg-green-600 transition-all duration-300 mx-auto"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Slider */}
      <section className="py-16 bg-gray-50" id="products" data-animate>
        <div className="container mx-auto">
          <div
            className={`text-center mb-12 transform transition-all duration-1000 ${
              isVisible.products ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
          >
            <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
            <p className="text-muted-foreground">Hand-picked favorites and best deals</p>
          </div>

          <div className="relative">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentProductSlide * 100}%)` }}
              >
                {Array.from({ length: Math.ceil(products.length / 3) }).map((_, slideIndex) => (
                  <div key={slideIndex} className="w-full flex-shrink-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
                      {products.slice(slideIndex * 3, (slideIndex + 1) * 3).map((product, index) => (
                        <Card
                          key={product.id}
                          className="hover:shadow-xl transition-all duration-500 group transform hover:-translate-y-2 bg-white"
                        >
                          <CardHeader className="p-0 relative overflow-hidden">
                            <div className="relative group">
                              <img
                                src={product.image || "/placeholder.svg"}
                                alt={product.name}
                                className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              {product.discount && (
                                <Badge className="absolute top-2 left-2 bg-red-500 animate-pulse">
                                  {product.discount}% OFF
                                </Badge>
                              )}
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100"
                                  onClick={() => toggleWishlist(product)}
                                >
                                  <Heart
                                    className={`h-4 w-4 ${wishlist.find((item) => item.id === product.id) ? "fill-red-500 text-red-500" : ""}`}
                                  />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-200"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="secondary" className="hover:bg-green-100 transition-colors">
                                {product.category}
                              </Badge>
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{product.rating}</span>
                              </div>
                            </div>
                            <h3 className="font-semibold mb-2 group-hover:text-green-600 transition-colors">
                              {product.name}
                            </h3>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-bold text-green-600">${product.price}</span>
                                {product.originalPrice && (
                                  <span className="text-sm text-muted-foreground line-through">
                                    ${product.originalPrice}
                                  </span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addToCart(product)}
                                data-product-id={product.id}
                                className="transform hover:scale-105 transition-all duration-300 bg-green-600 hover:bg-green-700"
                              >
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Slider Controls */}
            <button
              onClick={prevProductSlide}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white hover:bg-gray-50 rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110 -translate-x-4"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextProductSlide}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white hover:bg-gray-50 rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110 translate-x-4"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16" id="features" data-animate>
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Truck,
                title: "Fast Delivery",
                desc: "Get your groceries delivered in 2 hours or less",
                color: "green",
              },
              {
                icon: Shield,
                title: "Quality Guarantee",
                desc: "100% satisfaction guarantee on all products",
                color: "blue",
              },
              {
                icon: Clock,
                title: "24/7 Support",
                desc: "Customer support available around the clock",
                color: "purple",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className={`text-center group transform transition-all duration-700 hover:-translate-y-4 ${
                  isVisible.features ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div
                  className={`h-16 w-16 bg-${feature.color}-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-${feature.color}-200 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12`}
                >
                  <feature.icon className={`h-8 w-8 text-${feature.color}-600`} />
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-green-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-green-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto text-center relative z-10">
          <div className="transform hover:scale-105 transition-transform duration-500">
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="text-green-100 mb-8">Get the latest deals and offers delivered to your inbox</p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white text-black border-0 focus:ring-2 focus:ring-green-300 transition-all duration-300"
              />
              <Button
                variant="secondary"
                className="transform hover:scale-105 transition-all duration-300 hover:bg-white hover:text-green-600"
              >
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-bounce"></div>
        <div
          className="absolute bottom-10 right-10 w-16 h-16 bg-white/10 rounded-full animate-bounce"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-bounce"
          style={{ animationDelay: "2s" }}
        ></div>
      </section>
    </div>
  )
}
