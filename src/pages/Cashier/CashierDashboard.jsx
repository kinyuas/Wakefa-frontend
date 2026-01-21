// src/pages/Cashier/CashierDashboard.jsx - SIMPLIFIED VERSION
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Layout, Card, Row, Col, Statistic, Typography, Tag,
  Space, Button, Spin, Alert, Divider, Input, Modal, Form, InputNumber, Tooltip, 
  FloatButton, notification, Empty, message, Descriptions, Badge, Popconfirm
} from 'antd';
import {
  ShopOutlined, UserOutlined, DollarOutlined,
  ShoppingCartOutlined, LogoutOutlined, ReloadOutlined,
  ArrowLeftOutlined, BarChartOutlined, TransactionOutlined,
  SearchOutlined, PlusOutlined, BarcodeOutlined,
  CalculatorOutlined, DeleteOutlined, ScanOutlined,
  PrinterOutlined, SafetyCertificateOutlined, QrcodeOutlined,
  ClearOutlined, CreditCardOutlined, PhoneOutlined,
  CalendarOutlined, BankOutlined, MoneyCollectOutlined,
  HistoryOutlined, WarningOutlined, CheckCircleOutlined,
  ClockCircleOutlined, TeamOutlined, ShoppingOutlined,
  EyeOutlined, FileTextOutlined, InfoCircleOutlined,
  RiseOutlined, FallOutlined, StockOutlined,
  CloseOutlined,
  CameraOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI, unifiedAPI, productAPI, transactionAPI } from '../../services/api';
import Cart from './Cart';
import ReceiptTemplate from '../../components/ReceiptTemplate';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

