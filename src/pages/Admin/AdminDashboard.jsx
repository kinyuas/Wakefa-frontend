// src/pages/Admin/AdminDashboard.jsx - CASHIER AGGREGATION FIX + RESPONSIVE
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Layout, Menu, Typography, Card, Row, Col, Table, Tag, Statistic, List, Alert, Spin,
  Button, Modal, Space, Tooltip, Divider, Badge, Avatar, Progress,
  Tabs, Descriptions, Dropdown, Input, Select, DatePicker,
  Grid, Drawer, FloatButton, Empty, theme, Flex
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  AppstoreOutlined,
  DollarOutlined,
  ShopOutlined,
  ProductOutlined,
  WarningOutlined,
  BarChartOutlined,
  MoneyCollectOutlined,
  EyeOutlined,
  ReloadOutlined,
  ExportOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  FallOutlined,
  LogoutOutlined,
  SettingOutlined,
  SearchOutlined,
  BankOutlined,
  MobileOutlined,
  TabletOutlined,
  DesktopOutlined,
  MenuOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  unifiedAPI,
  shopAPI
} from '../../services/api';
import { CalculationUtils } from '../../utils/calculationUtils';
import dayjs from 'dayjs';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;
const { useBreakpoint } = Grid;
const { useToken } = theme;

// =============================================
// DEVICE-AWARE CARD
// =============================================
const DeviceAwareCard = ({ children, title, extra, style, loading, ...props }) => {
  const screens = useBreakpoint();
  const { token } = useToken();

  return (
    <Card
      title={
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: screens.xs ? 'wrap' : 'nowrap'
        }}>
          {typeof title === 'string' ? (
            <>
              <BarChartOutlined style={{
                color: token.colorPrimary,
                fontSize: screens.xs ? '18px' : '22px'
              }} />
              <Text strong style={{
                fontSize: screens.xs ? '16px' : '18px',
                flex: 1,
                minWidth: 0
              }}>
                {title}
              </Text>
            </>
          ) : title}
        </div>
      }
      extra={extra}
      style={{
        borderRadius: screens.xs ? '8px' : '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: 'none',
        marginBottom: screens.xs ? '12px' : '16px',
        ...style
      }}
      headStyle={{
        padding: screens.xs ? '12px 16px' : '16px 24px',
        borderBottom: `1px solid ${token.colorBorder}`,
        background: screens.xs ? 'white' : 'transparent'
      }}
      bodyStyle={{
        padding: screens.xs ? '12px' : '16px'
      }}
      loading={loading}
      {...props}
    >
      {children}
    </Card>
  );
};

// =============================================
// ⭐ FIX: Flatten populated ObjectId objects back to plain ID strings.
// Without this, using a populated object as an object key collapses
// every entry into "[object Object]" — which is why all cashiers were
// showing the same aggregated totals.
// =============================================
const sanitizeForAggregation = (transactions = []) => {
  if (!Array.isArray(transactions)) return [];

  return transactions.map((t) => {
    if (!t || typeof t !== 'object') return t;

    // 1. cashierId — populated { _id, name, email } → string _id
    let cashierId = t.cashierId;
    if (cashierId && typeof cashierId === 'object') {
      cashierId = cashierId._id || cashierId.id || null;
    }

    // 2. items[].productId — populated { _id, name, ... } → string _id
    const items = Array.isArray(t.items)
      ? t.items.map((it) => {
          if (!it || typeof it !== 'object') return it;
          let pid = it.productId;
          if (pid && typeof pid === 'object') {
            pid = pid._id || pid.id || null;
          }
          return { ...it, productId: pid };
        })
      : t.items;

    return { ...t, cashierId, items };
  });
};

