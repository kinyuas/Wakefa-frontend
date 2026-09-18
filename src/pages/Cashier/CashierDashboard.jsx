// src/pages/Cashier/CashierDashboard.jsx
// Orchestrator: session, device detection, cart state, checkout, navigation, modals.
// Desktop layout: 75% products | 25% tabbed panel (Cart | Overview).
// Mobile layout: tabs at the bottom (Products | Cart | Overview).
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Layout, Row, Col, Button, Space, Tag, Typography, Modal, Form,
  notification, message, Grid, Avatar, Tabs, FloatButton
} from 'antd';
import {
  ShopOutlined, UserOutlined, LogoutOutlined, ReloadOutlined,
  ArrowLeftOutlined, ShoppingCartOutlined, SettingOutlined,
  HomeOutlined, BarChartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import {
  authAPI,
  unifiedAPI,
  transactionAPI,
  productAPI
} from '../../services/api';

import CashierPOS from './CashierPOS';
import CashierStats from './CashierStats';
import CashierReceipt from './CashierReceipt';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// ============================================================
// SHARED UTILITIES
// ============================================================
export const CashierUtils = {
  safeNumber: (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  },

  formatCurrency: (amount) => {
    const value = CashierUtils.safeNumber(amount);
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
      totalProducts: cart.length,
      grandTotal: subtotal,
      averageItemPrice: totalItems > 0 ? subtotal / totalItems : 0
    };
  },

  calculatePaymentSplit: (transaction) => {
    if (!transaction) return { cash: 0, mpesa_bank: 0, total: 0 };
    const method = transaction.paymentMethod || 'cash';
    const total = CashierUtils.safeNumber(transaction.totalAmount);

    let cash = 0, mpesa_bank = 0;
    if (method === 'cash') cash = total;
    else if (method === 'mpesa_bank') mpesa_bank = total;
    else if (transaction.paymentSplit) {
      cash = CashierUtils.safeNumber(transaction.paymentSplit.cash);
      mpesa_bank = CashierUtils.safeNumber(transaction.paymentSplit.mpesa_bank);
    } else if (method === 'cash_mpesa_bank') {
      cash = CashierUtils.safeNumber(transaction.cashAmount);
      mpesa_bank = CashierUtils.safeNumber(transaction.mpesaBankAmount || transaction.bankMpesaAmount);
    }
    return { cash, mpesa_bank, total: cash + mpesa_bank };
  },

  getDefaultStats: () => ({
    totalSales: 0,
    totalTransactions: 0,
    totalItems: 0,
    cashAmount: 0,
    bankMpesaAmount: 0,
    cashierItemsSold: 0
  }),

  resolveProductName: (item, products = []) => {
    if (!item) return 'Unknown Item';
    if (item.productName) return item.productName;
    if (item.name) return item.name;
    const pid = item.productId?._id || item.productId;
    if (pid) {
      const p = products.find(x => x._id === pid || x._id?.toString() === pid?.toString());
      if (p?.name) return p.name;
    }
    return 'Unknown Item';
  }
};

export const { formatCurrency, safeNumber } = CashierUtils;

