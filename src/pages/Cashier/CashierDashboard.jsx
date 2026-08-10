// src/pages/Cashier/CashierDashboard.jsx - COMPLETE UPDATED VERSION (BARCODE REMOVED)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Layout, Card, Row, Col, Statistic, Typography, Tag,
  Space, Button, Spin, Alert, Divider, Input, Modal, Form, InputNumber, Tooltip, 
  FloatButton, notification, Empty, message, Descriptions, Badge, Popconfirm,
  Dropdown, Switch, Drawer, Tabs, Grid, Avatar, List, Progress
} from 'antd';
import {
  ShopOutlined, UserOutlined, DollarOutlined,
  ShoppingCartOutlined, LogoutOutlined, ReloadOutlined,
  ArrowLeftOutlined, BarChartOutlined, TransactionOutlined,
  SearchOutlined, PlusOutlined,
  CalculatorOutlined, DeleteOutlined,
  PrinterOutlined, SafetyCertificateOutlined,
  ClearOutlined, CreditCardOutlined, PhoneOutlined,
  CalendarOutlined, BankOutlined, MoneyCollectOutlined,
  HistoryOutlined, WarningOutlined, CheckCircleOutlined,
  ClockCircleOutlined, TeamOutlined, ShoppingOutlined,
  EyeOutlined, FileTextOutlined, InfoCircleOutlined,
  RiseOutlined, FallOutlined, StockOutlined,
  CloseOutlined, ShareAltOutlined,
  MobileOutlined, TabletOutlined, DesktopOutlined,
  MenuOutlined, SettingOutlined, DownloadOutlined,
  MessageOutlined, WhatsAppOutlined, MailOutlined,
  AppstoreOutlined, LayoutOutlined, CloudDownloadOutlined,
  ExportOutlined, PictureOutlined, FilePdfOutlined,
  FileImageOutlined, FileWordOutlined, CloudSyncOutlined,
  CheckOutlined, AuditOutlined, PartitionOutlined,
  LikeOutlined, StarOutlined, FireOutlined,
  ThunderboltOutlined, RocketOutlined, TagOutlined,
  GiftOutlined, CrownOutlined, TrophyOutlined,
  CompassOutlined, GlobalOutlined, NotificationOutlined,
  SoundOutlined, VideoCameraOutlined, AudioOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI, unifiedAPI, productAPI, transactionAPI } from '../../services/api';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;
const { useBreakpoint } = Grid;

// Enhanced Calculation Utilities
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
    const totalProducts = cart.length;
    
    return {
      subtotal,
      totalItems,
      totalProducts,
      grandTotal: subtotal,
      averageItemPrice: totalItems > 0 ? subtotal / totalItems : 0
    };
  },

  calculatePaymentSplit: (transaction) => {
    const paymentMethod = transaction.paymentMethod;
    const totalAmount = CashierCalculationUtils.safeNumber(transaction.totalAmount);
    
    let cash = 0;
    let mpesa_bank = 0;
    
    if (paymentMethod === 'cash') {
      cash = totalAmount;
    } else if (paymentMethod === 'mpesa_bank') {
      mpesa_bank = totalAmount;
    } else if (paymentMethod === 'cash_mpesa_bank' && transaction.paymentSplit) {
      cash = CashierCalculationUtils.safeNumber(transaction.paymentSplit.cash);
      mpesa_bank = CashierCalculationUtils.safeNumber(transaction.paymentSplit.mpesa_bank);
    } else if (transaction.paymentSplit) {
      cash = CashierCalculationUtils.safeNumber(transaction.paymentSplit.cash);
      mpesa_bank = CashierCalculationUtils.safeNumber(transaction.paymentSplit.mpesa_bank);
    }
    
    return {
      cash,
      mpesa_bank,
      total: cash + mpesa_bank
    };
  },
};

// Default stats
const getDefaultCashierStats = () => ({
  totalSales: 0,
  totalTransactions: 0,
  totalItems: 0,
  cashAmount: 0,
  bankMpesaAmount: 0,
  cashierItemsSold: 0
});

