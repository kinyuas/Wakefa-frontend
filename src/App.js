// src/App.js - UPDATED FOR TOKEN-BASED AUTHENTICATION
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import page components
import Home from './pages/Home';

// Import auth components
import AdminLogin from './pages/Auth/AdminLogin';
import CashierLogin from './pages/Auth/CashierLogin';

// Import dashboard layouts
import AdminDashboard from './pages/Admin/AdminDashboard';
import CashierDashboard from './pages/Cashier/CashierDashboard';

// Import admin components
import CashierManagement from './pages/Admin/CashierManagement';
import ShopManagement from './pages/Admin/ShopManagement';
import ProductManagement from './pages/Admin/ProductManagement';
import Inventory from './pages/Admin/Inventory';
import ExpenseManagement from './pages/Admin/ExpenseManagement';
import TransactionReports from './pages/Admin/TransactionReports';

// Import cashier components
import ShopSelection from './pages/Cashier/ShopSelection';

// Import API for token validation
import { authAPI } from './services/api';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/cashier-login" element={<CashierLogin />} />
        
        {/* Additional login route aliases */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/cashier/login" element={<CashierLogin />} />

        {/* Standalone Shop Selection Route */}
        <Route path="/cashier/shops" element={<ShopSelection />} />

        {/* Admin Routes */}
        <Route path="/admin/*" element={<AdminDashboard />}>
          <Route index element={<Navigate to="cashiers" replace />} />
          <Route path="cashiers" element={<CashierManagement />} />
          <Route path="shops" element={<ShopManagement />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="expenses" element={<ExpenseManagement />} />
          <Route path="transactions" element={<TransactionReports />} />
          
          {/* Catch-all route for admin section */}
          <Route path="*" element={<Navigate to="cashiers" replace />} />
        </Route>

        {/* Cashier Routes */}
        <Route path="/cashier/dashboard" element={<CashierDashboard />} />
        
        {/* Smart redirect */}
        <Route path="/redirect" element={<SmartRedirect />} />
        
        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

// Smart redirect component
const SmartRedirect = () => {
  // Check cashier authentication using token manager
  const cashierData = localStorage.getItem('cashierData');
  const cashierToken = localStorage.getItem('cashierToken') || localStorage.getItem('token');
  
  // Check admin authentication using token manager
  const adminData = localStorage.getItem('adminData') || localStorage.getItem('userData');
  const adminToken = localStorage.getItem('adminToken') || localStorage.getItem('token');
  
  // Check if cashier is authenticated and has selected a shop
  if (cashierToken && cashierData) {
    try {
      const parsedCashier = JSON.parse(cashierData);
      if (parsedCashier.lastShop && parsedCashier.shopName) {
        return <Navigate to="/cashier/dashboard" replace />;
      } else {
        return <Navigate to="/cashier/shops" replace />;
      }
    } catch (e) {
      // Clear invalid data
      localStorage.removeItem('cashierData');
      localStorage.removeItem('cashierToken');
      localStorage.removeItem('token');
      return <Navigate to="/cashier/login" replace />;
    }
  }
  
  // Check if admin is authenticated
  if (adminToken && adminData) {
    try {
      const parsedAdmin = JSON.parse(adminData);
      if (parsedAdmin.role === 'admin') {
        return <Navigate to="/admin/cashiers" replace />;
      }
    } catch (e) {
      // Clear invalid data
      localStorage.removeItem('adminData');
      localStorage.removeItem('userData');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('token');
    }
  }
  
  return <Navigate to="/" replace />;
};

// Root redirect component
const RootRedirect = () => {
  const isAuthenticated = () => {
    try {
      // Check cashier authentication
      const cashierToken = localStorage.getItem('cashierToken') || localStorage.getItem('token');
      const cashierData = localStorage.getItem('cashierData');
      
      if (cashierToken && cashierData) {
        try {
          const parsedCashier = JSON.parse(cashierData);
          if (parsedCashier && parsedCashier._id && parsedCashier.email) {
            // Verify the user is actually a cashier
            if (parsedCashier.role === 'cashier') {
              if (parsedCashier.lastShop && parsedCashier.shopName) {
                return { type: 'cashier', hasShop: true };
              } else {
                return { type: 'cashier', hasShop: false };
              }
            }
          }
        } catch (e) {
          // Clear invalid data
          localStorage.removeItem('cashierData');
          localStorage.removeItem('cashierToken');
          localStorage.removeItem('token');
        }
      }
      
      // Check admin authentication
      const adminToken = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const adminData = localStorage.getItem('adminData') || localStorage.getItem('userData');
      
      if (adminToken && adminData) {
        try {
          const parsedAdmin = JSON.parse(adminData);
          if (parsedAdmin && parsedAdmin.email && parsedAdmin.role === 'admin') {
            return { type: 'admin', hasShop: true };
          }
        } catch (e) {
          // Clear invalid data
          localStorage.removeItem('adminData');
          localStorage.removeItem('userData');
          localStorage.removeItem('adminToken');
          localStorage.removeItem('token');
        }
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
    }
    
    return null;
  };

  const authStatus = isAuthenticated();
  
  if (authStatus?.type === 'cashier') {
    if (authStatus.hasShop) {
      return <Navigate to="/cashier/dashboard" replace />;
    } else {
      return <Navigate to="/cashier/shops" replace />;
    }
  }
  
  if (authStatus?.type === 'admin') {
    return <Navigate to="/admin/cashiers" replace />;
  }
  
  return <Home />;
};

export default App;