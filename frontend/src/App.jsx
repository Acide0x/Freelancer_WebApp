// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import CategoriesPage from "./pages/CategoriesPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { Navbar } from './components/Navbar';
import {Footer} from './components/footer'; 
import { AppProvider } from './context/AppContext'; // ✅ import AppProvider
// import Footer from "./components/Footer";

export default function App() {
  return (
    <AppProvider> {/* ✅ Wrap everything inside AppProvider */}
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          {/* Add more routes as needed */}
        </Routes>
        <Footer />
        {/* <Footer /> */}
      </BrowserRouter>
    </AppProvider>
  );
}
