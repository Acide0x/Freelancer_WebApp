// src/pages/admin/AdminLayout.jsx
// Wrap this with your existing <BrowserRouter> / <Routes> in main.jsx / App.jsx:
//
//   <Route path="/admin" element={<AdminLayout />}>
//     <Route index element={<Navigate to="dashboard" replace />} />
//     <Route path="dashboard" element={<AdminDashboard />} />
//     <Route path="kyc" element={<KYCVerification />} />
//   </Route>

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  {
    to: "/admindashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/kyc-verification",
    label: "KYC Verification",
    icon: ShieldCheck,
  },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    // clear your auth token here
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-60" : "w-16"
        } transition-all duration-200 bg-white border-r border-gray-200 flex flex-col`}
      >
        {/* Logo / Toggle */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
          {sidebarOpen && (
            <span className="text-lg font-bold text-gray-900">Admin</span>
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-green-50 text-green-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition w-full"
          >
            <LogOut size={18} className="shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}