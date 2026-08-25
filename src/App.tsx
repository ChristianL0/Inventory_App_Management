import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { ProductList } from "@/pages/ProductList";
import { ProductForm } from "@/pages/ProductForm";
import { ProductDetail } from "@/pages/ProductDetail";
import { ProductPublic } from "@/pages/ProductPublic";
import { Suppliers } from "@/pages/Suppliers";
import { NotFound } from "@/pages/NotFound";

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper dark:bg-ink">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public — this is the route the printed QR code opens, no auth required */}
              <Route path="/product/:sampleId" element={<ProductPublic />} />

              <Route path="/login" element={<Login />} />

              {/* Authenticated (admin + user) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<AppShell><Dashboard /></AppShell>} />
                <Route path="/products" element={<AppShell><ProductList /></AppShell>} />
                <Route path="/products/:id" element={<AppShell><ProductDetail /></AppShell>} />
                <Route path="/suppliers" element={<AppShell><Suppliers /></AppShell>} />
              </Route>

              {/* Admin only */}
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/products/new" element={<AppShell><ProductForm /></AppShell>} />
                <Route path="/products/:id/edit" element={<AppShell><ProductForm /></AppShell>} />
              </Route>

              <Route path="*" element={<AppShell><NotFound /></AppShell>} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
