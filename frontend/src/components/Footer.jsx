"use client";
import React, { useState } from "react";
import { Phone, Mail, MapPin, Truck, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


export function Footer({ setCurrentPage }) {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setEmail("");
      setTimeout(() => setIsSubscribed(false), 3000);
    }
  };

  const currentYear = new Date().getFullYear();

  const footerLinks = {
    company: [
      { name: "About Us", action: () => console.log("About Us") },
      { name: "Our Story", action: () => console.log("Our Story") },
      { name: "Careers", action: () => console.log("Careers") },
      { name: "Press", action: () => console.log("Press") },
      { name: "Blog", action: () => console.log("Blog") },
    ],
    customer: [
      { name: "Help Center", action: () => console.log("Help Center") },
      { name: "Contact Us", action: () => console.log("Contact Us") },
      { name: "Returns & Refunds", action: () => console.log("Returns") },
      { name: "Shipping Info", action: () => console.log("Shipping") },
      { name: "Track Your Order", action: () => console.log("Track Order") },
    ],
    shopping: [
      { name: "All Categories", action: () => (setCurrentPage ? setCurrentPage("categories") : null) },
      { name: "Fresh Produce", action: () => (setCurrentPage ? setCurrentPage("categories") : null) },
      { name: "Dairy & Eggs", action: () => (setCurrentPage ? setCurrentPage("categories") : null) },
      { name: "Meat & Seafood", action: () => (setCurrentPage ? setCurrentPage("categories") : null) },
      { name: "Weekly Deals", action: () => console.log("Weekly Deals") },
    ],
    legal: [
      { name: "Privacy Policy", action: () => console.log("Privacy Policy") },
      { name: "Terms of Service", action: () => console.log("Terms of Service") },
      { name: "Cookie Policy", action: () => console.log("Cookie Policy") },
      { name: "Accessibility", action: () => console.log("Accessibility") },
    ],
  };

  const socialLinks = [
    { name: "Facebook", icon: "📘", url: "#" },
    { name: "Twitter", icon: "🐦", url: "#" },
    { name: "Instagram", icon: "📷", url: "#" },
    { name: "YouTube", icon: "📺", url: "#" },
    { name: "LinkedIn", icon: "💼", url: "#" },
  ];

  const paymentMethods = ["💳", "🏦", "💰", "📱", "🔒"];

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Newsletter Section */}
      <div className="border-b border-gray-700">
        <div className="container py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Stay Fresh with FreshMart</h2>
            <p className="text-gray-300 mb-8 text-lg">
              Get exclusive deals, fresh product updates, and seasonal recipes delivered to your inbox
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white/10 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500"
                  required
                />
              </div>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 px-8 font-semibold"
                disabled={isSubscribed}
              >
                {isSubscribed ? "✓ Subscribed!" : "Subscribe"}
              </Button>
            </form>
            {isSubscribed && <p className="text-green-400 mt-4 font-medium">Thank you for subscribing! 🎉</p>}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container py-16">
        <div className="grid lg:grid-cols-6 md:grid-cols-4 sm:grid-cols-2 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2 md:col-span-2 sm:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">FM</span>
              </div>
              <div>
                <span className="font-bold text-2xl">FreshMart</span>
                <p className="text-green-400 text-sm font-medium">Fresh • Fast • Reliable</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Your trusted neighborhood grocery store, delivering farm-fresh quality products to your doorstep since
              2020. We're committed to bringing you the freshest ingredients for your family's table.
            </p>
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors">
                <div className="h-8 w-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <Phone className="h-4 w-4 text-green-400" />
                </div>
                <span>(555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors">
                <div className="h-8 w-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <Mail className="h-4 w-4 text-green-400" />
                </div>
                <span>hello@freshmart.com</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors">
                <div className="h-8 w-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-green-400" />
                </div>
                <span>123 Market Street, Fresh City, FC 12345</span>
              </div>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-bold text-lg mb-6 text-white">Company</h3>
            <div className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <button
                  key={index}
                  onClick={link.action}
                  className="block text-gray-300 hover:text-green-400 transition-colors duration-200 text-left"
                >
                  {link.name}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="font-bold text-lg mb-6 text-white">Customer Care</h3>
            <div className="space-y-3">
              {footerLinks.customer.map((link, index) => (
                <button
                  key={index}
                  onClick={link.action}
                  className="block text-gray-300 hover:text-green-400 transition-colors duration-200 text-left"
                >
                  {link.name}
                </button>
              ))}
            </div>
          </div>

          {/* Shopping */}
          <div>
            <h3 className="font-bold text-lg mb-6 text-white">Shop</h3>
            <div className="space-y-3">
              {footerLinks.shopping.map((link, index) => (
                <button
                  key={index}
                  onClick={link.action}
                  className="block text-gray-300 hover:text-green-400 transition-colors duration-200 text-left"
                >
                  {link.name}
                </button>
              ))}
            </div>
          </div>

          {/* Legal & Store Hours */}
          <div>
            <h3 className="font-bold text-lg mb-6 text-white">Store Hours</h3>
            <div className="space-y-2 text-gray-300 mb-6">
              <div className="flex justify-between">
                <span>Mon - Fri:</span>
                <span className="text-green-400 font-medium">7AM - 10PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday:</span>
                <span className="text-green-400 font-medium">8AM - 10PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday:</span>
                <span className="text-green-400 font-medium">9AM - 9PM</span>
              </div>
            </div>
            <h4 className="font-semibold text-white mb-3">Legal</h4>
            <div className="space-y-2">
              {footerLinks.legal.map((link, index) => (
                <button
                  key={index}
                  onClick={link.action}
                  className="block text-gray-300 hover:text-green-400 transition-colors duration-200 text-left text-sm"
                >
                  {link.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Social Media & Features */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            {/* Social Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Follow Us</h4>
              <div className="flex space-x-4">
                {socialLinks.map((social, index) => (
                  <button
                    key={index}
                    className="h-10 w-10 bg-gray-700 hover:bg-green-600 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                    title={social.name}
                  >
                    <span className="text-lg">{social.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="text-center">
              <div className="flex justify-center space-x-8 text-sm">
                <div className="flex items-center space-x-2 text-gray-300">
                  <Truck className="h-5 w-5 text-green-400" />
                  <span>Free Delivery</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <Shield className="h-5 w-5 text-green-400" />
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <Clock className="h-5 w-5 text-green-400" />
                  <span>24/7 Support</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="md:text-right">
              <h4 className="font-semibold text-white mb-4">We Accept</h4>
              <div className="flex md:justify-end space-x-2">
                {paymentMethods.map((method, index) => (
                  <div key={index} className="h-8 w-12 bg-gray-700 rounded flex items-center justify-center text-lg">
                    {method}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700 bg-gray-900/50">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              © {currentYear} FreshMart. All rights reserved. Made with ❤️ for fresh food lovers.
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>🌱 Eco-Friendly Packaging</span>
              <span>🚚 Carbon Neutral Delivery</span>
              <span>⭐ 4.9/5 Customer Rating</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Optional: Set default props if needed
Footer.defaultProps = {
  setCurrentPage: undefined,
};