// ============================================================
// MAIN COMPONENT
// ============================================================
const CashierDashboard = () => {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;

  // ---- Session ----
  const [cashier, setCashier] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // ---- Data ----
  const [products, setProducts] = useState([]);
  const [dailyStats, setDailyStats] = useState(CashierUtils.getDefaultStats());
  const [todayTransactions, setTodayTransactions] = useState([]);

  // ---- Cart ----
  const [cart, setCart] = useState([]);
  const totals = useMemo(() => CashierUtils.calculateCartTotals(cart), [cart]);

  // ---- Load states ----
  const [loading, setLoading] = useState({
    products: false,
    stats: false,
    checkout: false
  });

  // ---- Payment flow ----
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [cashMpesaBankSplit, setCashMpesaBankSplit] = useState({
    cashAmount: 0, mpesaBankAmount: 0, totalAmount: 0
  });
  const [paymentForm] = Form.useForm();

  // ---- Receipt ----
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const receiptRef = useRef(null);

  // ---- Right column tab (desktop) ----
  const [rightTab, setRightTab] = useState('cart');       // 'cart' | 'overview'
  // ---- Mobile tab ----
  const [mobileView, setMobileView] = useState('products'); // 'products' | 'cart' | 'overview'

  // ---- Company info ----
  const companyInfo = useMemo(() => ({
    name: 'WAKEFA SHOP',
    branch: selectedShop?.name || 'Main Branch',
    address: selectedShop?.location || 'Chuka',
    phone: '+254 721 000000',
    email: 'wakefa@gmail.com',
    slogan: 'Quality Products, Best Prices'
  }), [selectedShop]);

  // ============================================================
  // INITIALIZATION
  // ============================================================
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cashierData');
      if (!raw) { navigate('/cashier/login'); return; }
      const data = JSON.parse(raw);
      if (!data?._id && !data?.id) { navigate('/cashier/login'); return; }
      setCashier(data);

      if (data.lastShop && data.shopName) {
        setSelectedShop({
          _id: data.lastShop,
          name: data.shopName,
          location: data.shopLocation
        });
        setDashboardLoading(false);
      } else {
        navigate('/cashier/shops');
      }
    } catch {
      navigate('/cashier/login');
    }
  }, [navigate]);

  // ============================================================
  // DATA FETCHING
  // ============================================================
  const fetchDailyStats = useCallback(async () => {
    if (!cashier?._id || !selectedShop?._id) return;
    setLoading(p => ({ ...p, stats: true }));
    try {
      const today = dayjs().startOf('day').toISOString();
      const now = dayjs().toISOString();
      const combined = await unifiedAPI.getCombinedTransactions({
        cashierId: cashier._id,
        shopId: selectedShop._id,
        startDate: today,
        endDate: now
      });

      const txs = combined.transactions || [];
      const summary = combined.summary || {};
      const enhanced = combined.enhancedStats?.financialStats || {};

      let cashAmount = 0, bankMpesaAmount = 0, cashierItemsSold = 0;
      txs.forEach(t => {
        const split = CashierUtils.calculatePaymentSplit(t);
        cashAmount += split.cash;
        bankMpesaAmount += split.mpesa_bank;
        cashierItemsSold += t.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
      });

      setDailyStats({
        totalSales: enhanced.totalRevenue || summary.totalRevenue || 0,
        totalTransactions: txs.length,
        totalItems: cashierItemsSold,
        cashAmount,
        bankMpesaAmount,
        cashierItemsSold
      });

      // Keep a copy for the Overview tab
      setTodayTransactions(txs);
    } catch (err) {
      console.error('❌ Daily stats error:', err);
      setDailyStats(CashierUtils.getDefaultStats());
      setTodayTransactions([]);
    } finally {
      setLoading(p => ({ ...p, stats: false }));
    }
  }, [cashier, selectedShop]);

  const fetchProducts = useCallback(async (showWarning = false) => {
    if (!selectedShop?._id) return;
    setLoading(p => ({ ...p, products: true }));
    try {
      const all = await productAPI.getAll({ page: 1, limit: 9999 });
      const list = Array.isArray(all) ? all : [];

      const shopProducts = list.filter(p => {
        const pid = p.shop?._id || p.shop || p.shopId;
        return (!pid || pid === selectedShop._id) && p.isActive !== false;
      });

      setProducts(shopProducts);

      if (showWarning && shopProducts.length === 0) {
        message.warning(`No products found for ${selectedShop.name}.`);
      }
    } catch (err) {
      console.error('❌ Products error:', err);
      notification.error({ message: 'Failed to load products', duration: 3 });
    } finally {
      setLoading(p => ({ ...p, products: false }));
    }
  }, [selectedShop]);

  useEffect(() => {
    if (selectedShop) {
      fetchProducts(true);
      fetchDailyStats();
    }
  }, [selectedShop, fetchProducts, fetchDailyStats]);

  // ============================================================
  // CART OPERATIONS
  // ============================================================
  const addToCart = useCallback((product, quantity = 1) => {
    if (!product?._id) return message.error('Invalid product');
    const stock = product.currentStock || 0;
    if (stock <= 0) return message.warning(`${product.name} is out of stock`);

    const qty = Math.min(quantity, stock);
    const price = product.minSellingPrice || product.sellingPrice || 0;

    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product._id);
      if (idx >= 0) {
        const updated = [...prev];
        const newQty = Math.min(updated[idx].quantity + qty, stock);
        updated[idx] = {
          ...updated[idx],
          quantity: newQty,
          subtotal: updated[idx].price * newQty
        };
        const [moved] = updated.splice(idx, 1);
        return [moved, ...updated];
      }
      return [{
        productId: product._id,
        name: product.name,
        price,
        quantity: qty,
        stock,
        category: product.category,
        product,
        subtotal: price * qty,
        addedAt: new Date().toISOString()
      }, ...prev];
    });

    notification.success({
      message: 'Added to cart',
      description: `${qty} × ${product.name}`,
      placement: isMobile ? 'bottom' : 'topRight',
      duration: 1.6
    });

    // Auto-switch to the Cart tab only on mobile
    if (isMobile && mobileView !== 'cart') setMobileView('cart');
  }, [isMobile, mobileView]);

  const updateCartItem = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setCart(p => p.filter(i => i.productId !== productId));
      return;
    }
    const product = products.find(p => p._id === productId);
    const max = product?.currentStock ?? Infinity;
    const qty = Math.min(quantity, max);
    setCart(prev => prev.map(i =>
      i.productId === productId ? { ...i, quantity: qty, subtotal: i.price * qty } : i
    ));
  }, [products]);

  const removeFromCart = useCallback((productId) => {
    setCart(p => p.filter(i => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    if (!cart.length) return;
    Modal.confirm({
      title: 'Clear Cart',
      content: 'Remove all items from the cart?',
      okText: 'Yes, clear',
      okType: 'danger',
      onOk: () => { setCart([]); message.success('Cart cleared'); }
    });
  }, [cart.length]);

  // ============================================================
  // CHECKOUT
  // ============================================================
  const openPaymentModal = useCallback(() => {
    if (!cart.length) return message.error('Cart is empty');
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
      paymentForm.setFieldsValue({ cashAmount: 0, mpesaBankAmount: totals.subtotal });
    }
  }, [totals.subtotal, paymentForm]);

  const handleSplitChange = useCallback((_changed, all) => {
    const cash = parseFloat(all.cashAmount || 0);
    const bank = parseFloat(all.mpesaBankAmount || 0);
    setCashMpesaBankSplit({
      cashAmount: cash,
      mpesaBankAmount: bank,
      totalAmount: cash + bank
    });
  }, []);

  const processTransaction = useCallback(async (paymentMethod, details = {}) => {
    if (!selectedShop?._id || !cashier?._id) return message.error('Missing session data');
    setLoading(p => ({ ...p, checkout: true }));

    try {
      const txnNo = `TXN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

      const items = cart.map(item => {
        const buyingPrice = CashierUtils.safeNumber(
          item.product?.buyingPrice ?? item.buyingPrice ?? item.costPrice,
          0
        );
        return {
          productId: item.productId,
          productName: item.name,
          quantity: Number(item.quantity),
          price: Number(item.price),
          totalPrice: Number(item.price * item.quantity),
          buyingPrice,
          costPrice: buyingPrice
        };
      });

      const totalCost = items.reduce((s, i) => s + (i.buyingPrice * i.quantity), 0);

      const txnData = {
        shop: selectedShop._id,
        shopName: selectedShop.name,
        cashierId: cashier._id,
        cashierName: cashier.name || 'Cashier',
        customerName: 'Walk-in Customer',
        transactionNumber: txnNo,
        receiptNumber: `RCP-${Date.now()}`,
        saleDate: new Date().toISOString(),
        items,
        itemsCount: totals.totalItems,
        totalAmount: Number(totals.subtotal),
        cost: totalCost,
        paymentMethod,
        status: 'completed'
      };

      if (paymentMethod === 'cash') {
        txnData.paymentSplit = { cash: totals.subtotal, mpesa_bank: 0 };
      } else if (paymentMethod === 'mpesa_bank') {
        txnData.paymentSplit = { cash: 0, mpesa_bank: totals.subtotal };
      } else {
        txnData.cashAmount = details.cashAmount;
        txnData.mpesaBankAmount = details.mpesaBankAmount;
        txnData.paymentSplit = {
          cash: details.cashAmount,
          mpesa_bank: details.mpesaBankAmount
        };
      }

      const res = await transactionAPI.create(txnData);
      const result = res?.data || res;

      if (!result?._id) throw new Error('Invalid server response');

      const itemsForReceipt = (result.items || items).map(it => ({
        ...it,
        productName: CashierUtils.resolveProductName(it, products)
      }));
      setCurrentTransaction({ ...result, items: itemsForReceipt });

      setShowReceipt(true);
      setCart([]);
      await Promise.all([fetchDailyStats(), fetchProducts()]);

      notification.success({
        message: 'Sale completed',
        description: `Total: ${CashierUtils.formatCurrency(totals.subtotal)}`,
        duration: 3
      });
    } catch (err) {
      console.error('❌ Checkout error:', err);
      notification.error({
        message: 'Checkout failed',
        description: err.response?.data?.message || err.message || 'Try again',
        duration: 5
      });
      await fetchProducts();
    } finally {
      setLoading(p => ({ ...p, checkout: false }));
      setPaymentModalVisible(false);
      setSelectedPaymentMethod(null);
    }
  }, [cart, selectedShop, cashier, totals, products, fetchDailyStats, fetchProducts]);

  const confirmPayment = useCallback(() => {
    if (selectedPaymentMethod === 'cash_mpesa_bank') {
      const { cashAmount, mpesaBankAmount, totalAmount } = cashMpesaBankSplit;
      if (Math.abs(totalAmount - totals.subtotal) > 0.01) {
        return message.error(
          `Cash + Mpesa/Bank must equal ${CashierUtils.formatCurrency(totals.subtotal)}`
        );
      }
      return processTransaction('cash_mpesa_bank', { cashAmount, mpesaBankAmount });
    }
    return processTransaction(selectedPaymentMethod);
  }, [selectedPaymentMethod, cashMpesaBankSplit, totals.subtotal, processTransaction]);

  // ============================================================
  // RECEIPT ACTIONS
  // ============================================================
  const captureReceiptImage = useCallback(async () => {
    if (!receiptRef.current) return null;
    const canvas = await html2canvas(receiptRef.current, {
      scale: isMobile ? 1.5 : 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    return canvas.toDataURL('image/png', 1.0);
  }, [isMobile]);

  const downloadPDF = useCallback(async () => {
    const img = await captureReceiptImage();
    if (!img) return message.error('Could not capture receipt');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 297] });
    const w = 80;
    const h = (pdf.internal.pageSize.height * w) / pdf.internal.pageSize.width;
    pdf.addImage(img, 'PNG', 0, 10, w, h);
    pdf.save(`Receipt_${currentTransaction?.receiptNumber || dayjs().format('YYYYMMDD_HHmmss')}.pdf`);
    message.success('PDF downloaded');
  }, [captureReceiptImage, currentTransaction]);

  const downloadImage = useCallback(async () => {
    const img = await captureReceiptImage();
    if (!img) return message.error('Could not capture receipt');
    const a = document.createElement('a');
    a.href = img;
    a.download = `Receipt_${currentTransaction?.receiptNumber || dayjs().format('YYYYMMDD_HHmmss')}.png`;
    a.click();
    message.success('Image downloaded');
  }, [captureReceiptImage, currentTransaction]);

  const shareWhatsApp = useCallback(async () => {
    const img = await captureReceiptImage();
    if (!img) return message.error('Could not capture receipt');
    const text =
      `*${companyInfo.name}*\n` +
      `Receipt: ${currentTransaction?.receiptNumber}\n` +
      `Total: ${CashierUtils.formatCurrency(currentTransaction?.totalAmount)}\n` +
      `Thank you!`;
    const blob = await (await fetch(img)).blob();
    const file = new File([blob], 'receipt.png', { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: 'Receipt', text, files: [file] }); return; }
      catch { /* fallthrough */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }, [captureReceiptImage, currentTransaction, companyInfo]);

  const shareEmail = useCallback(async () => {
    const subject = encodeURIComponent(`Receipt from ${companyInfo.name}`);
    const body = encodeURIComponent(
      `Receipt: ${currentTransaction?.receiptNumber}\n` +
      `Date: ${dayjs(currentTransaction?.saleDate).format('DD/MM/YYYY HH:mm')}\n` +
      `Total: ${CashierUtils.formatCurrency(currentTransaction?.totalAmount)}\n\n` +
      (currentTransaction?.items || []).map(i =>
        `• ${i.productName} × ${i.quantity} = ${CashierUtils.formatCurrency(i.totalPrice)}`
      ).join('\n') +
      `\n\nThank you for shopping with us!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [currentTransaction, companyInfo]);

  const printReceipt = useCallback(async () => {
    if (!receiptRef.current) return message.error('Receipt not available');
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm; margin: 0; }
          </style>
        </head>
        <body>${receiptRef.current.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); setTimeout(() => win.close(), 200); }, 300);
    message.success('Print dialog opened');
  }, []);

  const closeReceipt = useCallback(() => {
    setShowReceipt(false);
    setCurrentTransaction(null);
    setShareModalVisible(false);
  }, []);

  // ============================================================
  // NAVIGATION
  // ============================================================
  const handleLogout = useCallback(() => {
    authAPI.logout();
    navigate('/cashier/login');
  }, [navigate]);

  const handleBackToShops = useCallback(() => navigate('/cashier/shops'), [navigate]);

  // ============================================================
  // RENDER — loading screen
  // ============================================================
  if (dashboardLoading || !selectedShop) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', background: '#0f172a'
      }}>
        <div style={{
          width: 60, height: 60,
          border: '4px solid rgba(16,185,129,.2)',
          borderTopColor: '#10b981', borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <Text style={{ color: '#94a3b8', marginTop: 16 }}>
          {!selectedShop ? 'No shop selected' : 'Loading dashboard…'}
        </Text>
      </div>
    );
  }

  const headerBg = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';

  // ============================================================
  // SHARED PROPS for the 2-column desktop layout
  // ============================================================
  const cartPanelProps = {
    products,
    cart,
    totals,
    loading,
    isMobile: false,
    hideProducts: true,           // ✅ show only cart on desktop right column
    updateCartItem,
    removeFromCart,
    clearCart,
    onCheckout: openPaymentModal
  };

  const overviewProps = {
    dailyStats,
    isMobile: false,
    transactions: todayTransactions,
    loading: loading.stats,
    refresh: fetchDailyStats
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* ============ HEADER ============ */}
      <Header style={{
        background: headerBg,
        padding: isMobile ? '0 8px' : '0 16px',
        height: isMobile ? 56 : 64,
        position: 'sticky', top: 0, zIndex: 1000,
        boxShadow: '0 2px 12px rgba(0,0,0,.25)'
      }}>
        <Row justify="space-between" align="middle" style={{ height: '100%' }}>
          <Col>
            <Space size={isMobile ? 4 : 8}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={handleBackToShops}
                style={{ color: '#fff', padding: isMobile ? 4 : 8 }}
              >
                {!isMobile && 'Shop'}
              </Button>
              <Avatar
                size={isMobile ? 28 : 32}
                style={{ background: 'linear-gradient(135deg,#10b981,#34d399)' }}
              >
                <ShopOutlined />
              </Avatar>
              <Title
                level={isMobile ? 5 : 4}
                style={{
                  margin: 0, color: '#fff',
                  maxWidth: isMobile ? 140 : 320,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}
              >
                {selectedShop.name}
              </Title>
            </Space>
          </Col>
          <Col>
            <Space>
              {!isMobile && (
                <>
                  <Tag color="#10b981" style={{ borderRadius: 12, padding: '4px 10px' }}>
                    <UserOutlined /> {cashier?.name}
                  </Tag>
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => { fetchDailyStats(); fetchProducts(); }}
                    loading={loading.stats}
                    style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)', background: 'transparent' }}
                  >
                    Refresh
                  </Button>
                  <Button
                    size="small"
                    danger
                    icon={<LogoutOutlined />}
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Header>

      <Content style={{
        padding: isMobile ? 8 : 12,
        paddingBottom: isMobile ? 80 : 12,
        minHeight: isMobile ? 'calc(100vh - 56px)' : 'calc(100vh - 64px)'
      }}>
        {/* ============ DESKTOP / TABLET: 75 / 25 split ============ */}
        {!isMobile && (
          <Row
            gutter={[12, 12]}
            style={{ height: 'calc(100vh - 88px)' }}
            wrap={false}
          >
            {/* Left: Products grid (3/4) */}
            <Col flex="1 1 75%" style={{ height: '100%', minWidth: 0 }}>
              <CashierPOS
                products={products}
                cart={cart}
                totals={totals}
                loading={loading}
                isMobile={false}
                hideCart
                addToCart={addToCart}
              />
            </Col>

            {/* Right: Cart / Overview (1/4) */}
            <Col
              flex="0 0 25%"
              style={{ height: '100%', minWidth: 320, maxWidth: 480 }}
            >
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Tabs
                  activeKey={rightTab}
                  onChange={setRightTab}
                  type="card"
                  size="small"
                  style={{ marginBottom: 0 }}
                  tabBarStyle={{
                    marginBottom: 0,
                    background: 'transparent'
                  }}
                  items={[
                    {
                      key: 'cart',
                      label: (
                        <span>
                          <ShoppingCartOutlined /> Cart
                          {cart.length > 0 && (
                            <Tag
                              color="#10b981"
                              style={{
                                marginLeft: 6,
                                borderRadius: 10,
                                fontSize: 10,
                                lineHeight: '16px',
                                padding: '0 6px'
                              }}
                            >
                              {cart.length}
                            </Tag>
                          )}
                        </span>
                      ),
                      children: (
                        <div style={{ height: 'calc(100vh - 160px)', minHeight: 400 }}>
                          <CashierPOS {...cartPanelProps} />
                        </div>
                      )
                    },
                    {
                      key: 'overview',
                      label: (
                        <span>
                          <BarChartOutlined /> Overview
                        </span>
                      ),
                      children: (
                        <div style={{ height: 'calc(100vh - 160px)', minHeight: 400 }}>
                          <CashierStats {...overviewProps} />
                        </div>
                      )
                    }
                  ]}
                />
              </div>
            </Col>
          </Row>
        )}

        {/* ============ MOBILE: tabs ============ */}
        {isMobile && (
          <Tabs
            activeKey={mobileView}
            onChange={setMobileView}
            items={[
              {
                key: 'products',
                label: <span><ShopOutlined /> Products</span>,
                children: (
                  <CashierPOS
                    products={products}
                    cart={cart}
                    totals={totals}
                    loading={loading}
                    isMobile
                    hideCart
                    addToCart={addToCart}
                  />
                )
              },
              {
                key: 'cart',
                label: <span><ShoppingCartOutlined /> Cart ({cart.length})</span>,
                children: (
                  <CashierPOS
                    products={products}
                    cart={cart}
                    totals={totals}
                    loading={loading}
                    isMobile
                    hideProducts
                    updateCartItem={updateCartItem}
                    removeFromCart={removeFromCart}
                    clearCart={clearCart}
                    onCheckout={openPaymentModal}
                  />
                )
              },
              {
                key: 'overview',
                label: <span><BarChartOutlined /> Overview</span>,
                children: (
                  <CashierStats
                    dailyStats={dailyStats}
                    isMobile
                    transactions={todayTransactions}
                    loading={loading.stats}
                    refresh={fetchDailyStats}
                  />
                )
              }
            ]}
            tabBarStyle={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: '#fff', margin: 0, zIndex: 999,
              paddingBottom: 4, boxShadow: '0 -2px 12px rgba(0,0,0,.08)'
            }}
          />
        )}

        {/* Mobile quick menu */}
        {isMobile && (
          <FloatButton.Group
            trigger="click"
            type="primary"
            icon={<SettingOutlined />}
            tooltip="Menu"
            style={{ right: 16, bottom: 84 }}
          >
            <FloatButton
              icon={<ReloadOutlined />}
              tooltip="Refresh"
              onClick={() => { fetchDailyStats(); fetchProducts(); }}
            />
            <FloatButton
              icon={<HomeOutlined />}
              tooltip="Change shop"
              onClick={handleBackToShops}
            />
            <FloatButton
              icon={<LogoutOutlined />}
              tooltip="Logout"
              onClick={handleLogout}
            />
          </FloatButton.Group>
        )}

        {/* ============ PAYMENT MODAL ============ */}
        <Modal
          title={`Payment — ${CashierUtils.formatCurrency(totals.subtotal)}`}
          open={paymentModalVisible}
          onCancel={() => { setPaymentModalVisible(false); setSelectedPaymentMethod(null); }}
          footer={null}
          width={isMobile ? '95%' : 520}
          closable={!loading.checkout}
        >
          {!selectedPaymentMethod ? (
            <Row gutter={[12, 12]}>
              {[
                { key: 'cash', title: 'Cash', color: '#10b981' },
                { key: 'mpesa_bank', title: 'M-Pesa / Bank', color: '#2563eb' },
                { key: 'cash_mpesa_bank', title: 'Split', color: '#7c3aed' }
              ].map(opt => (
                <Col span={8} key={opt.key}>
                  <div
                    onClick={() => handlePaymentMethodSelect(opt.key)}
                    style={{
                      padding: 16, textAlign: 'center', cursor: 'pointer',
                      borderRadius: 12, border: '2px solid #e2e8f0',
                      transition: 'all .2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = opt.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    <ShopOutlined style={{ fontSize: 24, color: opt.color }} />
                    <div style={{ marginTop: 8, fontWeight: 600, color: opt.color }}>
                      {opt.title}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          ) : selectedPaymentMethod === 'cash_mpesa_bank' ? (
            <Form
              form={paymentForm}
              layout="vertical"
              onValuesChange={handleSplitChange}
              initialValues={{ cashAmount: 0, mpesaBankAmount: totals.subtotal }}
            >
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    label="Cash (KES)"
                    name="cashAmount"
                    rules={[{ required: true, message: 'Enter cash amount' }]}
                  >
                    <input
                      type="number"
                      className="ant-input ant-input-lg"
                      step="0.01"
                      min={0}
                      style={{
                        width: '100%', padding: '8px 12px',
                        borderRadius: 8, border: '1px solid #d9d9d9'
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Mpesa/Bank (KES)"
                    name="mpesaBankAmount"
                    rules={[{ required: true, message: 'Enter Mpesa/Bank amount' }]}
                  >
                    <input
                      type="number"
                      className="ant-input ant-input-lg"
                      step="0.01"
                      min={0}
                      style={{
                        width: '100%', padding: '8px 12px',
                        borderRadius: 8, border: '1px solid #d9d9d9'
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Row justify="space-between">
                  <Text>Total entered:</Text>
                  <Text strong>{CashierUtils.formatCurrency(cashMpesaBankSplit.totalAmount)}</Text>
                </Row>
                <Row justify="space-between">
                  <Text>Required:</Text>
                  <Text strong>{CashierUtils.formatCurrency(totals.subtotal)}</Text>
                </Row>
              </div>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => setSelectedPaymentMethod(null)}
                  disabled={loading.checkout}
                >
                  Back
                </Button>
                <Button
                  type="primary"
                  loading={loading.checkout}
                  onClick={confirmPayment}
                  disabled={Math.abs(cashMpesaBankSplit.totalAmount - totals.subtotal) > 0.01}
                >
                  Complete
                </Button>
              </Space>
            </Form>
          ) : (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#10b981', marginBottom: 16 }}>
                {CashierUtils.formatCurrency(totals.subtotal)}
              </div>
              <Space>
                <Button
                  onClick={() => setSelectedPaymentMethod(null)}
                  disabled={loading.checkout}
                >
                  Back
                </Button>
                <Button
                  type="primary"
                  size="large"
                  loading={loading.checkout}
                  onClick={confirmPayment}
                >
                  Confirm {selectedPaymentMethod === 'cash' ? 'Cash' : 'M-Pesa/Bank'}
                </Button>
              </Space>
            </div>
          )}
        </Modal>

        {/* ============ RECEIPT MODAL ============ */}
        <Modal
          title="Transaction Complete"
          open={showReceipt}
          onCancel={closeReceipt}
          footer={[
            <Button key="share" onClick={() => setShareModalVisible(true)}>Share</Button>,
            <Button key="print" type="primary" onClick={printReceipt}>Print</Button>,
            <Button key="new" onClick={closeReceipt}>New Sale</Button>
          ]}
          width={isMobile ? '95%' : 600}
        >
          <CashierReceipt
            ref={receiptRef}
            transaction={currentTransaction}
            shop={selectedShop}
            companyInfo={companyInfo}
            isMobile={isMobile}
          />
        </Modal>

        {/* ============ SHARE MODAL ============ */}
        <CashierReceipt.ShareModal
          open={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          onWhatsApp={shareWhatsApp}
          onEmail={shareEmail}
          onPDF={downloadPDF}
          onImage={downloadImage}
          onPrint={printReceipt}
          isMobile={isMobile}
        />
      </Content>
    </Layout>
  );
};

export default CashierDashboard;