const CashierDashboard = () => {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  
  // Core States
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
  
  // Transaction States
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [receiptImage, setReceiptImage] = useState(null);
  
  // UI States
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [cashMpesaBankSplit, setCashMpesaBankSplit] = useState({
    cashAmount: 0,
    mpesaBankAmount: 0,
    totalAmount: 0
  });
  
  // Mobile UI States
  const [mobileView, setMobileView] = useState('products');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('shopping-cart');
  
  // Device States
  const [deviceType, setDeviceType] = useState('desktop');
  const [orientation, setOrientation] = useState('portrait');
  
  // Refs
  const receiptRef = useRef(null);
  const printFrameRef = useRef(null);
  const searchInputRef = useRef(null);
  const [paymentForm] = Form.useForm();

  // ========== DEVICE DETECTION ==========
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (/android/.test(userAgent)) {
        setDeviceType('android');
      } else if (/iphone|ipad|ipod/.test(userAgent)) {
        setDeviceType('ios');
      } else if (width <= 768) {
        setDeviceType('mobile');
      } else if (width <= 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
      
      setOrientation(width > height ? 'landscape' : 'portrait');
    };
    
    detectDevice();
    window.addEventListener('resize', detectDevice);
    window.addEventListener('orientationchange', detectDevice);
    
    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  // Device configurations
  const deviceConfig = useMemo(() => ({
    isMobile: ['android', 'ios', 'mobile'].includes(deviceType),
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isLandscape: orientation === 'landscape',
    deviceType,
    cols: {
      left: ['android', 'ios', 'mobile'].includes(deviceType) ? 24 : 
            deviceType === 'tablet' ? (orientation === 'landscape' ? 12 : 24) : 16,
      right: ['android', 'ios', 'mobile'].includes(deviceType) ? 24 : 
             deviceType === 'tablet' ? (orientation === 'landscape' ? 12 : 24) : 8
    }
  }), [deviceType, orientation]);

  // Company information
  const companyInfo = useMemo(() => ({
    name: "STANZO SHOP",
    branch: "Main Branch",
    address: "Main Branch, Kianjiru",
    phone: "+254 721 473396",
    email: "shop@stanzo.com",
    slogan: "Quality Products, Best Prices",
    logo: "🏪",
    website: "shop.stanzo.co.ke",
  }), []);

  // Cart calculations
  const totals = useMemo(() => CashierCalculationUtils.calculateCartTotals(cart), [cart]);

  // ========== INITIALIZATION ==========
  useEffect(() => {
    const initializeDashboard = () => {
      const cashierData = JSON.parse(localStorage.getItem('cashierData'));
      
      if (!cashierData) {
        navigate('/cashier/login');
        return;
      }
      
      setCashier(cashierData);
      
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

  // ========== DATA FETCHING ==========
  const fetchCashierDailyStats = useCallback(async () => {
    if (!cashier?._id || !selectedShop?._id) return;

    setPosLoading(prev => ({ ...prev, stats: true }));
    
    try {
      const today = dayjs().startOf('day').toISOString();
      const now = dayjs().toISOString();

      const combinedData = await unifiedAPI.getCombinedTransactions({
        cashierId: cashier._id,
        shopId: selectedShop._id,
        startDate: today,
        endDate: now
      });

      const transactions = combinedData.transactions || [];
      const summary = combinedData.summary || {};
      const enhancedStats = combinedData.enhancedStats?.financialStats || {};

      const totalSales = enhancedStats.totalRevenue || summary.totalRevenue || 0;
      const totalTransactions = transactions.length;
      
      let cashAmount = 0;
      let bankMpesaAmount = 0;

      transactions.forEach(transaction => {
        const split = CashierCalculationUtils.calculatePaymentSplit(transaction);
        cashAmount += split.cash;
        bankMpesaAmount += split.mpesa_bank;
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

    } catch (error) {
      console.error('❌ Error fetching cashier daily stats:', error);
      setDailyStats(getDefaultCashierStats());
    } finally {
      setPosLoading(prev => ({ ...prev, stats: false }));
    }
  }, [cashier, selectedShop]);

  // Fetch products
  const fetchProducts = useCallback(async (showMessage = false) => {
    if (!selectedShop?._id) return;
    
    setPosLoading(prev => ({ ...prev, products: true }));
    
    try {
      const response = await productAPI.getAll({ 
        page: 1, 
        limit: 9999
      });
      
      const productsData = response.data || response;
      
      let shopProducts = [];
      
      if (Array.isArray(productsData)) {
        shopProducts = productsData.filter(product => {
          const productShopId = product.shop?._id || product.shop || product.shopId;
          return productShopId === selectedShop._id && product.isActive !== false;
        });
      } else if (productsData && Array.isArray(productsData.data)) {
        shopProducts = productsData.data.filter(product => {
          const productShopId = product.shop?._id || product.shop || product.shopId;
          return productShopId === selectedShop._id && product.isActive !== false;
        });
      }

      console.log('📦 Products loaded:', {
        total: shopProducts.length
      });

      setProducts(shopProducts);
      setFilteredProducts(shopProducts);

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
  }, [selectedShop]);
  
  useEffect(() => {
    if (selectedShop) {
      fetchProducts(true);
      fetchCashierDailyStats();
    }
  }, [selectedShop, fetchProducts, fetchCashierDailyStats]);

  // ========== CART FUNCTIONS ==========
  const addToCart = useCallback((product, quantity = 1) => {
    if (!product._id) {
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
      const existingItemIndex = prevCart.findIndex(item => item.productId === product._id);
      
      if (existingItemIndex >= 0) {
        const updatedCart = [...prevCart];
        const existingItem = updatedCart[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;
        
        if (newQuantity > currentStock) {
          message.warning(`Only ${currentStock} items available in stock for ${product.name}.`);
          updatedCart[existingItemIndex] = {
            ...existingItem,
            quantity: currentStock,
            subtotal: existingItem.price * currentStock
          };
        } else {
          updatedCart[existingItemIndex] = {
            ...existingItem,
            quantity: newQuantity,
            subtotal: existingItem.price * newQuantity
          };
        }
        
        const [movedItem] = updatedCart.splice(existingItemIndex, 1);
        return [movedItem, ...updatedCart];
      } else {
        const newItem = {
          productId: product._id,
          name: product.name,
          price: price,
          quantity: quantity,
          stock: currentStock,
          category: product.category,
          product,
          subtotal: price * quantity,
          addedAt: new Date().toISOString()
        };
        
        return [newItem, ...prevCart];
      }
    });

    notification.success({
      message: 'Product Added',
      description: `${quantity} x ${product.name} added to cart`,
      placement: deviceConfig.isMobile ? 'bottom' : 'topRight',
      duration: 2,
    });

    if (deviceConfig.isMobile && mobileView !== 'cart') {
      setMobileView('cart');
    }
  }, [deviceConfig.isMobile, mobileView]);

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

    setCart(prevCart => {
      return prevCart.map(item =>
        item.productId === productId
          ? { 
            ...item, 
            quantity,
            subtotal: item.price * quantity
          }
          : item
      );
    });
  }, [products]);

  const removeFromCart = useCallback((productId) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
    console.log('🗑️ Product removed from cart:', productId);
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
        console.log('🛒 Cart cleared');
      }
    });
  }, [cart.length]);

  // ========== PRODUCT SEARCH ==========
  const handleProductSearch = useCallback((value) => {
    if (!value || !value.trim()) {
      setFilteredProducts(products);
      setSearchTerm('');
      return;
    }

    const searchValue = value.trim();
    setSearchTerm(searchValue);
    
    const filtered = products.filter(product => {
      const searchLower = searchValue.toLowerCase();
      
      return (
        (product.name?.toLowerCase() || '').includes(searchLower) ||
        (product.category?.toLowerCase() || '').includes(searchLower) ||
        (product.description?.toLowerCase() || '').includes(searchLower)
      );
    });
    
    setFilteredProducts(filtered);
    
    if (filtered.length === 0 && searchValue.length >= 3) {
      message.info('No products found for your search');
    }
    
    console.log('🔍 Product search:', {
      term: searchValue,
      results: filtered.length,
      total: products.length
    });
  }, [products]);

  const handleSearchInputChange = useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim()) {
      handleProductSearch(value);
    } else {
      setFilteredProducts(products);
    }
  }, [handleProductSearch, products]);

  // ========== PAYMENT FUNCTIONS ==========
  const handleCheckout = useCallback(() => {
    if (cart.length === 0) {
      message.error('Please add items to cart before checkout.');
      return;
    }

    setSelectedPaymentMethod(null);
    setPaymentModalVisible(true);
  }, [cart.length]);

  const handlePaymentMethodSelect = useCallback((method) => {
    setSelectedPaymentMethod(method);
    
    if (method === 'cash_mpesa_bank') {
      setCashMpesaBankSplit({
        cashAmount: 0,
        mpesaBankAmount: totals.subtotal,
        totalAmount: totals.subtotal
      });
      paymentForm.setFieldsValue({
        cashAmount: 0,
        mpesaBankAmount: totals.subtotal
      });
    }
  }, [totals.subtotal, paymentForm]);

  const handleCashMpesaBankChange = useCallback((changedValues, allValues) => {
    const cashAmount = parseFloat(allValues.cashAmount || 0);
    const mpesaBankAmount = parseFloat(allValues.mpesaBankAmount || 0);
    const total = cashAmount + mpesaBankAmount;
    
    setCashMpesaBankSplit({
      cashAmount,
      mpesaBankAmount,
      totalAmount: total
    });
  }, []);

  const validateCashMpesaBankPayment = useCallback(() => {
    const { cashAmount, mpesaBankAmount, totalAmount } = cashMpesaBankSplit;
    const tolerance = 0.01;
    
    if (Math.abs(totalAmount - totals.subtotal) > tolerance) {
      message.error(`The sum of Cash and Mpesa/Bank (KES ${totalAmount.toFixed(2)}) must equal the total amount (KES ${totals.subtotal.toFixed(2)})`);
      return false;
    }
    
    if (cashAmount < 0 || mpesaBankAmount < 0) {
      message.error('Cash and Mpesa/Bank amounts cannot be negative');
      return false;
    }
    
    return true;
  }, [cashMpesaBankSplit, totals.subtotal]);

  // ========== TRANSACTION PROCESSING ==========
  const processTransaction = useCallback(async (paymentMethod, paymentDetails = {}) => {
    if (!selectedShop?._id || !cashier?._id) {
      message.error('Shop or cashier information is missing.');
      return;
    }

    setPosLoading(prev => ({ ...prev, checkout: true }));
    
    try {
      const generateTransactionNumber = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `TXN-${timestamp}-${random}`.toUpperCase();
      };

      const transactionData = {
        shop: selectedShop._id,
        shopName: selectedShop.name,
        cashierId: cashier._id,
        cashierName: cashier.name || 'Cashier',
        customerName: 'Walk-in Customer',
        transactionNumber: generateTransactionNumber(),
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.name,
          quantity: Number(item.quantity),
          price: Number(item.price),
          totalPrice: Number(item.price * item.quantity),
          costPrice: item.product?.buyingPrice || 0
        })),
        totalAmount: Number(totals.subtotal),
        paymentMethod: paymentMethod,
        status: 'completed',
        itemsCount: Number(totals.totalItems),
        saleDate: new Date().toISOString(),
        receiptNumber: `RCP-${Date.now()}`,
        cost: cart.reduce((sum, item) => {
          const costPrice = item.product?.buyingPrice || 0;
          return sum + (costPrice * item.quantity);
        }, 0)
      };

      if (paymentMethod === 'cash_mpesa_bank') {
        transactionData.cashAmount = paymentDetails.cashAmount;
        transactionData.mpesaBankAmount = paymentDetails.mpesaBankAmount;
        transactionData.paymentSplit = {
          cash: paymentDetails.cashAmount,
          mpesa_bank: paymentDetails.mpesaBankAmount
        };
      } else if (paymentMethod === 'cash') {
        transactionData.paymentSplit = {
          cash: totals.subtotal,
          mpesa_bank: 0
        };
      } else if (paymentMethod === 'mpesa_bank') {
        transactionData.paymentSplit = {
          cash: 0,
          mpesa_bank: totals.subtotal
        };
      }

      console.log('💰 Processing transaction:', {
        items: cart.length,
        total: totals.subtotal,
        paymentMethod
      });

      const response = await transactionAPI.create(transactionData);
      const transactionResult = response?.data || response;
      
      if (transactionResult && transactionResult._id) {
        setCurrentTransaction(transactionResult);
        setShowReceipt(true);
        
        await Promise.all([
          fetchCashierDailyStats(),
          fetchProducts()
        ]);
        
        notification.success({
          message: 'Transaction Completed Successfully',
          description: `Sale completed for ${selectedShop?.name}. Total: ${CashierCalculationUtils.formatCurrency(totals.subtotal)}`,
          duration: 3,
        });

        setCart([]);
        
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
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      notification.error({
        message: 'Checkout Failed',
        description: errorMessage,
        duration: 5,
      });

      await fetchProducts();
    } finally {
      setPosLoading(prev => ({ ...prev, checkout: false }));
      setPaymentModalVisible(false);
      setSelectedPaymentMethod(null);
    }
  }, [cart, selectedShop, cashier, totals, fetchCashierDailyStats, fetchProducts]);

  const processPayment = useCallback(async () => {
    if (selectedPaymentMethod === 'cash_mpesa_bank') {
      if (!validateCashMpesaBankPayment()) return;
      
      await processTransaction('cash_mpesa_bank', {
        cashAmount: cashMpesaBankSplit.cashAmount,
        mpesaBankAmount: cashMpesaBankSplit.mpesaBankAmount
      });
      
    } else {
      await processTransaction(selectedPaymentMethod);
    }
  }, [selectedPaymentMethod, validateCashMpesaBankPayment, processTransaction, cashMpesaBankSplit]);

  // ========== RECEIPT FUNCTIONS ==========
  const generateReceiptImage = useCallback(async () => {
    if (!receiptRef.current) {
      message.error('Receipt content not available');
      return null;
    }
    
    try {
      const scale = deviceConfig.isMobile ? 1.5 : 2;
      
      const canvas = await html2canvas(receiptRef.current, {
        scale: scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const clonedReceipt = clonedDoc.getElementById('receipt-content');
          if (clonedReceipt) {
            clonedReceipt.style.width = '80mm';
            clonedReceipt.style.maxWidth = '80mm';
            clonedReceipt.style.margin = '0 auto';
          }
        }
      });
      
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      setReceiptImage(dataUrl);
      
      return dataUrl;
    } catch (error) {
      console.error('❌ Error generating receipt image:', error);
      message.error('Failed to generate receipt image');
      return null;
    }
  }, [deviceConfig.isMobile]);

  const downloadReceiptAsPDF = useCallback(async () => {
    try {
      const imageData = await generateReceiptImage();
      if (!imageData) return;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 297]
      });
      
      const imgWidth = 80;
      const imgHeight = (pdf.internal.pageSize.height * imgWidth) / pdf.internal.pageSize.width;
      
      pdf.addImage(imageData, 'PNG', 0, 10, imgWidth, imgHeight);
      
      const fileName = `Receipt_${currentTransaction?.receiptNumber || dayjs().format('YYYYMMDD_HHmmss')}.pdf`;
      pdf.save(fileName);
      
      message.success('Receipt downloaded as PDF');
    } catch (error) {
      console.error('❌ Error downloading PDF:', error);
      message.error('Failed to download PDF');
    }
  }, [currentTransaction, generateReceiptImage]);

  const downloadReceiptAsImage = useCallback(async () => {
    try {
      const imageData = await generateReceiptImage();
      if (!imageData) return;
      
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `Receipt_${currentTransaction?.receiptNumber || dayjs().format('YYYYMMDD_HHmmss')}.png`;
      link.click();
      
      message.success('Receipt downloaded as image');
    } catch (error) {
      console.error('❌ Error downloading image:', error);
      message.error('Failed to download image');
    }
  }, [currentTransaction, generateReceiptImage]);

  const shareViaWhatsApp = useCallback(async () => {
    try {
      const imageData = await generateReceiptImage();
      if (!imageData) return;
      
      const response = await fetch(imageData);
      const blob = await response.blob();
      const file = new File([blob], 'receipt.png', { type: 'image/png' });
      
      const messageText = `*${companyInfo.name}*\n` +
                         `*Receipt No:* ${currentTransaction?.receiptNumber}\n` +
                         `*Date:* ${dayjs(currentTransaction?.saleDate).format('DD/MM/YYYY HH:mm')}\n` +
                         `*Total:* ${CashierCalculationUtils.formatCurrency(currentTransaction?.totalAmount)}\n` +
                         `*Payment:* ${currentTransaction?.paymentMethod?.toUpperCase()}\n` +
                         `Thank you for shopping with us! 🛒`;
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Your Receipt',
          text: messageText,
          files: [file]
        });
      } else if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
        window.open(whatsappUrl, '_blank');
      } else {
        message.info('Please save and share the receipt manually');
        downloadReceiptAsImage();
      }
    } catch (error) {
      console.error('❌ Error sharing via WhatsApp:', error);
      message.error('Failed to share via WhatsApp');
    }
  }, [currentTransaction, companyInfo, generateReceiptImage, downloadReceiptAsImage]);

  const shareViaEmail = useCallback(async () => {
    try {
      const imageData = await generateReceiptImage();
      if (!imageData) return;
      
      const subject = encodeURIComponent(`Your Receipt from ${companyInfo.name}`);
      const body = encodeURIComponent(
        `Dear Customer,\n\n` +
        `Thank you for shopping at ${companyInfo.name}!\n\n` +
        `**Receipt Details:**\n` +
        `• Receipt No: ${currentTransaction?.receiptNumber}\n` +
        `• Date: ${dayjs(currentTransaction?.saleDate).format('DD/MM/YYYY HH:mm')}\n` +
        `• Total Amount: ${CashierCalculationUtils.formatCurrency(currentTransaction?.totalAmount)}\n` +
        `• Payment Method: ${currentTransaction?.paymentMethod?.toUpperCase()}\n\n` +
        `**Items Purchased:**\n` +
        `${currentTransaction?.items?.map(item => 
          `• ${item.productName} x${item.quantity} - KES ${item.totalPrice}`
        ).join('\n')}\n\n` +
        `Visit us again!\n` +
        `${companyInfo.name}\n` +
        `${companyInfo.address}\n` +
        `Phone: ${companyInfo.phone}\n` +
        `Email: ${companyInfo.email}\n\n` +
        `_This is an automated receipt. Please keep it for your records._`
      );
      
      const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
      window.location.href = mailtoLink;
      
    } catch (error) {
      console.error('❌ Error sharing via email:', error);
      message.error('Failed to share via email');
    }
  }, [currentTransaction, companyInfo]);

  const printReceiptDirectly = useCallback(async () => {
    if (!receiptRef.current) {
      message.error('Receipt content not available');
      return;
    }
    
    try {
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'absolute';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.top = '-1000px';
      printFrame.style.left = '-1000px';
      document.body.appendChild(printFrame);
      
      const printDocument = printFrame.contentWindow.document;
      const receiptContent = receiptRef.current.innerHTML;
      
      printDocument.open();
      printDocument.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${currentTransaction?.receiptNumber}</title>
            <meta charset="UTF-8">
            <style>
              @page { size: 80mm auto; margin: 0; }
              @media print {
                body { 
                  margin: 0; 
                  padding: 0;
                  font-family: 'Courier New', monospace;
                  font-size: 12px;
                  width: 80mm;
                }
                .no-print { display: none !important; }
              }
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.3;
                margin: 0;
                padding: 5mm;
                width: 80mm;
                background: white;
              }
            </style>
          </head>
          <body>
            ${receiptContent}
            <script>
              window.onload = function() {
                setTimeout(() => {
                  window.print();
                  setTimeout(() => {
                    window.close();
                  }, 100);
                }, 250);
              };
            </script>
          </body>
        </html>
      `);
      printDocument.close();
      
      printFrameRef.current = printFrame;
      
      setTimeout(() => {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
        } catch (printError) {
          console.error('Print error:', printError);
          const printWindow = window.open('', '_blank');
          printWindow.document.write(printDocument.documentElement.innerHTML);
          printWindow.document.close();
          printWindow.focus();
          
          setTimeout(() => {
            printWindow.print();
          }, 500);
        }
      }, 500);
      
      message.success('Print dialog opened');
      
    } catch (error) {
      console.error('❌ Print error:', error);
      message.error('Failed to print receipt');
    }
  }, [currentTransaction]);

  // ========== NAVIGATION FUNCTIONS ==========
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

  // ========== DEBUG LOGS ==========
  useEffect(() => {
    console.log('🔍 Products state updated:', {
      totalProducts: products.length,
      filteredProducts: filteredProducts.length,
      searchTerm
    });
  }, [products, filteredProducts, searchTerm]);

  useEffect(() => {
    console.log('🛒 Cart state updated:', {
      cartItems: cart.length,
      cartContents: cart.map(item => ({
        name: item.name,
        quantity: item.quantity,
        productId: item.productId
      }))
    });
  }, [cart]);

  // ========== COMPONENTS ==========
  // Shopping Cart Component
  const ShoppingCartCard = useCallback(() => (
    <Card
      title={
        <Space>
          <ShoppingCartOutlined />
          <Text strong>Shopping Cart</Text>
          <Badge count={cart.length} showZero color="#52c41a" />
        </Space>
      }
      extra={
        cart.length > 0 && (
          <Popconfirm
            title="Clear Entire Cart"
            description="This will remove all items. Continue?"
            onConfirm={clearCart}
            okText="Yes, Clear"
            cancelText="Cancel"
            okType="danger"
          >
            <Button icon={<ClearOutlined />} danger size="small">
              Clear All
            </Button>
          </Popconfirm>
        )
      }
      style={{ 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      bodyStyle={{ 
        padding: '12px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {cart.length === 0 ? (
        <Empty description="Your cart is empty" style={{ margin: 'auto' }} />
      ) : (
        <>
          {/* Scrollable Cart Items Container */}
          <div style={{ 
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            marginBottom: '16px',
            paddingRight: '4px',
            maxHeight: deviceConfig.isMobile ? 'calc(100vh - 300px)' : 'calc(100vh - 350px)',
            minHeight: '200px'
          }}>
            {cart.map((item) => (
              <div key={item.productId} style={{ 
                display: 'flex',
                alignItems: 'flex-start',
                padding: '12px',
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: '#fff',
                marginBottom: '4px',
                borderRadius: '4px'
              }}>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: '14px', display: 'block' }}>
                    {item.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    KES {item.price.toLocaleString()} each
                  </Text>
                </div>
                
                <Space direction="vertical" align="end" size={4}>
                  <Space.Compact>
                    <Button
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => updateCartItem(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    />
                    <InputNumber
                      size="small"
                      value={item.quantity}
                      onChange={(value) => updateCartItem(item.productId, value)}
                      min={1}
                      max={item.stock}
                      style={{ width: '60px', textAlign: 'center' }}
                    />
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => updateCartItem(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                    />
                  </Space.Compact>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text strong style={{ color: '#52c41a' }}>
                      KES {(item.price * item.quantity).toLocaleString()}
                    </Text>
                    <Button
                      icon={<DeleteOutlined />}
                      danger
                      size="small"
                      onClick={() => removeFromCart(item.productId)}
                    />
                  </div>
                </Space>
              </div>
            ))}
          </div>
          
          {/* Fixed Cart Summary */}
          <div style={{ 
            padding: '16px',
            backgroundColor: '#f0f8ff',
            borderRadius: '8px',
            border: '2px solid #1890ff',
            flexShrink: 0
          }}>
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <div>
                  <Text type="secondary">Total Items:</Text>
                  <div style={{ fontSize: '20px', color: '#1890ff', fontWeight: 'bold' }}>
                    {totals.totalItems}
                  </div>
                </div>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <div>
                  <Text type="secondary">Grand Total:</Text>
                  <div style={{ fontSize: '22px', color: '#52c41a', fontWeight: 'bold' }}>
                    {CashierCalculationUtils.formatCurrency(totals.subtotal)}
                  </div>
                </div>
              </Col>
            </Row>
            
            <Button
              type="primary"
              size="large"
              loading={posLoading.checkout}
              onClick={handleCheckout}
              disabled={cart.length === 0}
              block
              style={{ 
                marginTop: '16px',
                height: '45px',
                fontSize: '16px',
                borderRadius: '8px',
                fontWeight: 'bold'
              }}
            >
              {posLoading.checkout ? 'PROCESSING...' : 'CHECKOUT'}
            </Button>
          </div>
        </>
      )}
    </Card>
  ), [cart, totals, posLoading.checkout, deviceConfig.isMobile, clearCart, updateCartItem, removeFromCart, handleCheckout]);

  // Payment Composition Component
  const PaymentCompositionCard = useCallback(() => {
    const cashAmount = dailyStats.cashAmount || 0;
    const digitalAmount = dailyStats.bankMpesaAmount || 0;
    const totalAmount = cashAmount + digitalAmount;
    
    const cashPercentage = totalAmount > 0 ? (cashAmount / totalAmount * 100) : 0;
    const digitalPercentage = totalAmount > 0 ? (digitalAmount / totalAmount * 100) : 0;

    return (
      <Card
        title={
          <Space>
            <CreditCardOutlined />
            <Text strong>Payment Composition</Text>
            <Tag color="blue">Daily</Tag>
          </Space>
        }
        style={{ 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginTop: deviceConfig.isMobile ? '16px' : '0',
          height: '100%'
        }}
      >
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Text strong style={{ color: '#52c41a' }}>
                  <DollarOutlined /> Cash
                </Text>
                <Text strong>{cashPercentage.toFixed(1)}%</Text>
              </div>
              <Progress 
                percent={cashPercentage} 
                strokeColor="#52c41a"
                strokeWidth={10}
                showInfo={false}
                style={{ marginBottom: '16px' }}
              />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Text strong style={{ color: '#1890ff' }}>
                  <PhoneOutlined /> M-Pesa/Bank
                </Text>
                <Text strong>{digitalPercentage.toFixed(1)}%</Text>
              </div>
              <Progress 
                percent={digitalPercentage} 
                strokeColor="#1890ff"
                strokeWidth={10}
                showInfo={false}
              />
            </div>

            <div style={{ 
              backgroundColor: '#f9f9f9', 
              padding: '16px', 
              borderRadius: '8px',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                paddingBottom: '12px',
                borderBottom: '1px solid #e8e8e8'
              }}>
                <Space>
                  <DollarOutlined style={{ color: '#52c41a' }} />
                  <Text strong>Cash:</Text>
                </Space>
                <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                  {CashierCalculationUtils.formatCurrency(cashAmount)}
                </Text>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                paddingBottom: '12px',
                borderBottom: '1px solid #e8e8e8'
              }}>
                <Space>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <PhoneOutlined style={{ color: '#1890ff' }} />
                    <BankOutlined style={{ color: '#2f54eb' }} />
                  </div>
                  <Text strong>M-Pesa/Bank:</Text>
                </Space>
                <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                  {CashierCalculationUtils.formatCurrency(digitalAmount)}
                </Text>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '2px solid #1890ff'
              }}>
                <Text strong style={{ fontSize: '16px' }}>Total:</Text>
                <Text strong style={{ fontSize: '20px', color: '#1890ff' }}>
                  {CashierCalculationUtils.formatCurrency(totalAmount)}
                </Text>
              </div>
            </div>

            {totalAmount > 0 && (
              <div style={{ 
                textAlign: 'center', 
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#e6f7ff',
                borderRadius: '6px',
                fontSize: deviceConfig.isMobile ? '12px' : '14px'
              }}>
                <Text type="secondary">
                  {cashAmount > digitalAmount ? (
                    <>Cash payments are <Text strong style={{ color: '#52c41a' }}>{(cashPercentage - digitalPercentage).toFixed(1)}% higher</Text> than digital payments today</>
                  ) : digitalAmount > cashAmount ? (
                    <>Digital payments are <Text strong style={{ color: '#1890ff' }}>{(digitalPercentage - cashPercentage).toFixed(1)}% higher</Text> than cash payments today</>
                  ) : (
                    <>Cash and digital payments are balanced today</>
                  )}
                </Text>
              </div>
            )}
          </Col>
        </Row>
      </Card>
    );
  }, [dailyStats, deviceConfig.isMobile]);

  // Mobile Navigation
  const MobileNavBar = useCallback(() => {
    if (!deviceConfig.isMobile) return null;
    
    return (
      <Footer style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        borderTop: '1px solid #f0f0f0',
        padding: '8px 16px',
        zIndex: 1000,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        height: '60px'
      }}>
        <Row justify="space-around" align="middle" style={{ height: '100%' }}>
          <Col span={6} style={{ textAlign: 'center' }}>
            <Button
              type={mobileView === 'products' ? 'primary' : 'text'}
              icon={<ShoppingOutlined />}
              onClick={() => setMobileView('products')}
              block
              style={{ 
                height: '44px',
                fontSize: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Products
            </Button>
          </Col>
          <Col span={6} style={{ textAlign: 'center' }}>
            <Button
              type={mobileView === 'cart' ? 'primary' : 'text'}
              icon={<ShoppingCartOutlined />}
              onClick={() => setMobileView('cart')}
              block
              style={{ 
                height: '44px',
                fontSize: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Cart ({cart.length})
            </Button>
          </Col>
          <Col span={6} style={{ textAlign: 'center' }}>
            <Button
              type={mobileView === 'stats' ? 'primary' : 'text'}
              icon={<BarChartOutlined />}
              onClick={() => setMobileView('stats')}
              block
              style={{ 
                height: '44px',
                fontSize: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Stats
            </Button>
          </Col>
          <Col span={6} style={{ textAlign: 'center' }}>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
              block
              style={{ 
                height: '44px',
                fontSize: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Menu
            </Button>
          </Col>
        </Row>
      </Footer>
    );
  }, [deviceConfig.isMobile, mobileView, cart.length]);

  const MobileDrawer = useCallback(() => (
    <Drawer
      title="Cashier Menu"
      placement="right"
      onClose={() => setDrawerVisible(false)}
      open={drawerVisible}
      width={280}
      bodyStyle={{ padding: '16px' }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
          icon={<UserOutlined />}
          block
          style={{ textAlign: 'left', height: '50px', fontSize: '14px' }}
          onClick={() => {
            message.info(`Logged in as: ${cashier?.name}`);
            setDrawerVisible(false);
          }}
        >
          Profile: {cashier?.name}
        </Button>
        
        <Button 
          icon={<ShopOutlined />}
          block
          style={{ textAlign: 'left', height: '50px', fontSize: '14px' }}
          onClick={() => {
            message.info(`Shop: ${selectedShop?.name}`);
            setDrawerVisible(false);
          }}
        >
          Shop: {selectedShop?.name}
        </Button>
        
        <Divider />
        
        <Button 
          icon={<ReloadOutlined />}
          onClick={() => {
            fetchCashierDailyStats();
            fetchProducts();
            setDrawerVisible(false);
            message.success('Data refreshed');
          }}
          block
          style={{ textAlign: 'left', height: '50px', fontSize: '14px' }}
        >
          Refresh Data
        </Button>
        
        <Button 
          icon={<ClearOutlined />}
          onClick={() => {
            clearCart();
            setDrawerVisible(false);
          }}
          block
          style={{ textAlign: 'left', height: '50px', fontSize: '14px' }}
          disabled={cart.length === 0}
        >
          Clear Cart
        </Button>
        
        <Divider />
        
        <Button 
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          danger
          block
          style={{ textAlign: 'left', height: '50px', fontSize: '14px' }}
        >
          Logout
        </Button>
      </Space>
    </Drawer>
  ), [drawerVisible, cashier, selectedShop, fetchCashierDailyStats, fetchProducts, clearCart, cart.length, handleLogout]);

  // Enhanced Receipt Component
  const EnhancedReceipt = useCallback(({ transaction, shop, companyInfo }) => (
    <div 
      ref={receiptRef}
      id="receipt-content"
      style={{
        width: '100%',
        maxWidth: deviceConfig.isMobile ? '100%' : '80mm',
        margin: '0 auto',
        padding: '15px',
        backgroundColor: 'white',
        border: '2px solid #e8e8e8',
        borderRadius: '8px',
        fontFamily: "'Courier New', monospace",
        fontSize: deviceConfig.isMobile ? '10px' : '12px',
        lineHeight: '1.4'
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <div style={{ 
          fontSize: deviceConfig.isMobile ? '14px' : '16px', 
          fontWeight: 'bold', 
          marginBottom: '5px',
          color: '#1890ff'
        }}>
          {companyInfo.name}
        </div>
        <div style={{ fontSize: deviceConfig.isMobile ? '10px' : '12px', marginBottom: '3px' }}>
          {companyInfo.branch}
        </div>
        <div style={{ fontSize: deviceConfig.isMobile ? '8px' : '10px', color: '#666', marginBottom: '5px' }}>
          {companyInfo.address}
        </div>
        <div style={{ fontSize: deviceConfig.isMobile ? '8px' : '10px', color: '#1890ff', marginBottom: '8px' }}>
          {companyInfo.phone}
        </div>
        <div style={{ 
          fontSize: deviceConfig.isMobile ? '9px' : '11px', 
          fontStyle: 'italic',
          marginBottom: '10px',
          color: '#52c41a'
        }}>
          {companyInfo.slogan}
        </div>
      </div>

      <Divider style={{ margin: '10px 0', borderColor: '#1890ff' }} />

      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontWeight: 'bold' }}>Receipt No:</span>
          <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{transaction?.receiptNumber}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Date:</span>
          <span>{dayjs(transaction?.saleDate).format('DD/MM/YYYY, HH:mm:ss')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Cashier:</span>
          <span style={{ fontWeight: 'bold' }}>{transaction?.cashierName || 'Cashier'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Customer:</span>
          <span>{transaction?.customerName || 'Walk-in Customer'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Payment:</span>
          <span style={{ 
            fontWeight: 'bold',
            color: transaction?.paymentMethod === 'cash' ? '#52c41a' : 
                  transaction?.paymentMethod === 'mpesa_bank' ? '#1890ff' : 
                  '#722ed1'
          }}>
            {transaction?.paymentMethod?.toUpperCase().replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <Divider style={{ margin: '10px 0', borderColor: '#1890ff' }} />

      <div style={{ marginBottom: '15px' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          marginBottom: '10px',
          fontSize: deviceConfig.isMobile ? '9px' : '11px'
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #1890ff' }}>
              <th style={{ textAlign: 'left', padding: '5px 0', fontWeight: 'bold' }}>ITEM</th>
              <th style={{ textAlign: 'center', padding: '5px 0', fontWeight: 'bold' }}>QTY</th>
              <th style={{ textAlign: 'right', padding: '5px 0', fontWeight: 'bold' }}>PRICE</th>
              <th style={{ textAlign: 'right', padding: '5px 0', fontWeight: 'bold' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {transaction?.items?.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px dashed #e8e8e8' }}>
                <td style={{ padding: '6px 0' }}>
                  <div style={{ fontWeight: 'bold' }}>{item.productName}</div>
                </td>
                <td style={{ textAlign: 'center', padding: '6px 0' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', padding: '6px 0' }}>KES {item.price?.toLocaleString()}</td>
                <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 'bold' }}>
                  KES {item.totalPrice?.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Divider style={{ margin: '10px 0', borderColor: '#1890ff' }} />

      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: deviceConfig.isMobile ? '11px' : '13px' }}>TOTAL AMOUNT:</span>
          <span style={{ fontSize: deviceConfig.isMobile ? '14px' : '16px', fontWeight: 'bold', color: '#52c41a' }}>
            KES {transaction?.totalAmount?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </span>
        </div>
        
        {transaction?.paymentSplit && (
          <div style={{ fontSize: deviceConfig.isMobile ? '9px' : '11px', color: '#666', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cash:</span>
              <span>KES {transaction.paymentSplit.cash?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>M-Pesa/Bank:</span>
              <span>KES {transaction.paymentSplit.mpesa_bank?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ 
        textAlign: 'center', 
        margin: '15px 0',
        padding: '8px',
        backgroundColor: '#f6ffed',
        borderRadius: '4px',
        fontSize: deviceConfig.isMobile ? '9px' : '11px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>
          {transaction?.items?.length || 0} Items • {transaction?.itemsCount || 0} Units
        </div>
        <div style={{ color: '#52c41a' }}>
          Quality Guaranteed ✓
        </div>
      </div>

      <div style={{ 
        textAlign: 'center', 
        marginTop: '20px',
        paddingTop: '10px',
        borderTop: '1px dashed #e8e8e8',
        fontSize: deviceConfig.isMobile ? '8px' : '10px'
      }}>
        <div style={{ marginBottom: '5px', color: '#666' }}>
          Customer Service: {companyInfo.phone}
        </div>
        <div style={{ marginBottom: '5px', color: '#999' }}>
          {companyInfo.email}
        </div>
        <div style={{ color: '#999', fontStyle: 'italic' }}>
          Thank you for shopping with us!
        </div>
      </div>
    </div>
  ), [deviceConfig.isMobile]);

  // Share Modal
  const ShareReceiptModal = useCallback(() => (
    <Modal
      title="Share Receipt"
      open={shareModalVisible}
      onCancel={() => setShareModalVisible(false)}
      footer={null}
      width={deviceConfig.isMobile ? '90%' : 400}
      centered
      style={{ borderRadius: '12px' }}
      bodyStyle={{ padding: '20px' }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Alert
          message="Share Options"
          description="Choose how to share the receipt with your customer"
          type="info"
          showIcon
          style={{ marginBottom: '20px', borderRadius: '8px' }}
        />
        
        <Button
          type="primary"
          icon={<WhatsAppOutlined />}
          onClick={shareViaWhatsApp}
          block
          size="large"
          style={{ 
            height: '50px',
            backgroundColor: '#25D366',
            borderColor: '#25D366',
            borderRadius: '8px',
            marginBottom: '8px',
            fontSize: '14px'
          }}
        >
          Share via WhatsApp
        </Button>
        
        <Button
          icon={<MailOutlined />}
          onClick={shareViaEmail}
          block
          size="large"
          style={{ 
            height: '50px',
            borderRadius: '8px',
            marginBottom: '8px',
            fontSize: '14px'
          }}
        >
          Send via Email
        </Button>
        
        <Button
          icon={<FilePdfOutlined />}
          onClick={downloadReceiptAsPDF}
          block
          size="large"
          style={{ 
            height: '50px',
            borderRadius: '8px',
            marginBottom: '8px',
            fontSize: '14px'
          }}
        >
          Download as PDF
        </Button>
        
        <Button
          icon={<FileImageOutlined />}
          onClick={downloadReceiptAsImage}
          block
          size="large"
          style={{ 
            height: '50px',
            borderRadius: '8px',
            marginBottom: '8px',
            fontSize: '14px'
          }}
        >
          Download as Image
        </Button>
        
        <Button
          icon={<PrinterOutlined />}
          onClick={printReceiptDirectly}
          block
          size="large"
          style={{ 
            height: '50px',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        >
          Print Receipt
        </Button>
      </Space>
      
      <Divider style={{ margin: '20px 0' }} />
      
      <div style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
        <InfoCircleOutlined style={{ marginRight: '5px' }} />
        The receipt will include all transaction details and can be saved or shared
      </div>
    </Modal>
  ), [shareModalVisible, deviceConfig.isMobile, shareViaWhatsApp, shareViaEmail, downloadReceiptAsPDF, downloadReceiptAsImage, printReceiptDirectly]);

  // Payment Modal
  const renderPaymentModal = useCallback(() => {
    const modalTitle = `Select Payment Method - ${CashierCalculationUtils.formatCurrency(totals.subtotal)}`;

    return (
      <Modal
        title={modalTitle}
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          setSelectedPaymentMethod(null);
        }}
        footer={null}
        width={deviceConfig.isMobile ? '95%' : 500}
        style={{ borderRadius: '8px' }}
        closable={!posLoading.checkout}
        bodyStyle={{ padding: '20px' }}
      >
        {!selectedPaymentMethod ? (
          <div style={{ textAlign: 'center' }}>
            <Alert
              message="Choose Payment Method"
              description={`Total Amount: ${CashierCalculationUtils.formatCurrency(totals.subtotal)}`}
              type="info"
              showIcon
              style={{ marginBottom: '20px', borderRadius: '6px' }}
            />
            
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card 
                  hoverable 
                  onClick={() => handlePaymentMethodSelect('cash')}
                  style={{ 
                    textAlign: 'center', 
                    borderRadius: '8px',
                    height: deviceConfig.isMobile ? '100px' : '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    border: '2px solid #f0f0f0'
                  }}
                  bodyStyle={{ padding: '10px' }}
                >
                  <DollarOutlined style={{ fontSize: deviceConfig.isMobile ? '24px' : '32px', color: '#52c41a', marginBottom: '8px' }} />
                  <Text strong style={{ color: '#52c41a', fontSize: deviceConfig.isMobile ? '12px' : '14px' }}>Cash</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card 
                  hoverable 
                  onClick={() => handlePaymentMethodSelect('mpesa_bank')}
                  style={{ 
                    textAlign: 'center', 
                    borderRadius: '8px',
                    height: deviceConfig.isMobile ? '100px' : '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    border: '2px solid #f0f0f0'
                  }}
                  bodyStyle={{ padding: '10px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                    <PhoneOutlined style={{ fontSize: deviceConfig.isMobile ? '18px' : '24px', color: '#1890ff' }} />
                    <BankOutlined style={{ fontSize: deviceConfig.isMobile ? '18px' : '24px', color: '#2f54eb' }} />
                  </div>
                  <Text strong style={{ color: '#1890ff', fontSize: deviceConfig.isMobile ? '12px' : '14px' }}>Mpesa/Bank</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card 
                  hoverable 
                  onClick={() => handlePaymentMethodSelect('cash_mpesa_bank')}
                  style={{ 
                    textAlign: 'center', 
                    borderRadius: '8px',
                    height: deviceConfig.isMobile ? '100px' : '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    border: '2px solid #f0f0f0'
                  }}
                  bodyStyle={{ padding: '10px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}>
                    <DollarOutlined style={{ fontSize: deviceConfig.isMobile ? '16px' : '20px', color: '#52c41a' }} />
                    <Text style={{ color: '#722ed1' }}>+</Text>
                    <PhoneOutlined style={{ fontSize: deviceConfig.isMobile ? '16px' : '20px', color: '#1890ff' }} />
                  </div>
                  <Text strong style={{ color: '#722ed1', fontSize: deviceConfig.isMobile ? '12px' : '14px' }}>Split Payment</Text>
                </Card>
              </Col>
            </Row>
          </div>
        ) : (
          <div style={{ padding: '10px 0' }}>
            {selectedPaymentMethod === 'cash_mpesa_bank' ? (
              <Form
                form={paymentForm}
                layout="vertical"
                onValuesChange={handleCashMpesaBankChange}
                initialValues={{
                  cashAmount: 0,
                  mpesaBankAmount: totals.subtotal
                }}
              >
                <Alert
                  message="Split Payment (Cash + Mpesa/Bank)"
                  description={`Enter amounts for each payment method. Total must equal ${CashierCalculationUtils.formatCurrency(totals.subtotal)}`}
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px', borderRadius: '6px' }}
                />
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Cash Amount (KES)"
                      name="cashAmount"
                      rules={[
                        { required: true, message: 'Please enter cash amount' },
                        { type: 'number', min: 0, message: 'Cash amount cannot be negative' }
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
                        size={deviceConfig.isMobile ? 'middle' : 'large'}
                        autoFocus
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Mpesa/Bank Amount (KES)"
                      name="mpesaBankAmount"
                      rules={[
                        { required: true, message: 'Please enter Mpesa/Bank amount' },
                        { type: 'number', min: 0, message: 'Mpesa/Bank amount cannot be negative' }
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
                        size={deviceConfig.isMobile ? 'middle' : 'large'}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Descriptions size="small" bordered column={1} style={{ marginBottom: '16px', borderRadius: '6px' }}>
                  <Descriptions.Item label="Cash Amount">
                    <Text strong style={{ color: '#52c41a' }}>
                      {CashierCalculationUtils.formatCurrency(cashMpesaBankSplit.cashAmount)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Mpesa/Bank Amount">
                    <Text strong style={{ color: '#1890ff' }}>
                      {CashierCalculationUtils.formatCurrency(cashMpesaBankSplit.mpesaBankAmount)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Entered">
                    <Text strong style={{ color: '#722ed1' }}>
                      {CashierCalculationUtils.formatCurrency(cashMpesaBankSplit.totalAmount)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Required Total">
                    <Text strong style={{ color: '#2f54eb' }}>
                      {CashierCalculationUtils.formatCurrency(totals.subtotal)}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
                
                <div style={{ textAlign: 'center' }}>
                  <Space>
                    <Button 
                      onClick={() => setSelectedPaymentMethod(null)}
                      disabled={posLoading.checkout}
                      size={deviceConfig.isMobile ? 'middle' : 'large'}
                    >
                      Back
                    </Button>
                    <Button 
                      type="primary" 
                      loading={posLoading.checkout}
                      onClick={processPayment}
                      disabled={Math.abs(cashMpesaBankSplit.totalAmount - totals.subtotal) > 0.01}
                      style={{ minWidth: deviceConfig.isMobile ? '140px' : '180px' }}
                      size={deviceConfig.isMobile ? 'middle' : 'large'}
                    >
                      {posLoading.checkout ? 'Processing...' : 'Complete Payment'}
                    </Button>
                  </Space>
                </div>
              </Form>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Alert
                  message={`Confirm ${selectedPaymentMethod === 'mpesa_bank' ? 'MPESA/BANK' : 'CASH'} Payment`}
                  description={
                    <div>
                      <div style={{ fontSize: deviceConfig.isMobile ? '20px' : '24px', fontWeight: 'bold', margin: '16px 0', color: '#52c41a' }}>
                        {CashierCalculationUtils.formatCurrency(totals.subtotal)}
                      </div>
                      <div style={{ color: '#666', marginBottom: '8px', fontSize: deviceConfig.isMobile ? '13px' : '14px' }}>
                        {selectedPaymentMethod === 'mpesa_bank' 
                          ? 'Please confirm the M-Pesa or Bank payment.' 
                          : 'Please confirm the cash payment.'}
                      </div>
                    </div>
                  }
                  type="info"
                  showIcon
                  icon={
                    selectedPaymentMethod === 'mpesa_bank' ? 
                    <PhoneOutlined style={{ color: '#1890ff' }} /> : 
                    <DollarOutlined style={{ color: '#52c41a' }} />
                  }
                  style={{ borderRadius: '6px' }}
                />
                <div style={{ marginTop: '32px' }}>
                  <Space>
                    <Button 
                      onClick={() => setSelectedPaymentMethod(null)}
                      disabled={posLoading.checkout}
                      size={deviceConfig.isMobile ? 'middle' : 'large'}
                    >
                      Back
                    </Button>
                    <Button 
                      type="primary" 
                      loading={posLoading.checkout}
                      onClick={processPayment}
                      style={{ 
                        minWidth: deviceConfig.isMobile ? '140px' : '180px', 
                        height: deviceConfig.isMobile ? '40px' : '48px', 
                        fontSize: deviceConfig.isMobile ? '14px' : '16px' 
                      }}
                      size={deviceConfig.isMobile ? 'middle' : 'large'}
                    >
                      {posLoading.checkout ? 'Processing...' : 'Confirm Payment'}
                    </Button>
                  </Space>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    );
  }, [paymentModalVisible, totals, selectedPaymentMethod, posLoading.checkout, cashMpesaBankSplit, deviceConfig, handlePaymentMethodSelect, handleCashMpesaBankChange, processPayment, paymentForm]);

  // ========== RENDER ==========
  if (dashboardLoading || !selectedShop) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        backgroundColor: '#f0f2f5'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">
            {!selectedShop ? 'No shop selected' : 'Loading cashier dashboard...'}
          </Text>
        </div>
      </div>
    );
  }

  const renderProductsGrid = (isMobile = false) => {
    const colSpan = isMobile ? 12 : { xs: 24, sm: 12, md: 8, lg: 6, xl: 4 };
    
    return (
      <Row gutter={[4, 4]}>
        {filteredProducts.map(product => (
          <Col {...(isMobile ? { span: 12 } : colSpan)} key={product._id}>
            <Card
              hoverable
              style={{ 
                marginBottom: '4px',
                borderRadius: '6px',
                height: isMobile ? '150px' : '160px',
                display: 'flex',
                flexDirection: 'column',
                border: product.currentStock <= (product.minimumStock || 0) ? '1px solid #ff4d4f' : '1px solid #f0f0f0',
                cursor: 'pointer'
              }}
              bodyStyle={{ 
                padding: '8px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={() => addToCart(product, 1)}
            >
              <div style={{ flex: 1 }}>
                <Text 
                  strong 
                  ellipsis={{ rows: 2 }}
                  style={{ 
                    fontSize: isMobile ? '10px' : '11px',
                    lineHeight: '1.2',
                    marginBottom: '2px',
                    color: product.currentStock <= (product.minimumStock || 0) ? '#ff4d4f' : 'inherit'
                  }}
                >
                  {product.name}
                </Text>
                <Text type="secondary" style={{ fontSize: isMobile ? '9px' : '9px', display: 'block' }}>
                  {product.category}
                </Text>
              </div>
              
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '6px'
                }}>
                  <Text strong style={{ color: '#1890ff', fontSize: isMobile ? '12px' : '12px' }}>
                    KES {product.minSellingPrice?.toLocaleString()}
                  </Text>
                  <Tooltip 
                    title={`Min Stock: ${product.minimumStock || 'N/A'}`} 
                    placement="top"
                  >
                    <Tag 
                      color={
                        product.currentStock <= 0 ? 'red' :
                        product.currentStock <= (product.minimumStock || 0) ? 'orange' : 'green'
                      }
                      style={{ fontSize: '8px', padding: '0 4px', margin: 0 }}
                    >
                      {product.currentStock}
                    </Tag>
                  </Tooltip>
                </div>
                
                <Button
                  type="primary"
                  size="small"
                  block
                  icon={<PlusOutlined />}
                  disabled={product.currentStock <= 0}
                  style={{ 
                    borderRadius: '4px',
                    fontSize: isMobile ? '10px' : '10px',
                    height: '24px',
                    padding: '0 4px'
                  }}
                >
                  {isMobile ? 'Add' : 'Add'}
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <Layout style={{ 
      minHeight: '100vh',
      backgroundColor: '#f0f2f5'
    }}>
      {/* Header */}
      <Header style={{ 
        background: 'linear-gradient(135deg, #1a365d 0%, #2d3748 100%)',
        padding: deviceConfig.isMobile ? '0 8px' : '0 16px',
        height: deviceConfig.isMobile ? '56px' : '64px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <Row justify="space-between" align="middle" style={{ height: '100%' }}>
          <Col>
            <Space>
              {deviceConfig.isMobile ? (
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={handleBackToShops}
                  type="text"
                  style={{ color: 'white', padding: '4px' }}
                />
              ) : (
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={handleBackToShops}
                  type="text"
                  style={{ color: 'white' }}
                >
                  Change Shop
                </Button>
              )}
              <Title 
                level={deviceConfig.isMobile ? 5 : 4} 
                style={{ margin: 0, color: 'white' }}
              >
                <ShopOutlined style={{ marginRight: '8px' }} /> 
                {selectedShop?.name}
              </Title>
            </Space>
          </Col>
          
          <Col>
            <Space>
              {!deviceConfig.isMobile && (
                <>
                  <Tag color="#1890ff" style={{ borderRadius: '12px', padding: '4px 8px' }}>
                    <UserOutlined /> {cashier?.name}
                  </Tag>
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      fetchCashierDailyStats();
                      fetchProducts();
                    }}
                    loading={posLoading.stats}
                    size="small"
                    style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                  >
                    Refresh
                  </Button>
                </>
              )}
              {!deviceConfig.isMobile && (
                <Button 
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                  danger
                  size="small"
                  style={{ borderRadius: '6px' }}
                >
                  Logout
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Header>

      <Content style={{ 
        padding: deviceConfig.isMobile ? '8px' : '16px',
        marginBottom: deviceConfig.isMobile ? '60px' : '0',
        minHeight: deviceConfig.isMobile ? 'calc(100vh - 116px)' : 'calc(100vh - 64px)'
      }}>
        {/* Mobile Navigation */}
        {deviceConfig.isMobile && <MobileNavBar />}
        {deviceConfig.isMobile && <MobileDrawer />}

        {/* Desktop/Tablet Layout */}
        {!deviceConfig.isMobile ? (
          <Row gutter={[16, 16]}>
            {/* Left Column - Products */}
            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space>
                    <ShoppingOutlined />
                    <Text strong>Products</Text>
                    <Badge 
                      count={products.length} 
                      showZero 
                      color="#1890ff" 
                      style={{ marginLeft: 8 }} 
                    />
                  </Space>
                }
                style={{ 
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  height: 'calc(100vh - 180px)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                bodyStyle={{ 
                  padding: '12px',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                {/* Search Bar */}
                <div style={{ marginBottom: '12px', flexShrink: 0 }}>
                  <Search
                    ref={searchInputRef}
                    placeholder="Search products by name or category..."
                    size="large"
                    style={{ width: '100%', borderRadius: '8px' }}
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    onSearch={(value) => {
                      if (value.trim()) {
                        handleProductSearch(value);
                      } else {
                        setFilteredProducts(products);
                      }
                    }}
                    allowClear
                  />
                </div>
                
                {/* Products Grid - Scrollable */}
                <div style={{ 
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '4px'
                }}>
                  {filteredProducts.length === 0 ? (
                    <Empty
                      description="No products found"
                      style={{ padding: '40px 0' }}
                    />
                  ) : (
                    renderProductsGrid(false)
                  )}
                </div>
              </Card>
            </Col>

            {/* Right Column - Cart & Payment Composition */}
            <Col xs={24} lg={8}>
              <div style={{ 
                height: 'calc(100vh - 180px)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Tab Navigation */}
                <div style={{ 
                  display: 'flex', 
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: '#fafafa',
                  borderRadius: '8px 8px 0 0',
                  flexShrink: 0
                }}>
                  <Button
                    type={activeTab === 'shopping-cart' ? 'primary' : 'text'}
                    icon={<ShoppingCartOutlined />}
                    onClick={() => setActiveTab('shopping-cart')}
                    style={{
                      flex: 1,
                      borderRadius: 0,
                      border: 'none',
                      height: '50px',
                      fontSize: '14px',
                      fontWeight: activeTab === 'shopping-cart' ? 'bold' : 'normal'
                    }}
                  >
                    Cart ({cart.length})
                  </Button>
                  <Button
                    type={activeTab === 'payment-composition' ? 'primary' : 'text'}
                    icon={<CreditCardOutlined />}
                    onClick={() => setActiveTab('payment-composition')}
                    style={{
                      flex: 1,
                      borderRadius: 0,
                      border: 'none',
                      height: '50px',
                      fontSize: '14px',
                      fontWeight: activeTab === 'payment-composition' ? 'bold' : 'normal'
                    }}
                  >
                    Payments
                  </Button>
                </div>
                
                {/* Tab Content - Scrollable */}
                <div style={{ 
                  flex: 1,
                  overflow: 'hidden',
                  backgroundColor: '#fff',
                  borderRadius: '0 0 8px 8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {activeTab === 'shopping-cart' ? (
                    <ShoppingCartCard />
                  ) : (
                    <div style={{ 
                      height: '100%',
                      padding: '12px',
                      overflowY: 'auto'
                    }}>
                      <PaymentCompositionCard />
                    </div>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        ) : (
          /* Mobile Layout */
          <div style={{ 
            height: 'calc(100vh - 116px)',
            overflow: 'hidden'
          }}>
            {mobileView === 'products' && (
              <div style={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Search Bar */}
                <div style={{ padding: '0 8px 8px 8px', flexShrink: 0 }}>
                  <Search
                    ref={searchInputRef}
                    placeholder="Search products..."
                    size="large"
                    style={{ width: '100%', borderRadius: '8px' }}
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    onSearch={(value) => {
                      if (value.trim()) {
                        handleProductSearch(value);
                      } else {
                        setFilteredProducts(products);
                      }
                    }}
                    allowClear
                  />
                </div>
                
                {/* Products List - Scrollable */}
                <div style={{ 
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '8px'
                }}>
                  {filteredProducts.length === 0 ? (
                    <Empty
                      description="No products found"
                      style={{ padding: '40px 0' }}
                    />
                  ) : (
                    renderProductsGrid(true)
                  )}
                </div>
              </div>
            )}
            
            {mobileView === 'cart' && (
              <div style={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Tab Navigation for Mobile */}
                <div style={{ 
                  display: 'flex', 
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: '#fafafa',
                  flexShrink: 0
                }}>
                  <Button
                    type={activeTab === 'shopping-cart' ? 'primary' : 'text'}
                    icon={<ShoppingCartOutlined />}
                    onClick={() => setActiveTab('shopping-cart')}
                    style={{
                      flex: 1,
                      borderRadius: 0,
                      border: 'none',
                      height: '50px',
                      fontSize: '12px'
                    }}
                  >
                    Cart ({cart.length})
                  </Button>
                  <Button
                    type={activeTab === 'payment-composition' ? 'primary' : 'text'}
                    icon={<CreditCardOutlined />}
                    onClick={() => setActiveTab('payment-composition')}
                    style={{
                      flex: 1,
                      borderRadius: 0,
                      border: 'none',
                      height: '50px',
                      fontSize: '12px'
                    }}
                  >
                    Payments
                  </Button>
                </div>
                
                {/* Tab Content */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {activeTab === 'shopping-cart' ? (
                    <div style={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: '#fff'
                    }}>
                      {/* Cart Items - Scrollable */}
                      <div style={{ 
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '8px'
                      }}>
                        {cart.length === 0 ? (
                          <Empty
                            description="Your cart is empty"
                            style={{ padding: '60px 0' }}
                          />
                        ) : (
                          cart.map((item) => (
                            <Card
                              key={item.productId}
                              style={{ 
                                marginBottom: '8px',
                                borderRadius: '8px'
                              }}
                              bodyStyle={{ padding: '12px' }}
                            >
                              <Row gutter={8} align="middle">
                                <Col span={16}>
                                  <Text strong style={{ fontSize: '14px', display: 'block' }}>
                                    {item.name}
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    KES {item.price.toLocaleString()} each
                                  </Text>
                                </Col>
                                <Col span={8}>
                                  <Space.Compact block>
                                    <Button
                                      size="small"
                                      icon={<CloseOutlined />}
                                      onClick={() => updateCartItem(item.productId, item.quantity - 1)}
                                      disabled={item.quantity <= 1}
                                      style={{ width: '32px' }}
                                    />
                                    <InputNumber
                                      size="small"
                                      value={item.quantity}
                                      onChange={(value) => updateCartItem(item.productId, value)}
                                      min={1}
                                      max={item.stock}
                                      style={{ width: '60px', textAlign: 'center' }}
                                    />
                                    <Button
                                      size="small"
                                      icon={<PlusOutlined />}
                                      onClick={() => updateCartItem(item.productId, item.quantity + 1)}
                                      disabled={item.quantity >= item.stock}
                                      style={{ width: '32px' }}
                                    />
                                  </Space.Compact>
                                </Col>
                              </Row>
                              
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '8px'
                              }}>
                                <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
                                  KES {(item.price * item.quantity).toLocaleString()}
                                </Text>
                                <Button
                                  icon={<DeleteOutlined />}
                                  danger
                                  size="small"
                                  onClick={() => removeFromCart(item.productId)}
                                />
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                      
                      {/* Cart Summary - Fixed at bottom */}
                      {cart.length > 0 && (
                        <div style={{ 
                          padding: '16px',
                          backgroundColor: '#f0f8ff',
                          borderTop: '2px solid #1890ff',
                          flexShrink: 0
                        }}>
                          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                            <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                              Total Items: {totals.totalItems}
                            </Text>
                            <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                              {CashierCalculationUtils.formatCurrency(totals.subtotal)}
                            </Title>
                          </div>
                          
                          <Button
                            type="primary"
                            size="large"
                            block
                            loading={posLoading.checkout}
                            onClick={handleCheckout}
                            disabled={cart.length === 0}
                            style={{ 
                              height: '50px',
                              fontSize: '16px',
                              borderRadius: '8px',
                              fontWeight: 'bold'
                            }}
                          >
                            {posLoading.checkout ? 'PROCESSING...' : 'CHECKOUT'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ 
                      height: '100%',
                      overflowY: 'auto',
                      padding: '16px'
                    }}>
                      <PaymentCompositionCard />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {mobileView === 'stats' && (
              <div style={{ 
                height: '100%', 
                overflowY: 'auto', 
                padding: '16px' 
              }}>
                <Card
                  title="Today's Performance"
                  style={{ borderRadius: '8px', marginBottom: '16px' }}
                >
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Statistic
                        title="Total Sales"
                        value={dailyStats.totalSales}
                        prefix="KES"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Transactions"
                        value={dailyStats.totalTransactions}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Items Sold"
                        value={dailyStats.cashierItemsSold}
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Avg. Sale"
                        value={dailyStats.totalTransactions > 0 ? dailyStats.totalSales / dailyStats.totalTransactions : 0}
                        prefix="KES"
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Col>
                  </Row>
                </Card>

                <PaymentCompositionCard />
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {renderPaymentModal()}
        
        {/* Receipt Modal */}
        <Modal
          title={
            <Space>
              <SafetyCertificateOutlined />
              <Text strong>Transaction Complete</Text>
              <Tag color="green">Success</Tag>
            </Space>
          }
          open={showReceipt}
          onCancel={handleCloseReceipt}
          footer={[
            <Button 
              key="share" 
              icon={<ShareAltOutlined />}
              onClick={() => setShareModalVisible(true)}
              style={{ borderRadius: '6px' }}
            >
              Share
            </Button>,
            <Button 
              key="print" 
              type="primary" 
              icon={<PrinterOutlined />} 
              onClick={printReceiptDirectly}
              style={{ borderRadius: '6px' }}
            >
              Print
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
          width={deviceConfig.isMobile ? '95%' : 600}
          style={{ borderRadius: '12px' }}
          bodyStyle={{ padding: '20px', maxHeight: deviceConfig.isMobile ? '70vh' : '80vh', overflowY: 'auto' }}
        >
          {currentTransaction && (
            <>
              <EnhancedReceipt 
                transaction={currentTransaction}
                shop={selectedShop}
                companyInfo={companyInfo}
              />
              
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <Alert
                  message="Receipt Generated Successfully"
                  description="You can print, share, or download this receipt"
                  type="success"
                  showIcon
                  style={{ borderRadius: '8px' }}
                />
              </div>
            </>
          )}
        </Modal>

        <ShareReceiptModal />
      </Content>
    </Layout>
  );
};

export default CashierDashboard;