// Enhanced Calculation Utilities with consistent styling
const CashierCalculationUtils = {
  safeNumber: (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  },

  formatCurrency: (amount) => {
    const value = CashierCalculationUtils.safeNumber(amount);
    return `KES ${value.toLocaleString('en-KE', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  },

  calculateCartTotals: (cart) => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    return {
      subtotal,
      totalItems,
      grandTotal: subtotal,
      averageItemPrice: totalItems > 0 ? subtotal / totalItems : 0
    };
  },

  // Get color based on value
  getValueColor: (value, type = 'default') => {
    const numValue = CashierCalculationUtils.safeNumber(value);
    
    if (type === 'profit') {
      if (numValue > 0) return '#3f8600'; // Green
      if (numValue < 0) return '#cf1322'; // Red
      return '#8c8c8c'; // Gray
    }
    
    if (type === 'revenue') {
      if (numValue > 0) return '#1890ff'; // Blue
      return '#8c8c8c';
    }
    
    if (type === 'warning') {
      if (numValue > 0) return '#fa8c16'; // Orange
      return '#8c8c8c';
    }
    
    return '#595959'; // Default
  },

  // Get profit icon
  getProfitIcon: (profit) => {
    const value = CashierCalculationUtils.safeNumber(profit);
    return value >= 0 ? <RiseOutlined /> : <FallOutlined />;
  }
};

// Default stats without credit functionality
const getDefaultCashierStats = () => ({
  totalSales: 0,
  totalTransactions: 0,
  totalItems: 0,
  cashAmount: 0,
  bankMpesaAmount: 0,
  cashierItemsSold: 0
});

// Color scheme
const COLOR_SCHEME = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#fa8c16',
  error: '#f5222d',
  info: '#13c2c2',
  purple: '#722ed1',
  magenta: '#eb2f96',
  gold: '#faad14',
  cyan: '#08979c',
  lime: '#a0d911',
  volcano: '#fa541c',
  geekblue: '#2f54eb',
  
  // Background colors
  background: {
    light: '#f8f9fa',
    card: '#ffffff',
    header: '#1a365d',
    sidebar: '#2d3748'
  },
  
  // Status colors
  status: {
    completed: '#52c41a',
    pending: '#fa8c16',
    active: '#1890ff',
    danger: '#ff4d4f',
    success: '#52c41a'
  }
};

const CashierDashboard = () => {
  const navigate = useNavigate();
  const [cashier, setCashier] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);

  // Dashboard States
  const [dailyStats, setDailyStats] = useState(getDefaultCashierStats());
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // POS States
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [posLoading, setPosLoading] = useState({
    products: false,
    checkout: false,
    stats: false
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  
  // ✅ Barcode scanning states - ALWAYS ON
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState(true); // Always on by default
  const [barcodeHistory, setBarcodeHistory] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanError, setScanError] = useState(null);

  const [lowStockProducts, setLowStockProducts] = useState([]);

  // Payment Modal States (CREDIT REMOVED)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentForm] = Form.useForm();
  const [cashBankMpesaSplit, setCashBankMpesaSplit] = useState({
    cashAmount: 0,
    bankMpesaAmount: 0,
    totalAmount: 0
  });

  // ✅ Barcode scanner setup
  const barcodeInputRef = useRef(null);

  // Enhanced cart calculations
  const totals = useMemo(() => {
    return CashierCalculationUtils.calculateCartTotals(cart);
  }, [cart]);

  // Company information
  const companyInfo = useMemo(() => ({
    name: "STANZO SHOP",
    address: "Mikinduri, Kenya",
    phone: "+254 746919850",
    email: "stanzokinyua5967@gmail.com",
    slogan: "Quality Products, Best Prices",
    logo: "🏪"
  }), []);

  // ========== CART FUNCTIONS ==========
  const addToCart = useCallback((product, quantity = 1) => {
    if (!product._id) {
      console.error('❌ Cannot add product to cart: product ID is missing', product);
      message.error('Cannot add product to cart. Product data is invalid.');
      return;
    }

    const currentStock = product.currentStock || 0;
    
    if (currentStock <= 0) {
      message.warning(`${product.name} is out of stock.`);
      return;
    }

    if (quantity > currentStock) {
      message.warning(`Only ${currentStock} items available in stock for ${product.name}.`);
      quantity = currentStock;
    }

    const price = product.minSellingPrice || product.sellingPrice || 0;

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product._id);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > currentStock) {
          message.warning(`Only ${currentStock} items available in stock for ${product.name}.`);
          return prevCart.map(item =>
            item.productId === product._id
              ? { ...item, quantity: currentStock }
              : item
          );
        }
        
        return prevCart.map(item =>
          item.productId === product._id
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        return [...prevCart, {
          productId: product._id,
          name: product.name,
          price: price,
          quantity: quantity,
          stock: currentStock,
          category: product.category,
          barcode: product.barcode,
          product,
          subtotal: price * quantity
        }];
      }
    });

    // Show success notification
    notification.success({
      message: 'Product Added',
      description: `${quantity} x ${product.name} added to cart`,
      placement: 'topRight',
      duration: 2,
    });
  }, []);

  const updateCartItem = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p._id === productId);
    if (product && quantity > product.currentStock) {
      message.warning(`Only ${product.currentStock} items available in stock.`);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.productId === productId
          ? { 
            ...item, 
            quantity,
            subtotal: item.price * quantity
          }
          : item
      )
    );
  }, [products]);

  const removeFromCart = useCallback((productId) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    if (cart.length === 0) return;
    
    Modal.confirm({
      title: 'Clear Cart',
      content: 'Are you sure you want to clear all items from the cart?',
      okText: 'Yes, Clear',
      cancelText: 'Cancel',
      okType: 'danger',
      onOk() {
        setCart([]);
        message.success('Cart cleared successfully');
      }
    });
  }, [cart.length]);

  // ✅ Clear barcode input
  const clearBarcodeInput = useCallback(() => {
    setBarcodeInput('');
    setScanError(null);
    setScanSuccess(false);
    setScanResult(null);
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // ========== END CART FUNCTIONS ==========

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = () => {
      const cashierData = JSON.parse(localStorage.getItem('cashierData'));
      
      if (!cashierData) {
        navigate('/cashier/login');
        return;
      }
      
      setCashier(cashierData);
      
      // Get selected shop from localStorage
      if (cashierData.lastShop) {
        setSelectedShop({
          _id: cashierData.lastShop,
          name: cashierData.shopName || 'Selected Shop'
        });
      } else {
        navigate('/cashier/shops');
        return;
      }
      
      setDashboardLoading(false);
    };

    initializeDashboard();
  }, [navigate]);

  // ✅ Focus barcode input when scan mode is enabled (always on)
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // ✅ Barcode scanning handler
  const handleBarcodeScan = useCallback(async (barcode) => {
    if (!barcode || scanning || !selectedShop?._id) return;
    
    setScanning(true);
    setScanError(null);
    setScanSuccess(false);
    setScanResult(null);
    
    console.log('🔍 Scanning barcode:', barcode);
    
    try {
      // Call the barcode search API
      const response = await productAPI.searchByBarcode(barcode, selectedShop._id);
      
      if (response.success && response.data) {
        const product = response.data;
        
        // Add to cart
        addToCart(product, 1);
        
        // Update scan result
        setScanResult({
          product: product.name,
          barcode: product.barcode,
          price: product.minSellingPrice || product.sellingPrice,
          category: product.category
        });
        
        setScanSuccess(true);
        
        // Add to barcode history
        setBarcodeHistory(prev => [
          {
            barcode,
            product: product.name,
            timestamp: new Date().toISOString(),
            success: true
          },
          ...prev.slice(0, 9) // Keep only last 10 scans
        ]);
        
        message.success(`✓ Added ${product.name} to cart`);
        
        // Clear input after successful scan
        setTimeout(() => {
          setBarcodeInput('');
          setScanSuccess(false);
          if (barcodeInputRef.current) {
            barcodeInputRef.current.focus();
          }
        }, 100);
        
      } else {
        setScanError('Product not found with this barcode');
        message.error('Product not found with this barcode');
        
        // Add to history (failed scan)
        setBarcodeHistory(prev => [
          {
            barcode,
            product: 'Not Found',
            timestamp: new Date().toISOString(),
            success: false
          },
          ...prev.slice(0, 9)
        ]);
      }
    } catch (error) {
      console.error('❌ Barcode scan error:', error);
      setScanError('Failed to scan barcode. Please try again.');
      message.error('Failed to scan product');
      
      setBarcodeHistory(prev => [
        {
          barcode,
          product: 'Error',
          timestamp: new Date().toISOString(),
          success: false,
          error: error.message
        },
        ...prev.slice(0, 9)
      ]);
    } finally {
      setScanning(false);
    }
  }, [scanning, selectedShop, addToCart]);

  // ✅ Handle barcode input key press (for manual entry and scanner)
  const handleBarcodeKeyPress = useCallback((e) => {
    // If Enter key is pressed or scanner sends data
    if (e.key === 'Enter' && barcodeInput.trim()) {
      e.preventDefault();
      handleBarcodeScan(barcodeInput.trim());
    }
  }, [barcodeInput, handleBarcodeScan]);

  // ✅ Handle barcode input change (for real-time scanning)
  useEffect(() => {
    // Auto-scan when barcode reaches typical length (EAN13: 13, UPC: 12, etc.)
    const barcodeLength = barcodeInput.length;
    const isTypicalBarcodeLength = [12, 13, 8].includes(barcodeLength);
    
    // Auto-trigger scan for typical barcode lengths (most scanners send Enter, but some don't)
    if (isTypicalBarcodeLength && !scanning && barcodeInput) {
      const timer = setTimeout(() => {
        handleBarcodeScan(barcodeInput);
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [barcodeInput, scanning, handleBarcodeScan]);

  // Validate shop and cashier data
  const validateShopAndCashier = useCallback(() => {
    if (!selectedShop || !selectedShop._id) {
      message.error('Please select a shop to continue.');
      return false;
    }
    
    if (!cashier || !cashier._id) {
      message.error('Cashier information is missing. Please log in again.');
      return false;
    }
    
    return true;
  }, [selectedShop, cashier]);

  // Fetch cashier daily stats - CREDIT FUNCTIONALITY REMOVED
  const fetchCashierDailyStats = useCallback(async () => {
    if (!cashier?._id || !selectedShop?._id) return;

    setPosLoading(prev => ({ ...prev, stats: true }));
    
    try {
      console.log('📊 Fetching cashier daily stats...');

      const today = dayjs().startOf('day').toISOString();
      const now = dayjs().toISOString();

      // Use unified API to get transactions data only
      const combinedData = await unifiedAPI.getCombinedTransactions({
        cashierId: cashier._id,
        shopId: selectedShop._id,
        startDate: today,
        endDate: now
      });

      // Extract and transform data for cashier dashboard
      const transactions = combinedData.transactions || [];
      const summary = combinedData.summary || {};
      const enhancedStats = combinedData.enhancedStats?.financialStats || {};

      // Calculate stats (credit functionality removed)
      const totalSales = enhancedStats.totalRevenue || summary.totalRevenue || 0;
      const totalTransactions = transactions.length;
      
      // Calculate cash and bank_mpesa from payment splits
      let cashAmount = 0;
      let bankMpesaAmount = 0;

      transactions.forEach(transaction => {
        if (transaction.paymentSplit) {
          cashAmount += CashierCalculationUtils.safeNumber(transaction.paymentSplit.cash);
          bankMpesaAmount += CashierCalculationUtils.safeNumber(transaction.paymentSplit.bank_mpesa);
        } else {
          // Fallback calculation
          if (transaction.paymentMethod === 'cash') {
            cashAmount += CashierCalculationUtils.safeNumber(transaction.totalAmount);
          } else if (['mpesa', 'bank', 'card', 'bank_mpesa'].includes(transaction.paymentMethod)) {
            bankMpesaAmount += CashierCalculationUtils.safeNumber(transaction.totalAmount);
          }
        }
      });

      const cashierItemsSold = transactions.reduce((sum, t) => 
        sum + (t.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0
      );

      setDailyStats({
        totalSales,
        totalTransactions,
        cashAmount,
        bankMpesaAmount,
        cashierItemsSold
      });

      console.log('✅ Daily stats updated:', {
        totalSales,
        cashAmount,
        bankMpesaAmount
      });

    } catch (error) {
      console.error('❌ Error fetching cashier daily stats:', error);
      await fetchDailySalesFallback();
    } finally {
      setPosLoading(prev => ({ ...prev, stats: false }));
    }
  }, [cashier, selectedShop]);

  // Enhanced products fetch with better filtering
  const fetchProducts = useCallback(async (showMessage = false) => {
    if (!validateShopAndCashier()) return;
    
    setPosLoading(prev => ({ ...prev, products: true }));
    
    try {
      const response = await productAPI.getAll();
      const productsData = response.data || response;
      
      const shopProducts = Array.isArray(productsData) 
        ? productsData.filter(product => {
            const productShopId = product.shop?._id || product.shop || product.shopId;
            return productShopId === selectedShop._id && product.isActive !== false;
          })
        : [];

      setProducts(shopProducts);
      setFilteredProducts(shopProducts);

      // Extract unique categories
      const uniqueCategories = [...new Set(shopProducts
        .map(p => p.category)
        .filter(Boolean)
        .sort()
      )];
      setCategories(uniqueCategories);

      // Enhanced low stock analysis
      const lowStock = shopProducts.filter(product => 
        product.currentStock > 0 && product.currentStock <= (product.minStockLevel || 5)
      );
      setLowStockProducts(lowStock);

      if (showMessage && shopProducts.length === 0) {
        message.warning(`No products found for ${selectedShop?.name}. Please add products first.`);
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      notification.error({
        message: 'Failed to Load Products',
        description: 'Please check your connection and try again.',
        duration: 3,
      });
    } finally {
      setPosLoading(prev => ({ ...prev, products: false }));
    }
  }, [validateShopAndCashier, selectedShop]);

  // ✅ Quick product search by barcode (for search bar)
  const handleProductSearch = useCallback(async (value) => {
    if (!value.trim()) {
      // If empty search, show all products
      setFilteredProducts(products);
      return;
    }

    // Check if it looks like a barcode (numbers, dashes, uppercase letters)
    const isBarcodeFormat = /^[A-Z0-9\-]+$/.test(value.trim().toUpperCase());
    
    if (isBarcodeFormat) {
      // Try to search by barcode
      try {
        const response = await productAPI.searchByBarcode(value.trim(), selectedShop._id);
        if (response.success && response.data) {
          // Show only the matched product
          setFilteredProducts([response.data]);
          message.success(`Found product: ${response.data.name}`);
        } else {
          // If barcode not found, fall back to regular search
          const filtered = products.filter(product => 
            product.name?.toLowerCase().includes(value.toLowerCase()) ||
            product.category?.toLowerCase().includes(value.toLowerCase()) ||
            product.barcode?.toLowerCase().includes(value.toLowerCase())
          );
          setFilteredProducts(filtered);
        }
      } catch (error) {
        // Fall back to regular search
        const filtered = products.filter(product => 
          product.name?.toLowerCase().includes(value.toLowerCase()) ||
          product.category?.toLowerCase().includes(value.toLowerCase()) ||
          product.barcode?.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredProducts(filtered);
      }
    } else {
      // Regular search
      const filtered = products.filter(product => 
        product.name?.toLowerCase().includes(value.toLowerCase()) ||
        product.category?.toLowerCase().includes(value.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [products, selectedShop]);

  // Enhanced payment method selection - CREDIT OPTION REMOVED
  const handlePaymentMethodSelect = useCallback((method) => {
    setSelectedPaymentMethod(method);
    
    if (method === 'cash_bank_mpesa') {
      setCashBankMpesaSplit({
        cashAmount: 0,
        bankMpesaAmount: 0,
        totalAmount: totals.subtotal
      });
      paymentForm.setFieldsValue({
        cashAmount: 0,
        bankMpesaAmount: 0
      });
    }
    
    setPaymentModalVisible(true);
  }, [totals.subtotal]);

  // Enhanced checkout - CREDIT FUNCTIONALITY REMOVED
  const handleCheckout = useCallback(async (paymentMethod, paymentDetails = {}) => {
    if (!validateShopAndCashier()) return;

    if (cart.length === 0) {
      Modal.error({
        title: 'Empty Cart',
        content: 'Please add items to cart before checkout.',
      });
      return;
    }

    setPosLoading(prev => ({ ...prev, checkout: true }));
    
    try {
      const generateTransactionNumber = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `TXN-${timestamp}-${random}`.toUpperCase();
      };

      // Transaction data (credit removed) - ONLY 3 PAYMENT METHODS
      const transactionData = {
        shop: selectedShop._id,
        shopName: selectedShop.name,
        cashierId: cashier._id,
        cashierName: cashier.name || 'Cashier',
        customerName: 'Walk-in Customer', // Always walk-in since credit is removed
        transactionNumber: generateTransactionNumber(),
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.name,
          quantity: Number(item.quantity),
          price: Number(item.price),
          totalPrice: Number(item.price * item.quantity),
          barcode: item.barcode,
          costPrice: item.product?.buyingPrice || 0
        })),
        totalAmount: Number(totals.subtotal),
        paymentMethod: paymentMethod, // 'cash', 'bank_mpesa', or 'cash_bank_mpesa'
        status: 'completed',
        itemsCount: Number(totals.totalItems),
        saleDate: new Date().toISOString(),
        receiptNumber: `RCP-${Date.now()}`,
        cost: cart.reduce((sum, item) => {
          const costPrice = item.product?.buyingPrice || 0;
          return sum + (costPrice * item.quantity);
        }, 0)
      };

      // Payment data for different methods (only 3 methods)
      if (paymentMethod === 'cash_bank_mpesa') {
        transactionData.cashAmount = paymentDetails.cashAmount;
        transactionData.bankMpesaAmount = paymentDetails.bankMpesaAmount;
        transactionData.paymentSplit = {
          cash: paymentDetails.cashAmount,
          bank_mpesa: paymentDetails.bankMpesaAmount
        };
      } else if (paymentMethod === 'cash') {
        transactionData.paymentSplit = {
          cash: totals.subtotal,
          bank_mpesa: 0
        };
      } else if (paymentMethod === 'bank_mpesa') {
        transactionData.paymentSplit = {
          cash: 0,
          bank_mpesa: totals.subtotal
        };
      }

      console.log('💰 Processing transaction:', transactionData);

      const response = await transactionAPI.create(transactionData);
      const transactionResult = response?.data || response;
      
      if (transactionResult && transactionResult._id) {
        console.log('✅ Transaction completed successfully');
        
        setCurrentTransaction(transactionResult);
        setShowReceipt(true);
        
        // Enhanced data refresh
        await Promise.all([
          fetchCashierDailyStats(),
          fetchProducts()
        ]);
        
        notification.success({
          message: 'Transaction Completed Successfully',
          description: `Sale completed for ${selectedShop?.name}. Total: ${CashierCalculationUtils.formatCurrency(totals.subtotal)}`,
          duration: 3,
        });

        // Clear cart and barcode scan data
        setCart([]);
        setBarcodeInput('');
        setBarcodeHistory([]);
        setScanResult(null);
        
      } else {
        throw new Error('Transaction failed: Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Checkout error:', error);
      
      let errorMessage = 'Failed to process transaction. Please try again.';
      
      if (error.message.includes('stock')) {
        errorMessage = `Stock error: ${error.message}`;
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      notification.error({
        message: 'Checkout Failed',
        description: errorMessage,
        duration: 5,
      });

      await fetchProducts();
    } finally {
      setPosLoading(prev => ({ ...prev, checkout: false }));
    }
  }, [validateShopAndCashier, cart, selectedShop, cashier, totals, fetchCashierDailyStats, fetchProducts]);

  // ✅ Barcode Scan History Component
  const BarcodeScanHistory = useCallback(() => {
    if (barcodeHistory.length === 0) return null;
    
    return (
      <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f6ffed', borderRadius: '4px' }}>
        <Text strong style={{ fontSize: '11px', color: '#52c41a', marginBottom: '4px', display: 'block' }}>
          Recent Scans ({barcodeHistory.length})
        </Text>
        <div style={{ maxHeight: '60px', overflowY: 'auto' }}>
          {barcodeHistory.slice(0, 3).map((scan, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '2px 0',
              fontSize: '10px'
            }}>
              <Text code style={{ fontSize: '9px' }}>{scan.barcode.substring(0, 10)}...</Text>
              <Tag 
                color={scan.success ? 'green' : 'red'} 
                style={{ fontSize: '8px', margin: 0, padding: '0 4px' }}
              >
                {scan.success ? '✓' : '✗'}
              </Tag>
            </div>
          ))}
        </div>
      </div>
    );
  }, [barcodeHistory]);

  // ✅ Barcode Scanner Component - ALWAYS ON
  const BarcodeScannerSection = useCallback(() => {
    return (
      <Card
        size="small"
        title={
          <Space size="small">
            <BarcodeOutlined style={{ color: COLOR_SCHEME.success }} />
            <Text strong style={{ fontSize: '13px' }}>Barcode Scanner</Text>
            <Tag color="success" style={{ fontSize: '10px', padding: '0 6px' }}>ALWAYS ON</Tag>
          </Space>
        }
        style={{ 
          marginBottom: '8px',
          borderRadius: '6px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          border: `2px solid ${COLOR_SCHEME.success}`
        }}
        bodyStyle={{ padding: '12px' }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Input
            ref={barcodeInputRef}
            placeholder="Scan barcode here..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyPress={handleBarcodeKeyPress}
            prefix={<ScanOutlined style={{ color: COLOR_SCHEME.success }} />}
            suffix={
              barcodeInput && (
                <CloseOutlined 
                  onClick={clearBarcodeInput}
                  style={{ cursor: 'pointer', color: '#bfbfbf', fontSize: '12px' }}
                />
              )
            }
            disabled={scanning}
            size="small"
            style={{ borderRadius: '4px' }}
            autoFocus
          />
          
          {scanning && (
            <div style={{ textAlign: 'center' }}>
              <Spin size="small" />
              <Text type="secondary" style={{ marginLeft: '4px', fontSize: '11px' }}>
                Scanning...
              </Text>
            </div>
          )}
          
          <BarcodeScanHistory />
        </Space>
      </Card>
    );
  }, [barcodeInput, scanning, scanMode, barcodeHistory, handleBarcodeKeyPress, clearBarcodeInput]);

  // Enhanced Product Row Component
  const ProductRow = React.memo(({ product, onAddToCart, disabled }) => {
    const stockStatus = useMemo(() => {
      const stock = product.currentStock || 0;
      if (stock <= 0) return { status: 'out', color: COLOR_SCHEME.error, text: 'Out of Stock' };
      if (stock <= (product.minStockLevel || 5)) return { status: 'low', color: COLOR_SCHEME.warning, text: 'Low Stock' };
      return { status: 'in', color: COLOR_SCHEME.success, text: 'In Stock' };
    }, [product.currentStock, product.minStockLevel]);

    const handleAddToCart = () => {
      onAddToCart(product, 1);
    };

    // ✅ Display barcode if available
    const renderBarcodeInfo = () => {
      if (!product.barcode) return null;
      
      return (
        <Tooltip title={`Barcode: ${product.barcode}`}>
          <Tag 
            color="cyan" 
            style={{ 
              fontSize: '9px', 
              margin: 0,
              cursor: 'pointer',
              padding: '0 4px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setBarcodeInput(product.barcode);
              if (barcodeInputRef.current) {
                barcodeInputRef.current.focus();
              }
            }}
          >
            {product.barcode.substring(0, 6)}...
          </Tag>
        </Tooltip>
      );
    };

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          marginBottom: '6px',
          backgroundColor: '#fff',
          border: '1px solid #f0f0f0',
          borderRadius: '6px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.3s',
          cursor: stockStatus.status === 'out' ? 'not-allowed' : 'pointer',
          opacity: stockStatus.status === 'out' ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (stockStatus.status !== 'out') {
            e.currentTarget.style.backgroundColor = '#fafafa';
            e.currentTarget.style.borderColor = COLOR_SCHEME.primary;
          }
        }}
        onMouseLeave={(e) => {
          if (stockStatus.status !== 'out') {
            e.currentTarget.style.backgroundColor = '#fff';
            e.currentTarget.style.borderColor = '#f0f0f0';
          }
        }}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: COLOR_SCHEME.background.light,
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: `1px solid ${COLOR_SCHEME.primary}20`
          }}>
            <ShoppingCartOutlined style={{ fontSize: '14px', color: COLOR_SCHEME.primary }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <Text 
              strong 
              ellipsis={{ tooltip: product.name }} 
              style={{ 
                display: 'block',
                fontSize: '13px',
                lineHeight: '1.3',
                marginBottom: '2px'
              }}
            >
              {product.name}
            </Text>
            
            <Space size={4} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <Text 
                strong 
                style={{ 
                  color: COLOR_SCHEME.primary, 
                  fontSize: '13px'
                }}
              >
                KES {(product.minSellingPrice || product.sellingPrice || 0).toLocaleString()}
              </Text>
              
              <Tag 
                color={stockStatus.color} 
                style={{ 
                  margin: 0, 
                  fontSize: '10px',
                  padding: '1px 6px',
                  lineHeight: '1.2'
                }}
              >
                Stock: {product.currentStock || 0}
              </Tag>
              
              {renderBarcodeInfo()}
            </Space>
          </div>
        </div>

        <div style={{ flexShrink: 0, marginLeft: '8px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddToCart}
            disabled={stockStatus.status === 'out' || disabled}
            size="small"
            style={{
              fontSize: '11px',
              height: '28px',
              minWidth: '80px',
              backgroundColor: stockStatus.status === 'out' ? '#d9d9d9' : COLOR_SCHEME.primary,
              borderColor: stockStatus.status === 'out' ? '#d9d9d9' : COLOR_SCHEME.primary,
              borderRadius: '4px'
            }}
          >
            Add
          </Button>
        </div>
      </div>
    );
  });

  // Enhanced Payment Method Modal - ONLY 3 METHODS
  const renderPaymentModal = () => {
    const modalTitle = `Select Payment Method - ${CashierCalculationUtils.formatCurrency(totals.subtotal)}`;

    return (
      <Modal
        title={modalTitle}
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          setSelectedPaymentMethod(null);
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setPaymentModalVisible(false);
              setSelectedPaymentMethod(null);
            }}
          >
            Cancel
          </Button>,
          <Button 
            key="process" 
            type="primary" 
            loading={posLoading.checkout}
            onClick={processPayment}
            style={{ 
              backgroundColor: COLOR_SCHEME.primary,
              borderRadius: '6px',
              fontWeight: 'bold'
            }}
          >
            Process Payment
          </Button>,
        ]}
        width={500}
        style={{ borderRadius: '8px' }}
      >
        {!selectedPaymentMethod ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card 
                  hoverable 
                  onClick={() => handlePaymentMethodSelect('cash')}
                  style={{ 
                    textAlign: 'center', 
                    borderColor: COLOR_SCHEME.success,
                    borderRadius: '8px',
                    border: '2px solid transparent',
                    transition: 'all 0.3s'
                  }}
                  bodyStyle={{ padding: '20px 10px' }}
                >
                  <DollarOutlined style={{ fontSize: '32px', color: COLOR_SCHEME.success }} />
                  <div style={{ marginTop: '12px' }}>
                    <Text strong style={{ color: COLOR_SCHEME.success, fontSize: '16px' }}>Cash</Text>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card 
                  hoverable 
                  onClick={() => handlePaymentMethodSelect('bank_mpesa')}
                  style={{ 
                    textAlign: 'center', 
                    borderColor: COLOR_SCHEME.primary,
                    borderRadius: '8px',
                    border: '2px solid transparent',
                    transition: 'all 0.3s'
                  }}
                  bodyStyle={{ padding: '20px 10px' }}
                >
                  <BankOutlined style={{ fontSize: '32px', color: COLOR_SCHEME.primary }} />
                  <div style={{ marginTop: '12px' }}>
                    <Text strong style={{ color: COLOR_SCHEME.primary, fontSize: '16px' }}>Mpesa/Bank</Text>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card 
                  hoverable 
                  onClick={() => handlePaymentMethodSelect('cash_bank_mpesa')}
                  style={{ 
                    textAlign: 'center', 
                    borderColor: COLOR_SCHEME.purple,
                    borderRadius: '8px',
                    border: '2px solid transparent',
                    transition: 'all 0.3s'
                  }}
                  bodyStyle={{ padding: '20px 10px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <DollarOutlined style={{ fontSize: '24px', color: COLOR_SCHEME.success }} />
                    <Text strong style={{ color: COLOR_SCHEME.purple }}>/</Text>
                    <BankOutlined style={{ fontSize: '24px', color: COLOR_SCHEME.primary }} />
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <Text strong style={{ color: COLOR_SCHEME.purple, fontSize: '16px' }}>Split</Text>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        ) : (
          <div style={{ padding: '10px 0' }}>
            {selectedPaymentMethod === 'cash_bank_mpesa' && (
              <Form
                form={paymentForm}
                layout="vertical"
                onValuesChange={handleCashBankMpesaChange}
              >
                <Alert
                  message="Split Payment (Cash + Mpesa/Bank)"
                  description={`Please enter the amounts for cash and Mpesa/Bank. The total must equal ${CashierCalculationUtils.formatCurrency(totals.subtotal)}`}
                  type="info"
                  showIcon
                  style={{ 
                    marginBottom: '16px',
                    borderRadius: '6px'
                  }}
                />
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Cash Amount (KES)"
                      name="cashAmount"
                      rules={[
                        { required: true, message: 'Please enter cash amount' },
                        { 
                          type: 'number', 
                          min: 0, 
                          message: 'Cash amount cannot be negative' 
                        }
                      ]}
                    >
                      <InputNumber
                        style={{ width: '100%', borderRadius: '6px' }}
                        placeholder="0.00"
                        min={0}
                        max={totals.subtotal}
                        step={0.01}
                        precision={2}
                        formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/KES\s?|(,*)/g, '')}
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Mpesa/Bank Amount (KES)"
                      name="bankMpesaAmount"
                      rules={[
                        { required: true, message: 'Please enter Mpesa/Bank amount' },
                        { 
                          type: 'number', 
                          min: 0, 
                          message: 'Mpesa/Bank amount cannot be negative' 
                        }
                      ]}
                    >
                      <InputNumber
                        style={{ width: '100%', borderRadius: '6px' }}
                        placeholder="0.00"
                        min={0}
                        max={totals.subtotal}
                        step={0.01}
                        precision={2}
                        formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/KES\s?|(,*)/g, '')}
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Descriptions 
                  size="small" 
                  bordered 
                  column={1}
                  style={{ borderRadius: '6px' }}
                >
                  <Descriptions.Item label="Cash Amount">
                    <Text strong style={{ color: COLOR_SCHEME.success }}>
                      {CashierCalculationUtils.formatCurrency(cashBankMpesaSplit.cashAmount)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Mpesa/Bank Amount">
                    <Text strong style={{ color: COLOR_SCHEME.primary }}>
                      {CashierCalculationUtils.formatCurrency(cashBankMpesaSplit.bankMpesaAmount)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Entered">
                    <Text strong style={{ color: COLOR_SCHEME.purple }}>
                      {CashierCalculationUtils.formatCurrency(cashBankMpesaSplit.totalAmount)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Required Total">
                    <Text strong style={{ color: COLOR_SCHEME.geekblue }}>
                      {CashierCalculationUtils.formatCurrency(totals.subtotal)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Difference">
                    <Text 
                      strong 
                      style={{ 
                        color: Math.abs(cashBankMpesaSplit.totalAmount - totals.subtotal) < 0.01 ? COLOR_SCHEME.success : COLOR_SCHEME.error
                      }}
                    >
                      {CashierCalculationUtils.formatCurrency(cashBankMpesaSplit.totalAmount - totals.subtotal)}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Form>
            )}
            
            {(selectedPaymentMethod === 'cash' || selectedPaymentMethod === 'bank_mpesa') && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Alert
                  message={`Confirm ${selectedPaymentMethod === 'bank_mpesa' ? 'MPESA/BANK' : 'CASH'} Payment`}
                  description={`Total Amount: ${CashierCalculationUtils.formatCurrency(totals.subtotal)}`}
                  type="info"
                  showIcon
                  style={{ borderRadius: '6px' }}
                />
                <div style={{ marginTop: '16px' }}>
                  <Text style={{ fontSize: '14px', color: COLOR_SCHEME.primary }}>
                    Click "Process Payment" to complete the transaction.
                  </Text>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    );
  };

  // Validation functions
  const validateCashBankMpesaPayment = useCallback(() => {
    const { cashAmount, bankMpesaAmount, totalAmount } = cashBankMpesaSplit;
    
    if (totalAmount.toFixed(2) !== totals.subtotal.toFixed(2)) {
      message.error(`The sum of Cash and Mpesa/Bank (KES ${totalAmount.toLocaleString()}) must equal the total amount (KES ${totals.subtotal.toLocaleString()})`);
      return false;
    }
    
    if (cashAmount < 0 || bankMpesaAmount < 0) {
      message.error('Cash and Mpesa/Bank amounts cannot be negative');
      return false;
    }
    
    return true;
  }, [cashBankMpesaSplit, totals.subtotal]);

  // Process Payment - CREDIT FUNCTIONALITY REMOVED
  const processPayment = useCallback(async () => {
    if (selectedPaymentMethod === 'cash_bank_mpesa') {
      if (!validateCashBankMpesaPayment()) return;
      
      await handleCheckout('cash_bank_mpesa', {
        cashAmount: cashBankMpesaSplit.cashAmount,
        bankMpesaAmount: cashBankMpesaSplit.bankMpesaAmount
      });
      
    } else {
      await handleCheckout(selectedPaymentMethod);
    }
    
    setPaymentModalVisible(false);
    setSelectedPaymentMethod(null);
  }, [selectedPaymentMethod, validateCashBankMpesaPayment, handleCheckout, cashBankMpesaSplit]);

  // Cash/Bank-Mpesa split handler
  const handleCashBankMpesaChange = useCallback((changedValues, allValues) => {
    const cashAmount = parseFloat(allValues.cashAmount || 0);
    const bankMpesaAmount = parseFloat(allValues.bankMpesaAmount || 0);
    const total = cashAmount + bankMpesaAmount;
    
    setCashBankMpesaSplit({
      cashAmount,
      bankMpesaAmount,
      totalAmount: total
    });
  }, []);

  // Fallback function for basic stats calculation
  const fetchDailySalesFallback = useCallback(async () => {
    try {
      const today = dayjs().startOf('day').toISOString();
      const now = dayjs().toISOString();
      
      const response = await unifiedAPI.getCombinedTransactions({
        cashierId: cashier._id,
        shopId: selectedShop._id,
        startDate: today,
        endDate: now
      });
      
      const transactions = response.transactions || [];
      
      // Calculate basic stats
      const totalSales = transactions.reduce((sum, t) => 
        sum + (t.totalAmount || 0), 0
      );
      const totalTransactions = transactions.length;

      let cashAmount = 0;
      let bankMpesaAmount = 0;

      transactions.forEach(transaction => {
        if (transaction.paymentSplit) {
          cashAmount += CashierCalculationUtils.safeNumber(transaction.paymentSplit.cash);
          bankMpesaAmount += CashierCalculationUtils.safeNumber(transaction.paymentSplit.bank_mpesa);
        } else {
          // Fallback to old method if paymentSplit is not available
          if (transaction.paymentMethod === 'cash') {
            cashAmount += CashierCalculationUtils.safeNumber(transaction.totalAmount);
          } else if (['mpesa', 'bank', 'card', 'bank_mpesa'].includes(transaction.paymentMethod)) {
            bankMpesaAmount += CashierCalculationUtils.safeNumber(transaction.totalAmount);
          }
        }
      });

      setDailyStats({
        totalSales,
        totalTransactions,
        cashAmount,
        bankMpesaAmount,
        cashierItemsSold: transactions.reduce((sum, t) => 
          sum + (t.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0
        )
      });
      
    } catch (fallbackError) {
      console.error('❌ Fallback calculation failed:', fallbackError);
      setDailyStats(getDefaultCashierStats());
    }
  }, [cashier, selectedShop]);

  const handlePrintReceipt = useCallback(() => {
    const receiptWindow = window.open('', '_blank');
    if (receiptWindow) {
      receiptWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${currentTransaction?.receiptNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div id="receipt-content"></div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => window.close(), 1000);
              };
            </script>
          </body>
        </html>
      `);
      
      const receiptContent = document.getElementById('receipt-print-content');
      if (receiptContent) {
        receiptWindow.document.getElementById('receipt-content').innerHTML = receiptContent.innerHTML;
      }
    }
  }, [currentTransaction]);

  const handleCloseReceipt = useCallback(() => {
    setShowReceipt(false);
    setCurrentTransaction(null);
  }, []);

  const handleLogout = useCallback(() => {
    authAPI.logout();
    navigate('/cashier/login');
  }, [navigate]);

  const handleBackToShops = useCallback(() => {
    navigate('/cashier/shops');
  }, [navigate]);

  // Initial data fetch
  useEffect(() => {
    if (selectedShop) {
      fetchProducts(true);
      fetchCashierDailyStats();
    }
  }, [selectedShop, fetchProducts, fetchCashierDailyStats]);

  // Show loading while initializing
  if (dashboardLoading || !selectedShop) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        backgroundColor: COLOR_SCHEME.background.light
      }}>
        <Spin size="large" style={{ color: COLOR_SCHEME.primary }} />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            {!selectedShop ? 'No shop selected. Redirecting...' : 'Loading cashier dashboard...'}
          </Text>
        </div>
      </div>
    );
  }

  return (
    <Layout style={{ 
      minHeight: '100vh', 
      background: COLOR_SCHEME.background.light,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header */}
      <Header style={{ 
        background: 'linear-gradient(135deg, #1a365d 0%, #2d3748 100%)', 
        padding: '0 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderBottom: `1px solid ${COLOR_SCHEME.primary}30`,
        height: '64px'
      }}>
        <Row justify="space-between" align="middle" style={{ height: '100%' }}>
          <Col xs={12} sm={8}>
            <Space>
              <Button 
                icon={<ArrowLeftOutlined />}
                onClick={handleBackToShops}
                type="text"
                size="small"
                style={{ 
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: '500'
                }}
              >
                Change Shop
              </Button>
              <Title level={4} style={{ margin: 0, color: 'white', fontSize: '18px' }}>
                <ShopOutlined style={{ marginRight: '8px' }} /> {selectedShop?.name || 'Cashier Portal'}
              </Title>
            </Space>
          </Col>
          <Col>
            <Space size="middle">
              <Tag color={COLOR_SCHEME.primary} style={{ 
                borderRadius: '12px',
                padding: '2px 12px',
                fontWeight: 'bold',
                border: 'none'
              }}>
                <UserOutlined /> {cashier?.name || 'Cashier'}
              </Tag>
              <Text strong style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>
                <CalendarOutlined style={{ marginRight: '4px' }} />
                {dayjs().format('DD/MM/YYYY')}
              </Text>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchCashierDailyStats();
                  fetchProducts();
                  setBarcodeHistory([]);
                }}
                loading={posLoading.stats}
                size="small"
                style={{ 
                  color: 'white', 
                  borderColor: 'rgba(255,255,255,0.3)',
                  borderRadius: '6px'
                }}
              >
                Refresh
              </Button>
              <Button 
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                danger
                size="small"
                style={{ borderRadius: '6px' }}
              >
                Logout
              </Button>
            </Space>
          </Col>
        </Row>
      </Header>

      <Content style={{ padding: '16px' }}>
        {/* NEW LAYOUT STRUCTURE */}
        <Row gutter={[16, 16]}>
          {/* LEFT SIDE - 50% width */}
          <Col xs={24} lg={12}>
            <Row gutter={[16, 16]}>
              {/* TOP 20% of left side - Today's Sales Summary & Payment Composition */}
              <Col span={24}>
                <Row gutter={[16, 16]}>
                  {/* Today's Sales Summary Card */}
                  <Col span={16}>
                    <Card
                      size="small"
                      title={
                        <Space>
                          <BarChartOutlined />
                          <Text strong style={{ fontSize: '14px' }}>Today's Sales Summary</Text>
                        </Space>
                      }
                      loading={posLoading.stats}
                      style={{ 
                        borderRadius: '6px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                        height: '100%'
                      }}
                      bodyStyle={{ padding: '12px' }}
                    >
                      <Row gutter={[8, 8]}>
                        <Col span={12}>
                          <Statistic
                            title={<Text type="secondary" style={{ fontSize: '11px' }}>Total Sales</Text>}
                            value={dailyStats.totalSales}
                            precision={0}
                            prefix="KES"
                            valueStyle={{ 
                              color: COLOR_SCHEME.primary, 
                              fontSize: '16px',
                              fontWeight: 'bold'
                            }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title={<Text type="secondary" style={{ fontSize: '11px' }}>Transactions</Text>}
                            value={dailyStats.totalTransactions}
                            valueStyle={{ 
                              color: COLOR_SCHEME.success, 
                              fontSize: '16px',
                              fontWeight: 'bold'
                            }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title={<Text type="secondary" style={{ fontSize: '11px' }}>Items Sold</Text>}
                            value={dailyStats.cashierItemsSold}
                            valueStyle={{ 
                              color: COLOR_SCHEME.warning, 
                              fontSize: '16px',
                              fontWeight: 'bold'
                            }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title={<Text type="secondary" style={{ fontSize: '11px' }}>Avg Sale</Text>}
                            value={dailyStats.totalTransactions > 0 ? dailyStats.totalSales / dailyStats.totalTransactions : 0}
                            precision={0}
                            prefix="KES"
                            valueStyle={{ 
                              color: COLOR_SCHEME.purple, 
                              fontSize: '16px',
                              fontWeight: 'bold'
                            }}
                          />
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                  
                  {/* Payment Composition Card */}
                  <Col span={8}>
                    <Card
                      size="small"
                      title={
                        <Space>
                          <DollarOutlined />
                          <Text strong style={{ fontSize: '14px' }}>Payment Composition</Text>
                        </Space>
                      }
                      style={{ 
                        borderRadius: '6px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                        height: '100%'
                      }}
                      bodyStyle={{ padding: '12px' }}
                    >
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space>
                            <div style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: COLOR_SCHEME.success
                            }} />
                            <Text style={{ fontSize: '12px' }}>Cash</Text>
                          </Space>
                          <Text strong style={{ fontSize: '13px', color: COLOR_SCHEME.success }}>
                            {CashierCalculationUtils.formatCurrency(dailyStats.cashAmount)}
                          </Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space>
                            <div style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: COLOR_SCHEME.primary
                            }} />
                            <Text style={{ fontSize: '12px' }}>Mpesa/Bank</Text>
                          </Space>
                          <Text strong style={{ fontSize: '13px', color: COLOR_SCHEME.primary }}>
                            {CashierCalculationUtils.formatCurrency(dailyStats.bankMpesaAmount)}
                          </Text>
                        </div>
                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ fontSize: '13px' }}>Total</Text>
                          <Text strong style={{ fontSize: '14px', color: COLOR_SCHEME.geekblue }}>
                            {CashierCalculationUtils.formatCurrency(dailyStats.totalSales)}
                          </Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              </Col>

              {/* BOTTOM 80% of left side - POS Interface */}
              <Col span={24}>
                <Card
                  title={
                    <Space>
                      <ShoppingCartOutlined />
                      <Text strong style={{ fontSize: '16px' }}>POS Interface</Text>
                    </Space>
                  }
                  extra={
                    <Badge 
                      count={products.length} 
                      showZero 
                      color={COLOR_SCHEME.primary} 
                      style={{ marginRight: 8 }} 
                    />
                  }
                  style={{ 
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    height: 'calc(80vh - 180px)',
                    minHeight: '400px'
                  }}
                  bodyStyle={{ 
                    padding: '12px',
                    height: 'calc(100% - 56px)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Product Search Bar */}
                  <div style={{ marginBottom: '12px' }}>
                    <Search
                      placeholder="Search products by name, barcode, category..."
                      prefix={<SearchOutlined />}
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        handleProductSearch(e.target.value);
                      }}
                      onSearch={handleProductSearch}
                      style={{ width: '100%', borderRadius: '4px' }}
                      allowClear
                      size="small"
                    />
                  </div>
                  
                  {/* Products List */}
                  <div style={{ 
                    flex: 1, 
                    overflowY: 'auto',
                    border: '1px solid #f0f0f0',
                    borderRadius: '4px',
                    padding: '8px'
                  }}>
                    {filteredProducts.length === 0 ? (
                      <Empty
                        description={
                          searchTerm
                            ? "No products match your search"
                            : "No products available"
                        }
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ padding: '40px 0' }}
                      />
                    ) : (
                      filteredProducts.map(product => (
                        <ProductRow 
                          key={product._id}
                          product={product} 
                          onAddToCart={addToCart}
                          disabled={posLoading.checkout}
                        />
                      ))
                    )}
                  </div>
                  
                  {/* Barcode Scanner (Always On) */}
                  <div style={{ marginTop: '12px' }}>
                    <BarcodeScannerSection />
                  </div>
                </Card>
              </Col>
            </Row>
          </Col>

          {/* RIGHT SIDE - 50% width - SHOPPING CART ONLY */}
          <Col xs={24} lg={12}>
            {/* Shopping Cart Section - Full height */}
            <Card
              title={
                <Space>
                  <ShoppingCartOutlined />
                  <Text strong style={{ fontSize: '16px' }}>Shopping Cart</Text>
                  <Badge 
                    count={cart.length} 
                    showZero 
                    color="#52c41a" 
                    style={{ marginLeft: 8 }} 
                  />
                </Space>
              }
              extra={
                cart.length > 0 && (
                  <Popconfirm
                    title="Clear Entire Cart"
                    description="This will remove all items from your cart. Continue?"
                    onConfirm={clearCart}
                    okText="Yes, Clear All"
                    cancelText="Cancel"
                    okType="danger"
                  >
                    <Button 
                      icon={<ClearOutlined />} 
                      danger 
                      size="small"
                      disabled={posLoading.checkout}
                      style={{ borderRadius: '4px' }}
                    >
                      Clear All
                    </Button>
                  </Popconfirm>
                )
              }
              style={{ 
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                height: 'calc(100vh - 180px)',
                minHeight: '500px'
              }}
              bodyStyle={{ 
                padding: '12px',
                height: 'calc(100% - 56px)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {cart.length === 0 ? (
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '40px'
                }}>
                  <ShoppingCartOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: 16 }} />
                  <Title level={3} type="secondary" style={{ marginBottom: 8 }}>
                    Your Cart is Empty
                  </Title>
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    Scan or add products to start a sale
                  </Text>
                </div>
              ) : (
                <>
                  {/* Cart Header Row - REMOVED STOCK COLUMN */}
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: '3fr 1fr 1fr 1fr 0.5fr',
                    gap: '8px',
                    padding: '12px',
                    backgroundColor: '#1890ff',
                    color: 'white',
                    marginBottom: '12px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}>
                    <div>Product</div>
                    <div style={{ textAlign: 'center' }}>Price</div>
                    <div style={{ textAlign: 'center' }}>Qty</div>
                    <div style={{ textAlign: 'center' }}>Subtotal</div>
                    <div style={{ textAlign: 'center' }}></div>
                  </div>
                  
                  {/* Cart Items - REMOVED STOCK DISPLAY */}
                  <div style={{ 
                    flex: 1, 
                    overflowY: 'auto',
                    marginBottom: '12px'
                  }}>
                    {cart.map((item, index) => (
                      <div key={item.productId} style={{ 
                        display: 'grid',
                        gridTemplateColumns: '3fr 1fr 1fr 1fr 0.5fr',
                        gap: '8px',
                        padding: '12px',
                        borderBottom: '1px solid #f0f0f0',
                        alignItems: 'center',
                        fontSize: '13px',
                        backgroundColor: index % 2 === 0 ? '#fafafa' : 'white'
                      }}>
                        {/* Product Name - Larger font for better visibility */}
                        <div>
                          <Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '2px' }}>{item.name}</Text>
                          {item.barcode && (
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              {item.barcode}
                            </Text>
                          )}
                        </div>
                        
                        {/* Price */}
                        <div style={{ textAlign: 'center' }}>
                          <Text strong style={{ color: COLOR_SCHEME.primary, fontSize: '14px' }}>
                            KES {item.price.toLocaleString()}
                          </Text>
                        </div>
                        
                        {/* Quantity with +/- buttons - Larger for better usability */}
                        <div style={{ textAlign: 'center' }}>
                          <Space.Compact size="small" style={{ display: 'flex', justifyContent: 'center' }}>
                            <Button 
                              size="small"
                              icon={<CloseOutlined style={{ fontSize: '10px' }} />}
                              onClick={() => updateCartItem(item.productId, item.quantity - 1)}
                              disabled={item.quantity <= 1 || posLoading.checkout}
                              style={{ padding: '0 8px', minWidth: '32px', height: '32px' }}
                            />
                            <InputNumber
                              size="small"
                              value={item.quantity}
                              onChange={(value) => updateCartItem(item.productId, value)}
                              min={1}
                              max={item.stock}
                              style={{ width: '60px', textAlign: 'center', height: '32px' }}
                              disabled={posLoading.checkout}
                            />
                            <Button 
                              size="small"
                              icon={<PlusOutlined style={{ fontSize: '10px' }} />}
                              onClick={() => updateCartItem(item.productId, item.quantity + 1)}
                              disabled={item.quantity >= item.stock || posLoading.checkout}
                              style={{ padding: '0 8px', minWidth: '32px', height: '32px' }}
                            />
                          </Space.Compact>
                        </div>
                        
                        {/* Subtotal */}
                        <div style={{ textAlign: 'center' }}>
                          <Text strong style={{ color: COLOR_SCHEME.success, fontSize: '14px' }}>
                            KES {(item.price * item.quantity).toLocaleString()}
                          </Text>
                        </div>
                        
                        {/* Delete Button */}
                        <div style={{ textAlign: 'center' }}>
                          <Button
                            icon={<DeleteOutlined />}
                            size="small"
                            danger
                            type="text"
                            onClick={() => removeFromCart(item.productId)}
                            disabled={posLoading.checkout}
                            style={{ padding: '0', width: '32px', height: '32px' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Cart Summary */}
                  <div style={{ 
                    padding: '16px',
                    backgroundColor: '#f0f8ff',
                    borderRadius: '4px',
                    border: '2px solid #1890ff',
                    marginBottom: '12px'
                  }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <Text strong style={{ fontSize: '14px' }}>Total Items:</Text>
                          <Text strong style={{ fontSize: '24px', color: COLOR_SCHEME.primary, marginTop: '4px' }}>
                            {totals.totalItems}
                          </Text>
                        </div>
                      </Col>
                      <Col span={12} style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <Text strong style={{ fontSize: '14px' }}>Grand Total:</Text>
                          <Title level={2} style={{ margin: 0, color: COLOR_SCHEME.success }}>
                            {CashierCalculationUtils.formatCurrency(totals.subtotal)}
                          </Title>
                        </div>
                      </Col>
                    </Row>
                  </div>
                  
                  {/* Checkout Button - Larger for better visibility */}
                  <div style={{ marginTop: '12px' }}>
                    <Button
                      type="primary"
                      size="large"
                      loading={posLoading.checkout}
                      onClick={() => handlePaymentMethodSelect('cash')}
                      disabled={
                        cart.length === 0 || 
                        posLoading.checkout ||
                        totals.subtotal <= 0
                      }
                      style={{ 
                        width: '100%', 
                        height: '60px', 
                        fontSize: '18px',
                        fontWeight: 'bold',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(24, 144, 255, 0.4)'
                      }}
                    >
                      {posLoading.checkout ? 'PROCESSING...' : `CHECKOUT - ${CashierCalculationUtils.formatCurrency(totals.subtotal)}`}
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </Col>
        </Row>

        {/* Payment Method Modal */}
        {renderPaymentModal()}

        {/* Receipt Modal */}
        <Modal
          title={
            <Space>
              <SafetyCertificateOutlined />
              <Text strong>Transaction Complete - {selectedShop?.name}</Text>
              <Tag color="green" style={{ borderRadius: '12px', fontWeight: 'bold' }}>Success</Tag>
            </Space>
          }
          open={showReceipt}
          onCancel={handleCloseReceipt}
          footer={[
            <Button 
              key="print" 
              type="primary" 
              icon={<PrinterOutlined />} 
              onClick={handlePrintReceipt}
              style={{ borderRadius: '6px' }}
            >
              Print Receipt
            </Button>,
            <Button 
              key="new" 
              type="default" 
              onClick={handleCloseReceipt}
              style={{ borderRadius: '6px' }}
            >
              New Sale
            </Button>,
          ]}
          width={800}
          style={{ top: 20, borderRadius: '8px' }}
        >
          {currentTransaction && (
            <div id="receipt-print-content">
              <ReceiptTemplate 
                transaction={currentTransaction}
                shop={selectedShop}
                companyInfo={companyInfo}
                onPrint={handlePrintReceipt}
                showPrintButton={false}
              />
            </div>
          )}
        </Modal>
      </Content>
    </Layout>
  );
};

export default CashierDashboard;