// =============================================
// MAIN COMPONENT
// =============================================
const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { token } = useToken();

  const isMobile = screens.xs;
  const isTablet = screens.sm && !screens.lg;
  const isDesktop = screens.lg;

  const colors = {
    primary: token.colorPrimary,
    success: token.colorSuccess,
    warning: token.colorWarning,
    error: token.colorError,
    purple: '#722ed1',
    cyan: '#13c2c2',
    gold: '#fa8c16',
    lime: '#a0d911',
    magenta: '#eb2f96',
    volcano: '#fa541c',
  };

  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return sessionStorage.getItem('adminWelcomeShown') !== '1';
    } catch {
      return true;
    }
  });

  const [deviceType, setDeviceType] = useState('desktop');
  const [orientation, setOrientation] = useState('portrait');
  const [mobileView, setMobileView] = useState('overview');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const [dashboardData, setDashboardData] = useState({
    financialStats: CalculationUtils.getDefaultStats(),
    businessStats: {
      totalProducts: 0,
      totalShops: 0,
      totalCashiers: 0,
      lowStockCount: 0
    },
    recentTransactions: [],
    lowStockProducts: [],
    topProducts: [],
    shopPerformance: [],
    cashierPerformance: [],
    expenses: []
  });

  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewModalContent, setViewModalContent] = useState(null);
  const [viewModalTitle, setViewModalTitle] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataTimestamp, setDataTimestamp] = useState(null);
  const [shops, setShops] = useState([]);

  const fetchInFlightRef = useRef(false);

  // =============================================
  // DEVICE DETECTION
  // =============================================
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent.toLowerCase();

      if (/android/.test(userAgent)) setDeviceType('android');
      else if (/iphone|ipad|ipod/.test(userAgent)) setDeviceType('ios');
      else if (width <= 768) setDeviceType('mobile');
      else if (width <= 1024) setDeviceType('tablet');
      else setDeviceType('desktop');

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

  const deviceConfig = useMemo(() => ({
    isMobile,
    isTablet,
    isDesktop,
    isLandscape: orientation === 'landscape',
    deviceType,
    cardPadding: isMobile ? '8px' : '16px',
    fontSize: {
      small: isMobile ? '10px' : '12px',
      medium: isMobile ? '12px' : '14px',
      large: isMobile ? '14px' : '16px'
    }
  }), [isMobile, isTablet, isDesktop, deviceType, orientation]);

  // =============================================
  // WELCOME EFFECT
  // =============================================
  useEffect(() => {
    if (!showWelcome) return;
    try { sessionStorage.setItem('adminWelcomeShown', '1'); } catch {}
    const timer = setTimeout(() => setShowWelcome(false), 3000);
    return () => clearTimeout(timer);
  }, [showWelcome]);

  // =============================================
  // DATA FETCH — refetches on navigation back to /admin/dashboard
  // =============================================
  useEffect(() => {
    if (location.pathname !== '/admin/dashboard') return;
    if (fetchInFlightRef.current) return;

    fetchInFlightRef.current = true;
    fetchDashboardData()
      .catch(err => console.error('Dashboard fetch failed:', err))
      .finally(() => {
        fetchInFlightRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setRefreshing(true);

      const shopsData = await shopAPI.getAll();
      setShops(shopsData);

      const endDate = dayjs();
      const startDate = dayjs().subtract(30, 'days');

      const params = {
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD')
      };

      const comprehensiveData = await unifiedAPI.getCombinedTransactions(params);

      const processedData = processDashboardData(comprehensiveData, shopsData);

      setDashboardData(processedData);
      setDataTimestamp(new Date().toISOString());

    } catch (error) {
      console.error('💥 Dashboard fetch failed:', error);
      setDashboardData({
        financialStats: CalculationUtils.getDefaultStats(),
        businessStats: { totalProducts: 0, totalShops: 0, totalCashiers: 0, lowStockCount: 0 },
        recentTransactions: [],
        lowStockProducts: [],
        topProducts: [],
        shopPerformance: [],
        cashierPerformance: [],
        expenses: []
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =============================================
  // PROCESS DATA
  // =============================================
  const processDashboardData = (comprehensiveData, shops) => {
    const processedData = CalculationUtils.processComprehensiveData(
      comprehensiveData,
      null,
      { includePerformance: true, includeProducts: true }
    );

    const transactions = processedData.salesWithProfit || [];
    const financialStats = processedData.financialStats || CalculationUtils.getDefaultStats();
    const products = processedData.products || [];
    const expenses = processedData.expenses || [];
    const cashiers = processedData.cashiers || [];

    const thirtyDaysAgo = dayjs().subtract(30, 'days');
    const filteredTransactions = transactions.filter(t =>
      dayjs(t.saleDate || t.createdAt).isAfter(thirtyDaysAgo)
    );

    const recentTransactions = filteredTransactions
      .sort((a, b) => new Date(b.saleDate || b.createdAt) - new Date(a.saleDate || a.createdAt))
      .slice(0, 10);

    const lowStockProducts = products.filter(p =>
      CalculationUtils.safeNumber(p.currentStock) <= CalculationUtils.safeNumber(p.minStockLevel, 5)
    ).slice(0, 5);

    // ⭐ Sanitize before aggregation so populated objects don't collapse
    const safeTransactions = sanitizeForAggregation(filteredTransactions);

    const topProducts = CalculationUtils.calculateTopProducts(safeTransactions, 5);
    const shopPerformance = CalculationUtils.calculateShopPerformance(safeTransactions, shops);
    const cashierPerformance = CalculationUtils.calculateCashierPerformance(safeTransactions, cashiers);

    const costOfGoodsSold = financialStats.costOfGoodsSold ||
      safeTransactions.reduce((sum, t) => {
        if (t.cost) return sum + CalculationUtils.safeNumber(t.cost);
        return sum + CalculationUtils.calculateCostFromItems(t);
      }, 0);

    const totalExpenses = financialStats.totalExpenses ||
      expenses.reduce((sum, e) => sum + CalculationUtils.safeNumber(e.amount), 0);

    const enhancedFinancialStats = {
      ...financialStats,
      totalRevenue: financialStats.totalRevenue || 0,
      netProfit: financialStats.netProfit || 0,
      totalSales: financialStats.totalSales || safeTransactions.length,
      totalExpenses,
      costOfGoodsSold: parseFloat(costOfGoodsSold.toFixed(2)),
      grossProfit: financialStats.grossProfit || parseFloat((financialStats.totalRevenue - costOfGoodsSold).toFixed(2)),
      profitMargin: financialStats.profitMargin || CalculationUtils.calculateProfitMargin(financialStats.totalRevenue, financialStats.grossProfit),
      totalCash: financialStats.totalCash || safeTransactions.reduce((sum, t) => {
        if (t.paymentMethod === 'cash' || (t.paymentSplit && t.paymentSplit.cash)) {
          return sum + CalculationUtils.safeNumber(t.paymentSplit?.cash || t.totalAmount);
        }
        return sum;
      }, 0),
      totalMpesaBank: financialStats.totalMpesaBank || safeTransactions.reduce((sum, t) => {
        if (['mpesa', 'bank', 'mpesa_bank'].includes(t.paymentMethod) || (t.paymentSplit && t.paymentSplit.mpesa_bank)) {
          return sum + CalculationUtils.safeNumber(t.paymentSplit?.mpesa_bank || t.totalAmount);
        }
        return sum;
      }, 0)
    };

    enhancedFinancialStats.netProfit = parseFloat(
      (enhancedFinancialStats.grossProfit - enhancedFinancialStats.totalExpenses).toFixed(2)
    );

    const businessStats = {
      totalProducts: products.length,
      totalShops: shops.length,
      totalCashiers: cashiers.length,
      lowStockCount: lowStockProducts.length
    };

    return {
      financialStats: enhancedFinancialStats,
      businessStats,
      recentTransactions,
      lowStockProducts,
      topProducts,
      shopPerformance,
      cashierPerformance,
      expenses,
      timestamp: new Date().toISOString()
    };
  };

  // =============================================
  // HANDLERS
  // =============================================
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDashboardData();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const exportData = { timestamp: dataTimestamp, ...dashboardData };
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const filteredRecentTransactions = useMemo(() => {
    if (!searchTerm) return dashboardData.recentTransactions;
    return dashboardData.recentTransactions.filter(transaction =>
      transaction.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.transactionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.cashierName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dashboardData.recentTransactions, searchTerm]);

  const handleLogout = () => {
    Modal.confirm({
      title: 'Confirm Logout',
      content: 'Are you sure you want to logout?',
      okText: 'Yes, Logout',
      cancelText: 'Cancel',
      centered: deviceConfig.isMobile,
      onOk: () => {
        ['adminToken', 'cashierToken', 'authToken', 'token', 'adminData',
         'cashierData', 'userData', 'selectedShop', 'lastShop', 'shopName']
          .forEach(k => localStorage.removeItem(k));
        try { sessionStorage.removeItem('adminWelcomeShown'); } catch {}
        navigate('/admin-login');
      }
    });
  };

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/admin/dashboard')) return 'dashboard';
    if (path.includes('/admin/cashiers')) return 'cashiers';
    if (path.includes('/admin/shops')) return 'shops';
    if (path.includes('/admin/products')) return 'products';
    if (path.includes('/admin/inventory')) return 'inventory';
    if (path.includes('/admin/expenses')) return 'expenses';
    if (path.includes('/admin/transactions')) return 'transactions';
    return 'dashboard';
  };

  const handleViewAll = (type) => {
    switch (type) {
      case 'sales': navigate('/admin/transactions'); break;
      case 'cashiers': navigate('/admin/cashiers'); break;
      case 'shops': navigate('/admin/shops'); break;
      case 'products': navigate('/admin/products'); break;
      case 'expenses': navigate('/admin/expenses'); break;
      case 'inventory': navigate('/admin/inventory'); break;
      default: break;
    }
  };

  const handleViewDetails = (type, data) => {
    setViewModalTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} Details`);
    setViewModalContent(data);
    setViewModalVisible(true);
  };

  const handleMenuClick = ({ key }) => {
    switch (key) {
      case 'dashboard': navigate('/admin/dashboard'); break;
      case 'cashiers': navigate('/admin/cashiers'); break;
      case 'shops': navigate('/admin/shops'); break;
      case 'products': navigate('/admin/products'); break;
      case 'inventory': navigate('/admin/inventory'); break;
      case 'expenses': navigate('/admin/expenses'); break;
      case 'transactions': navigate('/admin/transactions'); break;
      default: navigate('/admin/dashboard');
    }
  };

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: 'Profile Settings' },
    { key: 'settings', icon: <SettingOutlined />, label: 'System Settings' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true, onClick: handleLogout }
  ];

  const salesColumns = [
    {
      title: <Text strong style={{ fontSize: deviceConfig.fontSize.small }}>Transaction ID</Text>,
      dataIndex: '_id',
      key: 'transactionId',
      render: (id, record) => (
        <Tooltip title={id}>
          <Text code style={{ fontSize: deviceConfig.fontSize.small }}>
            {record.transactionNumber || (id ? `${id.substring(0, 8)}...` : 'N/A')}
          </Text>
        </Tooltip>
      ),
      width: 100
    },
    {
      title: <Text strong style={{ fontSize: deviceConfig.fontSize.small }}>Date</Text>,
      dataIndex: 'saleDate',
      key: 'saleDate',
      render: (date) => (
        <Text style={{ fontSize: deviceConfig.fontSize.small }}>
          {date ? new Date(date).toLocaleDateString('en-KE') : 'N/A'}
        </Text>
      ),
      width: 90
    },
    {
      title: <Text strong style={{ fontSize: deviceConfig.fontSize.small }}>Customer</Text>,
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name) => <Text style={{ fontSize: deviceConfig.fontSize.small }}>{name || 'Walk-in'}</Text>,
      width: 100
    },
    {
      title: <Text strong style={{ fontSize: deviceConfig.fontSize.small }}>Amount</Text>,
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => (
        <Text strong style={{
          fontSize: deviceConfig.isMobile ? '14px' : '16px',
          color: '#1890ff',
          fontWeight: 'bold'
        }}>
          {CalculationUtils.formatCurrency(amount)}
        </Text>
      ),
      width: 100
    },
    {
      title: <Text strong style={{ fontSize: deviceConfig.fontSize.small }}>Profit</Text>,
      dataIndex: 'profit',
      key: 'profit',
      render: (profit) => (
        <Text strong style={{
          fontSize: deviceConfig.isMobile ? '14px' : '16px',
          fontWeight: 'bold',
          color: CalculationUtils.getProfitColor(profit)
        }}>
          {CalculationUtils.formatCurrency(profit)}
        </Text>
      ),
      width: 80
    },
    {
      title: <Text strong style={{ fontSize: deviceConfig.fontSize.small }}>Payment</Text>,
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method) => {
        const c = { cash: 'green', mpesa_bank: 'blue', mpesa: 'geekblue', bank: 'purple' };
        return <Tag color={c[method] || 'default'} style={{ fontSize: deviceConfig.fontSize.small }}>
          {method ? method.toUpperCase() : 'CASH'}
        </Tag>;
      },
      width: 80
    }
  ];

  const lowStockColumns = [
    {
      title: <Text strong style={{ fontSize: deviceConfig.fontSize.small }}>Product</Text>,
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <ProductOutlined />
          <Text style={{ fontSize: deviceConfig.fontSize.medium }}>{text}</Text>
          {record.currentStock === 0 && <Tag color="red" style={{ fontSize: deviceConfig.fontSize.small }}>OUT</Tag>}
        </Space>
      )
    },
    {
      title: <Text strong style={{ fontSize: deviceConfig.fontSize.small }}>Stock</Text>,
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (stock, record) => (
        <Text strong style={{
          fontSize: deviceConfig.isMobile ? '20px' : '24px',
          fontWeight: 'bold',
          color: record.currentStock === 0 ? '#cf1322' :
                 record.currentStock <= (record.minStockLevel || 5) ? '#faad14' : '#52c41a'
        }}>
          {stock}
        </Text>
      ),
      width: 80
    },
    {
      title: <Text strong style={{ fontSize: deviceConfig.fontSize.small }}>Min</Text>,
      dataIndex: 'minStockLevel',
      key: 'minStockLevel',
      render: (min) => (
        <Text strong style={{ fontSize: deviceConfig.isMobile ? '14px' : '16px', fontWeight: 'bold', color: '#722ed1' }}>
          {min}
        </Text>
      ),
      width: 60
    },
    {
      title: <Text strong style={{ fontSize: deviceConfig.fontSize.small }}>Price</Text>,
      dataIndex: 'minSellingPrice',
      key: 'minSellingPrice',
      render: (price) => (
        <Text strong style={{ fontSize: deviceConfig.fontSize.medium, fontWeight: 'bold', color: '#2ecc71' }}>
          {CalculationUtils.formatCurrency(price)}
        </Text>
      ),
      width: 100
    }
  ];

  const MobileNavBar = useCallback(() => {
    if (!deviceConfig.isMobile) return null;

    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: '#ffffff', borderTop: '1px solid #f0f0f0',
        padding: '8px 8px',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        zIndex: 1000, boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', minHeight: '70px'
      }}>
        <Row justify="space-around" align="middle" style={{ height: '100%' }}>
          {[
            { key: 'overview', icon: <DashboardOutlined />, label: 'Overview' },
            { key: 'financial', icon: <DollarOutlined />, label: 'Financial' },
            { key: 'transactions', icon: <ShoppingCartOutlined />, label: 'Sales' },
          ].map(tab => (
            <Col span={4} key={tab.key} style={{ textAlign: 'center' }}>
              <Button
                type={mobileView === tab.key ? 'primary' : 'text'}
                icon={tab.icon}
                onClick={() => setMobileView(tab.key)}
                block
                style={{
                  height: '50px', fontSize: '9px',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', padding: '4px 2px'
                }}
              >
                {tab.label}
              </Button>
            </Col>
          ))}
          <Col span={4} style={{ textAlign: 'center' }}>
            <Button icon={<ProductOutlined />} onClick={() => navigate('/admin/products')} block
              style={{ height: '50px', fontSize: '9px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 2px' }}>
              Products
            </Button>
          </Col>
          <Col span={4} style={{ textAlign: 'center' }}>
            <Button icon={<ShopOutlined />} onClick={() => navigate('/admin/shops')} block
              style={{ height: '50px', fontSize: '9px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 2px' }}>
              Shops
            </Button>
          </Col>
          <Col span={4} style={{ textAlign: 'center' }}>
            <Button icon={<MenuOutlined />} onClick={() => setDrawerVisible(true)} block
              style={{ height: '50px', fontSize: '9px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 2px' }}>
              More
            </Button>
          </Col>
        </Row>
      </div>
    );
  }, [deviceConfig.isMobile, mobileView, navigate]);

  const MobileDrawer = useCallback(() => (
    <Drawer title="Admin Menu" placement="right" onClose={() => setDrawerVisible(false)} open={drawerVisible} width={280} bodyStyle={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {[
          { icon: <DashboardOutlined />, label: 'Dashboard', path: '/admin/dashboard' },
          { icon: <ProductOutlined />, label: 'Products Management', path: '/admin/products' },
          { icon: <ShopOutlined />, label: 'Shops Management', path: '/admin/shops' },
          { icon: <UserOutlined />, label: 'Cashiers Management', path: '/admin/cashiers' },
          { icon: <BarChartOutlined />, label: 'Transactions Report', path: '/admin/transactions' },
          { icon: <DollarOutlined />, label: 'Expenses Management', path: '/admin/expenses' },
          { icon: <AppstoreOutlined />, label: 'Inventory Management', path: '/admin/inventory' }
        ].map(item => (
          <Button key={item.path} icon={item.icon} block
            style={{ textAlign: 'left', height: '50px', fontSize: '14px' }}
            onClick={() => { navigate(item.path); setDrawerVisible(false); }}>
            {item.label}
          </Button>
        ))}
        <Divider />
        <Button icon={<LogoutOutlined />} onClick={handleLogout} danger block
          style={{ textAlign: 'left', height: '50px', fontSize: '14px' }}>
          Logout
        </Button>
      </Space>
    </Drawer>
  ), [drawerVisible, navigate, handleLogout]);

  const FinancialStatsCards = useCallback(() => {
    const safeStats = dashboardData?.financialStats || CalculationUtils.getDefaultStats();
    const cards = [
      { title: 'Total Revenue', value: safeStats.totalRevenue, prefix: 'KES', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      { title: 'Net Profit', value: safeStats.netProfit, prefix: 'KES', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
      { title: 'Total Sales', value: safeStats.totalSales, prefix: '', bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
      { title: 'Cash Payments', value: safeStats.totalCash, prefix: 'KES', bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
      { title: 'Digital Payments', value: safeStats.totalMpesaBank, prefix: 'KES', bg: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)' },
      { title: 'Items Sold', value: safeStats.totalItemsSold || 0, prefix: '', bg: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
      { title: 'Cost of Goods', value: safeStats.costOfGoodsSold || 0, prefix: 'KES', bg: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)' },
      { title: 'Expenses', value: safeStats.totalExpenses || 0, prefix: 'KES', bg: 'linear-gradient(135deg, #eb5757 0%, #f2994a 100%)' }
    ];

    return (
      <Row gutter={[8, 8]} style={{ marginBottom: deviceConfig.isMobile ? '8px' : '12px' }}>
        {cards.map((card, i) => (
          <Col key={i} xs={12} sm={12} md={6} lg={4}>
            <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', background: card.bg, height: '100%' }}
              bodyStyle={{ padding: deviceConfig.isMobile ? '8px' : '12px', textAlign: 'center' }}>
              <Statistic
                title={<Text style={{ color: 'white', fontSize: deviceConfig.isMobile ? '10px' : '12px', fontWeight: '500', lineHeight: '1.4' }}>{card.title}</Text>}
                value={card.value}
                prefix={card.prefix}
                precision={0}
                valueStyle={{ color: 'white', fontSize: deviceConfig.isMobile ? '14px' : '16px', fontWeight: 'bold', lineHeight: '1.2' }}
              />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }, [dashboardData, deviceConfig]);

  const BusinessStatsCards = useCallback(() => (
    <Row gutter={[8, 8]} style={{ marginBottom: deviceConfig.isMobile ? '8px' : '12px' }}>
      {[
        { title: 'Total Products', value: dashboardData.businessStats.totalProducts, icon: <ProductOutlined />, bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
        { title: 'Total Shops', value: dashboardData.businessStats.totalShops, icon: <ShopOutlined />, bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
        { title: 'Total Cashiers', value: dashboardData.businessStats.totalCashiers, icon: <UserOutlined />, bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
        { title: 'Low Stock Items', value: dashboardData.businessStats.lowStockCount, icon: <WarningOutlined />, bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }
      ].map((card, i) => (
        <Col key={i} xs={12} sm={12} md={6} lg={4}>
          <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', background: card.bg, height: '100%' }}
            bodyStyle={{ padding: deviceConfig.isMobile ? '8px' : '12px', textAlign: 'center' }}>
            <Statistic
              title={<Text style={{ color: 'white', fontSize: deviceConfig.isMobile ? '10px' : '12px', fontWeight: '500' }}>{card.title}</Text>}
              value={card.value}
              prefix={card.icon}
              valueStyle={{ color: 'white', fontSize: deviceConfig.isMobile ? '14px' : '16px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  ), [dashboardData, deviceConfig]);

  if (loading && location.pathname === '/admin/dashboard' && !dashboardData.recentTransactions.length) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', backgroundColor: '#f0f2f5' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}><Text type="secondary">Loading admin dashboard...</Text></div>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} breakpoint="lg"
        collapsedWidth={isMobile ? 0 : 80} trigger={!isMobile ? null : undefined}
        style={{ background: 'linear-gradient(180deg, #2c3e50 0%, #3498db 100%)', boxShadow: '2px 0 8px rgba(0,0,0,0.15)', display: isMobile ? 'none' : 'block' }}
        width={200}>
        {!isMobile && (
          <>
            <div className="logo" style={{ padding: '16px 0', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <Title level={4} style={{ color: 'white', margin: 0, fontWeight: 'bold', fontSize: collapsed ? '14px' : '16px' }}>
                {collapsed ? 'POS' : 'WAKEFA SHOP'}
              </Title>
            </div>
            <Menu theme="dark" selectedKeys={[getActiveTab()]} mode="inline" onClick={handleMenuClick} style={{ background: 'transparent', border: 'none' }}>
              {[
                { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
                { key: 'products', icon: <ProductOutlined />, label: 'Products' },
                { key: 'shops', icon: <ShopOutlined />, label: 'Shops' },
                { key: 'cashiers', icon: <UserOutlined />, label: 'Cashiers' },
                { key: 'transactions', icon: <BarChartOutlined />, label: 'Transactions' },
                { key: 'expenses', icon: <DollarOutlined />, label: 'Expenses' },
                { key: 'inventory', icon: <AppstoreOutlined />, label: 'Inventory' }
              ].map(item => (
                <Menu.Item key={item.key} icon={item.icon} style={{ margin: '4px 8px', borderRadius: '6px' }}>
                  {!collapsed && item.label}
                </Menu.Item>
              ))}
            </Menu>
          </>
        )}
      </Sider>

      <Layout className="site-layout">
        <Header className="site-layout-header" style={{
          background: 'linear-gradient(90deg, #3498db 0%, #2980b9 100%)',
          padding: isMobile ? '0 8px' : '0 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          height: isMobile ? '56px' : '64px',
          position: 'sticky', top: 0, zIndex: 100, width: '100%'
        }}>
          <Flex justify="space-between" align="center" style={{ height: '100%' }}>
            <Flex align="center" gap="small">
              {isMobile && (
                <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerVisible(true)} style={{ color: 'white' }} />
              )}
              <Title level={isMobile ? 5 : 4} style={{ color: 'white', margin: 0, fontWeight: 'bold' }}>
                Admin Dashboard
              </Title>
            </Flex>

            <Space size="small" wrap>
              {!isMobile && (
                <Tag color="blue" style={{ borderRadius: '12px', padding: '4px 8px', fontSize: '11px' }}>
                  {deviceType === 'desktop' ? <DesktopOutlined /> : deviceType === 'tablet' ? <TabletOutlined /> : <MobileOutlined />}
                  {' '}{deviceType.toUpperCase()}
                </Tag>
              )}
              <Tooltip title="Refresh Data">
                <Button icon={<ReloadOutlined spin={refreshing} />} onClick={handleManualRefresh} disabled={refreshing}
                  size={isMobile ? "small" : "middle"} type="primary" style={{ background: colors.primary, borderColor: colors.primary }} />
              </Tooltip>
              <Tooltip title="Export Data">
                <Button icon={<ExportOutlined />} onClick={handleExportData} loading={exportLoading}
                  size={isMobile ? "small" : "middle"} type="default" />
              </Tooltip>
              {!isMobile && (
                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                  <Button type="text" style={{ color: 'white', fontWeight: 'bold' }} size="middle">
                    <Space><UserOutlined /> Admin</Space>
                  </Button>
                </Dropdown>
              )}
              <Tooltip title="Logout">
                <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleLogout} size={isMobile ? "small" : "middle"} />
              </Tooltip>
            </Space>
          </Flex>
        </Header>

        <Content style={{
          margin: isMobile ? '4px' : '8px',
          padding: isMobile ? '8px' : '12px',
          background: '#f5f7fa',
          overflow: 'auto',
          marginBottom: isMobile ? '84px' : '0',
          minHeight: isMobile ? 'calc(100vh - 140px)' : 'calc(100vh - 64px)'
        }}>
          {isMobile && <MobileNavBar />}
          {isMobile && <MobileDrawer />}

          {showWelcome && location.pathname === '/admin/dashboard' && (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              height: isMobile ? '50vh' : '60vh',
              fontSize: isMobile ? '1.2rem' : '2.5rem',
              fontWeight: 'bold', color: '#3498db', animation: 'fadeIn 1s',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)', textAlign: 'center',
              padding: isMobile ? '8px' : '16px'
            }}>
              WELCOME TO WAKEFA SHOP ADMIN DASHBOARD
            </div>
          )}

          {!showWelcome && location.pathname === '/admin/dashboard' && (
            <>
              <Row style={{ marginBottom: isMobile ? '8px' : '12px' }} justify="space-between" align="middle" gutter={[8, 8]}>
                <Col xs={24} sm={12}>
                  {dataTimestamp && (
                    <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px', display: 'block' }}>
                      Last updated: {new Date(dataTimestamp).toLocaleString()}
                    </Text>
                  )}
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px', display: 'block', textAlign: isMobile ? 'left' : 'right' }}>
                    Showing last 30 days data
                  </Text>
                </Col>
              </Row>

              <DeviceAwareCard title="Financial Overview" loading={loading}><FinancialStatsCards /></DeviceAwareCard>
              <DeviceAwareCard title="Business Overview" loading={loading}><BusinessStatsCards /></DeviceAwareCard>

              {dashboardData.businessStats.lowStockCount > 0 && (
                <Alert
                  message={<Text style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: '500' }}>
                    <Text strong style={{ fontSize: isMobile ? '16px' : '18px', color: '#e74c3c', marginRight: '8px' }}>{dashboardData.businessStats.lowStockCount}</Text>
                    products are low on stock
                  </Text>}
                  description={<Text style={{ fontSize: isMobile ? '12px' : '13px' }}>Some products need to be reordered to avoid stockouts.</Text>}
                  type="warning" showIcon icon={<WarningOutlined />}
                  action={<Button size={isMobile ? "small" : "middle"} type="primary" onClick={() => handleViewAll('inventory')}>View</Button>}
                  style={{ marginBottom: '16px', borderRadius: '8px' }}
                />
              )}

              {/* Cashier Performance — now correctly aggregated */}
              <DeviceAwareCard
                title="Cashier Performance"
                extra={<Badge count={dashboardData.cashierPerformance.length} showZero color={colors.primary} />}
                loading={loading}
              >
                {dashboardData.cashierPerformance.length > 0 ? (
                  <List
                    dataSource={dashboardData.cashierPerformance}
                    renderItem={(item, index) => (
                      <List.Item style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <List.Item.Meta
                          avatar={
                            <Avatar size={isMobile ? 32 : 40}
                              style={{ backgroundColor: index < 3 ? colors.cyan : '#bdc3c7' }}>
                              {item.name?.charAt(0)?.toUpperCase() || 'C'}
                            </Avatar>
                          }
                          title={<Text strong style={{ fontSize: '13px' }}>{item.name || 'Unknown Cashier'}</Text>}
                          description={
                            <Space direction="vertical" size={0}>
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                {item.transactions} transactions • {item.itemsSold || 0} items sold
                              </Text>
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                Revenue: <Text strong style={{ color: colors.primary }}>
                                  {CalculationUtils.formatCurrency(item.revenue || 0)}
                                </Text>
                              </Text>
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                Profit: <Text strong style={{ color: CalculationUtils.getProfitColor(item.profit) }}>
                                  {CalculationUtils.formatCurrency(item.profit || 0)}
                                </Text>
                                <Text type="secondary"> • Margin: </Text>
                                <Text strong style={{ color: colors.success }}>
                                  {(item.profitMargin || 0).toFixed(1)}%
                                </Text>
                              </Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                    pagination={{ pageSize: 5, size: 'small', simple: true }}
                  />
                ) : (
                  <Empty description="No cashier performance data available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </DeviceAwareCard>

              <Row gutter={[12, 12]}>
                <Col xs={24} lg={12}>
                  <DeviceAwareCard
                    title="Recent Transactions"
                    extra={
                      <Space size="small">
                        <Search placeholder="Search..." size="small" style={{ width: 150 }}
                          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} allowClear />
                        <Button size="small" type="primary" onClick={() => handleViewAll('sales')}>View All</Button>
                      </Space>
                    }
                  >
                    <Table
                      dataSource={filteredRecentTransactions}
                      columns={salesColumns}
                      pagination={{ pageSize: 5, size: 'small', simple: true, hideOnSinglePage: true }}
                      size="small" scroll={{ x: 600 }} rowKey="_id"
                      locale={{ emptyText: 'No recent transactions' }}
                    />
                  </DeviceAwareCard>
                </Col>

                <Col xs={24} lg={12}>
                  <DeviceAwareCard title="Low Stock Products"
                    extra={<Button size="small" onClick={() => handleViewAll('inventory')}>Manage</Button>}>
                    <Table
                      dataSource={dashboardData.lowStockProducts}
                      columns={lowStockColumns}
                      pagination={false} size="small" rowKey="_id"
                      locale={{ emptyText: 'All products are well stocked' }}
                    />
                  </DeviceAwareCard>
                </Col>

                <Col xs={24} lg={8}>
                  <DeviceAwareCard title="Top Selling Products"
                    extra={<Badge count={dashboardData.topProducts.length} showZero color={colors.purple} />}>
                    <List
                      dataSource={dashboardData.topProducts}
                      renderItem={(item, index) => (
                        <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <List.Item.Meta
                            avatar={
                              <Avatar size="small" style={{ backgroundColor: index < 3 ? colors.primary : '#95a5a6', fontSize: '11px', fontWeight: 'bold', width: '24px', height: '24px', lineHeight: '24px' }}>
                                {index + 1}
                              </Avatar>
                            }
                            title={<Text style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.name}</Text>}
                            description={
                              <Space>
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                  Sold: <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.primary }}>{item.totalSold}</Text>
                                </Text>
                                <Divider type="vertical" />
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                  Revenue: <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.success }}>{CalculationUtils.formatCurrency(item.totalRevenue)}</Text>
                                </Text>
                              </Space>
                            }
                          />
                        </List.Item>
                      )}
                      locale={{ emptyText: 'No product sales data' }}
                    />
                  </DeviceAwareCard>
                </Col>

                <Col xs={24} lg={8}>
                  <DeviceAwareCard title="Shop Performance"
                    extra={<Badge count={dashboardData.shopPerformance.length} showZero color={colors.primary} />}>
                    <List
                      dataSource={dashboardData.shopPerformance}
                      renderItem={(item, index) => (
                        <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <List.Item.Meta
                            avatar={<Avatar size="small" style={{ backgroundColor: index < 3 ? colors.purple : '#bdc3c7', fontSize: '11px', fontWeight: 'bold', width: '24px', height: '24px', lineHeight: '24px' }}>
                              {item.name?.charAt(0)?.toUpperCase() || 'S'}
                            </Avatar>}
                            title={<Text style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.name}</Text>}
                            description={
                              <Space>
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                  Txns: <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.primary }}>{item.transactions}</Text>
                                </Text>
                                <Divider type="vertical" />
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                  Revenue: <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.success }}>{CalculationUtils.formatCurrency(item.revenue)}</Text>
                                </Text>
                              </Space>
                            }
                          />
                        </List.Item>
                      )}
                      locale={{ emptyText: 'No shop performance data' }}
                    />
                  </DeviceAwareCard>
                </Col>
              </Row>

              <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
                <Col span={24}>
                  <DeviceAwareCard title="Quick Actions">
                    <Space wrap>
                      <Button type="primary" icon={<BarChartOutlined />} onClick={() => navigate('/admin/transactions')} size="middle">Full Reports</Button>
                      <Button icon={<ProductOutlined />} onClick={() => navigate('/admin/products')} size="middle">Manage Products</Button>
                      <Button icon={<ShopOutlined />} onClick={() => navigate('/admin/shops')} size="middle">Manage Shops</Button>
                      <Button icon={<UserOutlined />} onClick={() => navigate('/admin/cashiers')} size="middle">Manage Cashiers</Button>
                      <Button icon={<AppstoreOutlined />} onClick={() => navigate('/admin/inventory')} size="middle">Check Inventory</Button>
                      <Button icon={<DollarOutlined />} onClick={() => navigate('/admin/expenses')} size="middle">Manage Expenses</Button>
                      <Button icon={<ReloadOutlined />} onClick={handleManualRefresh} size="middle">Refresh Data</Button>
                    </Space>
                  </DeviceAwareCard>
                </Col>
              </Row>
            </>
          )}

          {location.pathname !== '/admin/dashboard' && <Outlet />}

          <Modal title={viewModalTitle} open={viewModalVisible} onCancel={() => setViewModalVisible(false)}
            footer={[<Button key="close" onClick={() => setViewModalVisible(false)}>Close</Button>]}
            width={Math.min(700, window.innerWidth * 0.9)} style={{ top: 20 }} centered={isMobile}>
            {viewModalContent && (
              <Descriptions bordered column={isMobile ? 1 : 2} size="small">
                {Object.entries(viewModalContent).map(([key, value]) => {
                  if (key === '_id' || key === '__v') return null;
                  if (key === 'items' && Array.isArray(value)) {
                    return (
                      <Descriptions.Item label="Items" span={2} key={key}>
                        <List size="small" dataSource={value.slice(0, 10)}
                          renderItem={item => (
                            <List.Item>
                              {item.productName} -
                              <Text strong style={{ margin: '0 4px', fontSize: '13px' }}>{item.quantity}</Text> x
                              <Text strong style={{ margin: '0 4px', fontSize: '13px', color: colors.success }}>{CalculationUtils.formatCurrency(item.unitPrice)}</Text> =
                              <Text strong style={{ margin: '0 4px', fontSize: '13px', color: colors.primary }}>{CalculationUtils.formatCurrency(item.totalPrice)}</Text>
                            </List.Item>
                          )} />
                      </Descriptions.Item>
                    );
                  }
                  if (typeof value === 'object' && value !== null) {
                    return <Descriptions.Item label={key} span={2} key={key}><Text code>{JSON.stringify(value, null, 2)}</Text></Descriptions.Item>;
                  }
                  return <Descriptions.Item label={key} key={key}>{String(value)}</Descriptions.Item>;
                })}
              </Descriptions>
            )}
          </Modal>
        </Content>
      </Layout>

      {isMobile && (
        <FloatButton.Group trigger="click" type="primary" icon={<SettingOutlined />} tooltip="Quick Actions"
          style={{ right: 24, bottom: 96 }}>
          <FloatButton icon={<ReloadOutlined />} onClick={handleManualRefresh} tooltip="Refresh Data" />
          <FloatButton icon={<ExportOutlined />} onClick={handleExportData} tooltip="Export Data" />
          <FloatButton.BackTop visibilityHeight={0} tooltip="Back to Top" />
        </FloatButton.Group>
      )}
    </Layout>
  );
};

export default AdminDashboard;