// src/pages/Admin/AdminDashboard.jsx - UPDATED WITH ALL REQUESTED CHANGES
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
  ShoppingOutlined,
  AppstoreOutlined,
  HistoryOutlined,
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
  CalculatorOutlined,
  LineChartOutlined,
  PieChartOutlined,
  LogoutOutlined,
  SettingOutlined,
  SearchOutlined,
  TeamOutlined,
  FilterOutlined,
  BankOutlined,
  MobileOutlined,
  TabletOutlined,
  DesktopOutlined,
  MenuOutlined,
  CloseOutlined,
  DownloadOutlined,
  PrinterOutlined,
  ShareAltOutlined,
  InfoCircleOutlined,
  StockOutlined,
  DatabaseOutlined,
  UnorderedListOutlined,
  CalendarOutlined,
  ShoppingTwoTone,
  ShopTwoTone,
  UserSwitchOutlined,
  PercentageOutlined
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  unifiedAPI, 
  shopAPI, 
  reportAPI 
} from '../../services/api';
import { CalculationUtils } from '../../utils/calculationUtils';
import dayjs from 'dayjs';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;
const { useBreakpoint } = Grid;
const { useToken } = theme;

// =============================================
// DEVICE-AWARE COMPONENTS
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
// MAIN COMPONENT
// =============================================

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { token } = useToken();
  
  // Device detection
  const isMobile = screens.xs;
  const isTablet = screens.sm && !screens.lg;
  const isDesktop = screens.lg;
  
  // Colors from theme
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
  const [showWelcome, setShowWelcome] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Device detection states
  const [deviceType, setDeviceType] = useState('desktop');
  const [orientation, setOrientation] = useState('portrait');
  const [mobileView, setMobileView] = useState('overview');
  const [drawerVisible, setDrawerVisible] = useState(false);
  
  // Dashboard data
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
    // Add expenses data
    expenses: []
  });
  
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewModalContent, setViewModalContent] = useState(null);
  const [viewModalTitle, setViewModalTitle] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataTimestamp, setDataTimestamp] = useState(null);
  const [shops, setShops] = useState([]);

  // Device detection
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
    isMobile,
    isTablet,
    isDesktop,
    isLandscape: orientation === 'landscape',
    deviceType,
    cols: {
      left: isMobile ? 24 : isTablet ? (orientation === 'landscape' ? 12 : 24) : 16,
      right: isMobile ? 24 : isTablet ? (orientation === 'landscape' ? 12 : 24) : 8
    },
    cardPadding: isMobile ? '8px' : '16px',
    fontSize: {
      small: isMobile ? '10px' : '12px',
      medium: isMobile ? '12px' : '14px',
      large: isMobile ? '14px' : '16px'
    }
  }), [isMobile, isTablet, isDesktop, deviceType, orientation]);

  // Initial data fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);
    
    fetchDashboardData();
    
    return () => clearTimeout(timer);
  }, []);

  // Data fetching
  const fetchDashboardData = async () => {
    console.log('🚀 Fetching dashboard data...');
    
    try {
      setLoading(true);
      setRefreshing(true);
      
      // Fetch shops first
      const shopsData = await shopAPI.getAll();
      setShops(shopsData);

      // Build params for last 30 days only
      const endDate = dayjs();
      const startDate = dayjs().subtract(30, 'days');
      
      const params = {
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD')
      };

      // Use unified API endpoint
      const comprehensiveData = await unifiedAPI.getCombinedTransactions(params);
      
      console.log('📊 Unified API response:', {
        transactions: comprehensiveData.salesWithProfit?.length,
        financialStats: comprehensiveData.financialStats,
        expenses: comprehensiveData.expenses?.length
      });

      // Process data
      const processedData = processDashboardData(comprehensiveData, shopsData);

      setDashboardData(processedData);
      setDataTimestamp(new Date().toISOString());
      
      console.log('✅ Dashboard data processed:', {
        totalRevenue: processedData.financialStats.totalRevenue,
        netProfit: processedData.financialStats.netProfit,
        costOfGoodsSold: processedData.financialStats.costOfGoodsSold,
        totalExpenses: processedData.financialStats.totalExpenses,
        recentTransactions: processedData.recentTransactions.length
      });
      
    } catch (error) {
      console.error('💥 Dashboard fetch failed:', error);
      // Set empty data structure
      setDashboardData({
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Dashboard data processing
  const processDashboardData = (comprehensiveData, shops) => {
    console.log('🔄 Processing dashboard data...');
    
    // Process data
    const processedData = CalculationUtils.processComprehensiveData(
      comprehensiveData, 
      null, // No shop filter
      { 
        includePerformance: true,
        includeProducts: true 
      }
    );

    // Extract data from processed structure
    const transactions = processedData.salesWithProfit || [];
    const financialStats = processedData.financialStats || CalculationUtils.getDefaultStats();
    const products = processedData.products || [];
    const expenses = processedData.expenses || [];
    const cashiers = processedData.cashiers || [];

    console.log('📈 Processed data extracted:', {
      transactions: transactions.length,
      products: products.length,
      expenses: expenses.length,
      cashiers: cashiers.length
    });

    // Filter for last 30 days only
    const thirtyDaysAgo = dayjs().subtract(30, 'days');
    const filteredTransactions = transactions.filter(t => 
      dayjs(t.saleDate || t.createdAt).isAfter(thirtyDaysAgo)
    );

    // Recent transactions (last 10)
    const recentTransactions = filteredTransactions
      .sort((a, b) => new Date(b.saleDate || b.createdAt) - new Date(a.saleDate || a.createdAt))
      .slice(0, 10);

    // Low stock products
    const lowStockProducts = products.filter(p => 
      CalculationUtils.safeNumber(p.currentStock) <= CalculationUtils.safeNumber(p.minStockLevel, 5)
    ).slice(0, 5);

    // Top products
    const topProducts = CalculationUtils.calculateTopProducts(filteredTransactions, 5);

    // Shop performance
    const shopPerformance = CalculationUtils.calculateShopPerformance(filteredTransactions, shops);

    // Cashier performance
    const cashierPerformance = CalculationUtils.calculateCashierPerformance(filteredTransactions, cashiers);

    // Calculate COGS and Expenses
    const costOfGoodsSold = financialStats.costOfGoodsSold || 
                           filteredTransactions.reduce((sum, t) => {
                             if (t.cost) {
                               return sum + CalculationUtils.safeNumber(t.cost);
                             }
                             return sum + CalculationUtils.calculateCostFromItems(t);
                           }, 0);

    const totalExpenses = financialStats.totalExpenses || 
                         expenses.reduce((sum, e) => sum + CalculationUtils.safeNumber(e.amount), 0);

    // Enhanced financial stats with COGS and Expenses
    const enhancedFinancialStats = {
      ...financialStats,
      totalRevenue: financialStats.totalRevenue || 0,
      netProfit: financialStats.netProfit || 0,
      totalSales: financialStats.totalSales || filteredTransactions.length,
      totalExpenses: totalExpenses,
      costOfGoodsSold: parseFloat(costOfGoodsSold.toFixed(2)),
      grossProfit: financialStats.grossProfit || parseFloat((financialStats.totalRevenue - costOfGoodsSold).toFixed(2)),
      profitMargin: financialStats.profitMargin || CalculationUtils.calculateProfitMargin(financialStats.totalRevenue, financialStats.grossProfit),
      totalCash: financialStats.totalCash || filteredTransactions.reduce((sum, t) => {
        if (t.paymentMethod === 'cash' || (t.paymentSplit && t.paymentSplit.cash)) {
          return sum + CalculationUtils.safeNumber(t.paymentSplit?.cash || t.totalAmount);
        }
        return sum;
      }, 0),
      totalMpesaBank: financialStats.totalMpesaBank || filteredTransactions.reduce((sum, t) => {
        if (['mpesa', 'bank', 'mpesa_bank'].includes(t.paymentMethod) || (t.paymentSplit && t.paymentSplit.mpesa_bank)) {
          return sum + CalculationUtils.safeNumber(t.paymentSplit?.mpesa_bank || t.totalAmount);
        }
        return sum;
      }, 0),
      // Ensure these are explicitly set
      costOfGoodsSoldDisplay: parseFloat(costOfGoodsSold.toFixed(2)),
      totalExpensesDisplay: parseFloat(totalExpenses.toFixed(2))
    };

    // Recalculate net profit with accurate expenses and COGS
    enhancedFinancialStats.netProfit = parseFloat(
      (enhancedFinancialStats.grossProfit - enhancedFinancialStats.totalExpenses).toFixed(2)
    );

    // Business stats
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
      timestamp: new Date().toISOString(),
      dataSources: {
        transactions: filteredTransactions.length,
        products: products.length,
        expenses: expenses.length,
        shops: shops.length,
        cashiers: cashiers.length
      }
    };
  };

  // Manual refresh only
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
      const exportData = {
        timestamp: dataTimestamp,
        ...dashboardData
      };

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

  // Enhanced search functionality
  const filteredRecentTransactions = useMemo(() => {
    if (!searchTerm) return dashboardData.recentTransactions;
    
    return dashboardData.recentTransactions.filter(transaction =>
      transaction.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.transactionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.cashierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.shop?.toLowerCase().includes(searchTerm.toLowerCase())
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
        localStorage.removeItem('adminToken');
        localStorage.removeItem('cashierToken');
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        localStorage.removeItem('adminData');
        localStorage.removeItem('cashierData');
        localStorage.removeItem('userData');
        localStorage.removeItem('selectedShop');
        localStorage.removeItem('lastShop');
        localStorage.removeItem('shopName');
        
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
      case 'sales':
        navigate('/admin/transactions');
        break;
      case 'cashiers':
        navigate('/admin/cashiers');
        break;
      case 'shops':
        navigate('/admin/shops');
        break;
      case 'products':
        navigate('/admin/products');
        break;
      case 'expenses':
        navigate('/admin/expenses');
        break;
      case 'inventory':
        navigate('/admin/inventory');
        break;
      default:
        break;
    }
  };

  const handleViewDetails = (type, data) => {
    setViewModalTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} Details`);
    setViewModalContent(data);
    setViewModalVisible(true);
  };

  const handleMenuClick = ({ key }) => {
    switch (key) {
      case 'dashboard':
        navigate('/admin/dashboard');
        break;
      case 'cashiers':
        navigate('/admin/cashiers');
        break;
      case 'shops':
        navigate('/admin/shops');
        break;
      case 'products':
        navigate('/admin/products');
        break;
      case 'inventory':
        navigate('/admin/inventory');
        break;
      case 'expenses':
        navigate('/admin/expenses');
        break;
      case 'transactions':
        navigate('/admin/transactions');
        break;
      default:
        navigate('/admin/dashboard');
    }
  };

  // User dropdown menu items
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile Settings'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'System Settings'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: handleLogout
    }
  ];

  // Format full number
  const formatFullNumber = (num) => {
    if (typeof num !== 'number') return '0';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Sales Columns
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
        <Text 
          strong 
          style={{ 
            fontSize: deviceConfig.isMobile ? '14px' : '16px',
            fontWeight: 'bold',
            color: CalculationUtils.getProfitColor(profit) 
          }}
        >
          {CalculationUtils.formatCurrency(profit)}
        </Text>
      ),
      width: 80
    },
    {
      title: <Text strong style={{ fontSize: deviceConfig.fontSize.small }}>Shop</Text>,
      dataIndex: 'shop',
      key: 'shop',
      render: (text) => <Tag color="blue" style={{ fontSize: deviceConfig.fontSize.small }}>{text || 'Unknown Shop'}</Tag>,
      width: 80
    },
    {
      title: <Text strong style={{ fontSize: deviceConfig.fontSize.small }}>Payment</Text>,
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method) => {
        const methodColors = {
          cash: 'green',
          mpesa_bank: 'blue',
          mpesa: 'geekblue',
          bank: 'purple'
        };
        
        return (
          <Tag 
            color={methodColors[method] || 'default'}
            style={{ fontSize: deviceConfig.fontSize.small }}
          >
            {method ? method.toUpperCase() : 'CASH'}
          </Tag>
        );
      },
      width: 80
    }
  ];

  // Low Stock Products Columns
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
        <Text 
          strong 
          style={{ 
            fontSize: deviceConfig.isMobile ? '20px' : '24px',
            fontWeight: 'bold',
            color: record.currentStock === 0 ? '#cf1322' : 
                   record.currentStock <= (record.minStockLevel || 5) ? '#faad14' : '#52c41a'
          }}
        >
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

  // Mobile Navigation Bar
  const MobileNavBar = useCallback(() => {
    if (!deviceConfig.isMobile) return null;
    
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        borderTop: '1px solid #f0f0f0',
        padding: '8px 8px',
        zIndex: 1000,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        height: '70px'
      }}>
        <Row justify="space-around" align="middle" style={{ height: '100%' }}>
          <Col span={4} style={{ textAlign: 'center' }}>
            <Button
              type={mobileView === 'overview' ? 'primary' : 'text'}
              icon={<DashboardOutlined />}
              onClick={() => setMobileView('overview')}
              block
              style={{ 
                height: '50px',
                fontSize: '9px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 2px'
              }}
            >
              Overview
            </Button>
          </Col>
          <Col span={4} style={{ textAlign: 'center' }}>
            <Button
              type={mobileView === 'financial' ? 'primary' : 'text'}
              icon={<DollarOutlined />}
              onClick={() => setMobileView('financial')}
              block
              style={{ 
                height: '50px',
                fontSize: '9px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 2px'
              }}
            >
              Financial
            </Button>
          </Col>
          <Col span={4} style={{ textAlign: 'center' }}>
            <Button
              type={mobileView === 'transactions' ? 'primary' : 'text'}
              icon={<ShoppingCartOutlined />}
              onClick={() => setMobileView('transactions')}
              block
              style={{ 
                height: '50px',
                fontSize: '9px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 2px'
              }}
            >
              Sales
            </Button>
          </Col>
          <Col span={4} style={{ textAlign: 'center' }}>
            <Button
              type={mobileView === 'products' ? 'primary' : 'text'}
              icon={<ProductOutlined />}
              onClick={() => {
                navigate('/admin/products');
              }}
              block
              style={{ 
                height: '50px',
                fontSize: '9px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 2px'
              }}
            >
              Products
            </Button>
          </Col>
          <Col span={4} style={{ textAlign: 'center' }}>
            <Button
              type={mobileView === 'shops' ? 'primary' : 'text'}
              icon={<ShopOutlined />}
              onClick={() => {
                navigate('/admin/shops');
              }}
              block
              style={{ 
                height: '50px',
                fontSize: '9px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 2px'
              }}
            >
              Shops
            </Button>
          </Col>
          <Col span={4} style={{ textAlign: 'center' }}>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
              block
              style={{ 
                height: '50px',
                fontSize: '9px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 2px'
              }}
            >
              More
            </Button>
          </Col>
        </Row>
      </div>
    );
  }, [deviceConfig.isMobile, mobileView, navigate]);

  // Mobile Drawer with all navigation options
  const MobileDrawer = useCallback(() => (
    <Drawer
      title="Admin Menu"
      placement="right"
      onClose={() => setDrawerVisible(false)}
      open={drawerVisible}
      width={280}
      bodyStyle={{ padding: '16px' }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Button 
          icon={<DashboardOutlined />}
          block
          style={{ textAlign: 'left', height: '50px', fontSize: '14px' }}
          onClick={() => {
            navigate('/admin/dashboard');
            setDrawerVisible(false);
          }}
        >
          Dashboard
        </Button>
        
        <Button 
          icon={<ProductOutlined />}
          block
          style={{ textAlign: 'left', height: '50px', fontSize: '14px' }}
          onClick={() => {
            navigate('/admin/products');
            setDrawerVisible(false);
          }}
        >
          Products Management
        </Button>
        
        <Button 
          icon={<ShopOutlined />}
          block
          style={{ textAlign: 'left', height: '50px', fontSize: '14px' }}
          onClick={() => {
            navigate('/admin/shops');
            setDrawerVisible(false);
          }}
        >
          Shops Management
        </Button>
        
        <Button 
          icon={<UserOutlined />}
          block
          style={{ textAlign: 'left', height: '50px', fontSize: '14px' }}
          onClick={() => {
            navigate('/admin/cashiers');
            setDrawerVisible(false);
          }}
        >
          Cashiers Management
        </Button>
        
        <Button 
          icon={<BarChartOutlined />}
          block
          style={{ textAlign: 'left', height: '50px', fontSize: '14px' }}
          onClick={() => {
            navigate('/admin/transactions');
            setDrawerVisible(false);
          }}
        >
          Transactions Report
        </Button>
        
        <Button 
          icon={<DollarOutlined />}
          block
          style={{ textAlign: 'left', height: '50px', fontSize: '14px' }}
          onClick={() => {
            navigate('/admin/expenses');
            setDrawerVisible(false);
          }}
        >
          Expenses Management
        </Button>
        
        <Button 
          icon={<AppstoreOutlined />}
          block
          style={{ textAlign: 'left', height: '50px', fontSize: '14px' }}
          onClick={() => {
            navigate('/admin/inventory');
            setDrawerVisible(false);
          }}
        >
          Inventory Management
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
  ), [drawerVisible, navigate, handleLogout]);

  // Financial Stats Cards - UPDATED with COGS and Expenses
  const FinancialStatsCards = useCallback(() => {
    const safeStats = dashboardData?.financialStats || CalculationUtils.getDefaultStats();
    
    return (
      <Row gutter={[8, 8]} style={{ marginBottom: deviceConfig.isMobile ? '8px' : '12px' }}>
        <Col xs={12} sm={12} md={6} lg={4}>
          <Card 
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              height: '100%'
            }}
            bodyStyle={{ padding: deviceConfig.isMobile ? '8px' : '12px', textAlign: 'center' }}
          >
            <Statistic
              title={
                <Text style={{ 
                  color: 'white', 
                  fontSize: deviceConfig.isMobile ? '10px' : '12px', 
                  fontWeight: '500',
                  lineHeight: '1.4'
                }}>
                  Total Revenue
                </Text>
              }
              value={safeStats.totalRevenue}
              prefix="KES"
              precision={0}
              valueStyle={{ 
                color: 'white', 
                fontSize: deviceConfig.isMobile ? '14px' : '16px',
                fontWeight: 'bold',
                lineHeight: '1.2'
              }}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={12} md={6} lg={4}>
          <Card 
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: 'none',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              height: '100%'
            }}
            bodyStyle={{ padding: deviceConfig.isMobile ? '8px' : '12px', textAlign: 'center' }}
          >
            <Statistic
              title={
                <Text style={{ 
                  color: 'white', 
                  fontSize: deviceConfig.isMobile ? '10px' : '12px', 
                  fontWeight: '500',
                  lineHeight: '1.4'
                }}>
                  Net Profit
                </Text>
              }
              value={safeStats.netProfit}
              prefix="KES"
              precision={0}
              valueStyle={{ 
                color: 'white', 
                fontSize: deviceConfig.isMobile ? '14px' : '16px',
                fontWeight: 'bold',
                lineHeight: '1.2'
              }}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={12} md={6} lg={4}>
          <Card 
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: 'none',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              height: '100%'
            }}
            bodyStyle={{ padding: deviceConfig.isMobile ? '8px' : '12px', textAlign: 'center' }}
          >
            <Statistic
              title={
                <Text style={{ 
                  color: 'white', 
                  fontSize: deviceConfig.isMobile ? '10px' : '12px', 
                  fontWeight: '500',
                  lineHeight: '1.4'
                }}>
                  Total Sales
                </Text>
              }
              value={safeStats.totalSales}
              precision={0}
              valueStyle={{ 
                color: 'white', 
                fontSize: deviceConfig.isMobile ? '14px' : '16px',
                fontWeight: 'bold',
                lineHeight: '1.2'
              }}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={12} md={6} lg={4}>
          <Card 
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: 'none',
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              height: '100%'
            }}
            bodyStyle={{ padding: deviceConfig.isMobile ? '8px' : '12px', textAlign: 'center' }}
          >
            <Statistic
              title={
                <Text style={{ 
                  color: 'white', 
                  fontSize: deviceConfig.isMobile ? '10px' : '12px', 
                  fontWeight: '500',
                  lineHeight: '1.4'
                }}>
                  Cash Payments
                </Text>
              }
              value={safeStats.totalCash}
              prefix="KES"
              precision={0}
              valueStyle={{ 
                color: 'white', 
                fontSize: deviceConfig.isMobile ? '14px' : '16px',
                fontWeight: 'bold',
                lineHeight: '1.2'
              }}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={12} md={6} lg={4}>
          <Card 
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: 'none',
              background: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
              height: '100%'
            }}
            bodyStyle={{ padding: deviceConfig.isMobile ? '8px' : '12px', textAlign: 'center' }}
          >
            <Statistic
              title={
                <Text style={{ 
                  color: 'white', 
                  fontSize: deviceConfig.isMobile ? '10px' : '12px', 
                  fontWeight: '500',
                  lineHeight: '1.4'
                }}>
                  Digital Payments
                </Text>
              }
              value={safeStats.totalMpesaBank}
              prefix="KES"
              precision={0}
              valueStyle={{ 
                color: 'white', 
                fontSize: deviceConfig.isMobile ? '14px' : '16px',
                fontWeight: 'bold',
                lineHeight: '1.2'
              }}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={12} md={6} lg={4}>
          <Card 
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: 'none',
              background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
              height: '100%'
            }}
            bodyStyle={{ padding: deviceConfig.isMobile ? '8px' : '12px', textAlign: 'center' }}
          >
            <Statistic
              title={
                <Text style={{ 
                  color: 'white', 
                  fontSize: deviceConfig.isMobile ? '10px' : '12px', 
                  fontWeight: '500',
                  lineHeight: '1.4'
                }}>
                  Items Sold
                </Text>
              }
              value={safeStats.totalItemsSold || 0}
              precision={0}
              valueStyle={{ 
                color: 'white', 
                fontSize: deviceConfig.isMobile ? '14px' : '16px',
                fontWeight: 'bold',
                lineHeight: '1.2'
              }}
            />
          </Card>
        </Col>

        {/* NEW: Cost of Goods Sold Card */}
        <Col xs={12} sm={12} md={6} lg={4}>
          <Card 
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: 'none',
              background: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)',
              height: '100%'
            }}
            bodyStyle={{ padding: deviceConfig.isMobile ? '8px' : '12px', textAlign: 'center' }}
          >
            <Statistic
              title={
                <Text style={{ 
                  color: 'white', 
                  fontSize: deviceConfig.isMobile ? '10px' : '12px', 
                  fontWeight: '500',
                  lineHeight: '1.4'
                }}>
                  Cost of Goods
                </Text>
              }
              value={safeStats.costOfGoodsSold || 0}
              prefix="KES"
              precision={0}
              valueStyle={{ 
                color: 'white', 
                fontSize: deviceConfig.isMobile ? '14px' : '16px',
                fontWeight: 'bold',
                lineHeight: '1.2'
              }}
            />
          </Card>
        </Col>

        {/* NEW: Expenses Card */}
        <Col xs={12} sm={12} md={6} lg={4}>
          <Card 
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: 'none',
              background: 'linear-gradient(135deg, #eb5757 0%, #f2994a 100%)',
              height: '100%'
            }}
            bodyStyle={{ padding: deviceConfig.isMobile ? '8px' : '12px', textAlign: 'center' }}
          >
            <Statistic
              title={
                <Text style={{ 
                  color: 'white', 
                  fontSize: deviceConfig.isMobile ? '10px' : '12px', 
                  fontWeight: '500',
                  lineHeight: '1.4'
                }}>
                  Expenses
                </Text>
              }
              value={safeStats.totalExpenses || 0}
              prefix="KES"
              precision={0}
              valueStyle={{ 
                color: 'white', 
                fontSize: deviceConfig.isMobile ? '14px' : '16px',
                fontWeight: 'bold',
                lineHeight: '1.2'
              }}
            />
          </Card>
        </Col>
      </Row>
    );
  }, [dashboardData, deviceConfig]);

  // Business Stats Cards
  const BusinessStatsCards = useCallback(() => (
    <Row gutter={[8, 8]} style={{ marginBottom: deviceConfig.isMobile ? '8px' : '12px' }}>
      <Col xs={12} sm={12} md={6} lg={4}>
        <Card 
          style={{ 
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            height: '100%'
          }}
          bodyStyle={{ padding: deviceConfig.isMobile ? '8px' : '12px', textAlign: 'center' }}
        >
          <Statistic
            title={
              <Text style={{ 
                color: 'white', 
                fontSize: deviceConfig.isMobile ? '10px' : '12px', 
                fontWeight: '500',
                lineHeight: '1.4'
              }}>
                Total Products
              </Text>
            }
            value={dashboardData.businessStats.totalProducts}
            prefix={<ProductOutlined />}
            valueStyle={{ 
              color: 'white', 
              fontSize: deviceConfig.isMobile ? '14px' : '16px',
              fontWeight: 'bold',
              lineHeight: '1.2'
            }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6} lg={4}>
        <Card 
          style={{ 
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: 'none',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            height: '100%'
          }}
          bodyStyle={{ padding: deviceConfig.isMobile ? '8px' : '12px', textAlign: 'center' }}
        >
          <Statistic
            title={
              <Text style={{ 
                color: 'white', 
                fontSize: deviceConfig.isMobile ? '10px' : '12px', 
                fontWeight: '500',
                lineHeight: '1.4'
              }}>
                Total Shops
              </Text>
            }
            value={dashboardData.businessStats.totalShops}
            prefix={<ShopOutlined />}
            valueStyle={{ 
              color: 'white', 
              fontSize: deviceConfig.isMobile ? '14px' : '16px',
              fontWeight: 'bold',
              lineHeight: '1.2'
            }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6} lg={4}>
        <Card 
          style={{ 
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: 'none',
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            height: '100%'
          }}
          bodyStyle={{ padding: deviceConfig.isMobile ? '8px' : '12px', textAlign: 'center' }}
        >
          <Statistic
            title={
              <Text style={{ 
                color: 'white', 
                fontSize: deviceConfig.isMobile ? '10px' : '12px', 
                fontWeight: '500',
                lineHeight: '1.4'
              }}>
                Total Cashiers
              </Text>
            }
            value={dashboardData.businessStats.totalCashiers}
            prefix={<UserOutlined />}
            valueStyle={{ 
              color: 'white', 
              fontSize: deviceConfig.isMobile ? '14px' : '16px',
              fontWeight: 'bold',
              lineHeight: '1.2'
            }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6} lg={4}>
        <Card 
          style={{ 
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: 'none',
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            height: '100%'
          }}
          bodyStyle={{ padding: deviceConfig.isMobile ? '8px' : '12px', textAlign: 'center' }}
        >
          <Statistic
            title={
              <Text style={{ 
                color: 'white', 
                fontSize: deviceConfig.isMobile ? '10px' : '12px', 
                fontWeight: '500',
                lineHeight: '1.4'
              }}>
                Low Stock Items
              </Text>
            }
            value={dashboardData.businessStats.lowStockCount}
            prefix={<WarningOutlined />}
            valueStyle={{ 
              color: 'white', 
              fontSize: deviceConfig.isMobile ? '14px' : '16px',
              fontWeight: 'bold',
              lineHeight: '1.2'
            }}
          />
        </Card>
      </Col>
    </Row>
  ), [dashboardData, deviceConfig]);

  // Loading state
  if (loading && location.pathname === '/admin/dashboard' && !dashboardData.recentTransactions.length) {
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
            Loading admin dashboard...
          </Text>
        </div>
      </div>
    );
  }

  return (
    <Layout style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={isMobile ? 0 : 80}
        trigger={!isMobile ? null : undefined}
        style={{ 
          background: 'linear-gradient(180deg, #2c3e50 0%, #3498db 100%)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          display: isMobile ? 'none' : 'block'
        }}
        width={200}
      >
        {!isMobile && (
          <>
            <div className="logo" style={{ 
              padding: '16px 0', 
              textAlign: 'center', 
              borderBottom: '1px solid rgba(255,255,255,0.1)' 
            }}>
              <Title level={4} style={{ 
                color: 'white', 
                margin: 0, 
                fontWeight: 'bold', 
                fontSize: collapsed ? '14px' : '16px' 
              }}>
                {collapsed ? 'POS' : 'SUPERMARKET POS'}
              </Title>
            </div>
            <Menu 
              theme="dark" 
              selectedKeys={[getActiveTab()]}
              mode="inline"
              onClick={handleMenuClick}
              style={{ background: 'transparent', border: 'none' }}
            >
              <Menu.Item key="dashboard" icon={<DashboardOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
                {!collapsed && 'Dashboard'}
              </Menu.Item>
              <Menu.Item key="products" icon={<ProductOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
                {!collapsed && 'Products'}
              </Menu.Item>
              <Menu.Item key="shops" icon={<ShopOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
                {!collapsed && 'Shops'}
              </Menu.Item>
              <Menu.Item key="cashiers" icon={<UserOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
                {!collapsed && 'Cashiers'}
              </Menu.Item>
              <Menu.Item key="transactions" icon={<BarChartOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
                {!collapsed && 'Transactions'}
              </Menu.Item>
              <Menu.Item key="expenses" icon={<DollarOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
                {!collapsed && 'Expenses'}
              </Menu.Item>
              <Menu.Item key="inventory" icon={<AppstoreOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
                {!collapsed && 'Inventory'}
              </Menu.Item>
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
          position: 'sticky',
          top: 0,
          zIndex: 100,
          width: '100%'
        }}>
          <Flex justify="space-between" align="center" style={{ height: '100%' }}>
            <Flex align="center" gap="small">
              {isMobile && (
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setDrawerVisible(true)}
                  style={{ color: 'white' }}
                />
              )}
              <Title level={isMobile ? 5 : 4} style={{ color: 'white', margin: 0, fontWeight: 'bold' }}>
                Admin Dashboard
              </Title>
            </Flex>
            
            <Space size="small" wrap>
              {/* Device Info */}
              {!isMobile && (
                <Tag 
                  color="blue" 
                  style={{ 
                    borderRadius: '12px', 
                    padding: '4px 8px',
                    fontSize: '11px'
                  }}
                >
                  {deviceType === 'desktop' ? <DesktopOutlined /> : 
                   deviceType === 'tablet' ? <TabletOutlined /> : <MobileOutlined />} 
                  {' '}{deviceType.toUpperCase()}
                </Tag>
              )}
              
              <Tooltip title="Refresh Data">
                <Button 
                  icon={<ReloadOutlined spin={refreshing} />} 
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  size={isMobile ? "small" : "middle"}
                  type="primary"
                  style={{ background: colors.primary, borderColor: colors.primary }}
                />
              </Tooltip>
              
              <Tooltip title="Export Data">
                <Button 
                  icon={<ExportOutlined />} 
                  onClick={handleExportData}
                  loading={exportLoading}
                  size={isMobile ? "small" : "middle"}
                  type="default"
                />
              </Tooltip>
              
              {!isMobile && (
                <Dropdown
                  menu={{ items: userMenuItems }}
                  placement="bottomRight"
                  arrow
                >
                  <Button type="text" style={{ color: 'white', fontWeight: 'bold' }} size="middle">
                    <Space>
                      <UserOutlined />
                      Admin
                    </Space>
                  </Button>
                </Dropdown>
              )}
              
              <Tooltip title="Logout">
                <Button 
                  type="primary" 
                  danger 
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                  size={isMobile ? "small" : "middle"}
                />
              </Tooltip>
            </Space>
          </Flex>
        </Header>
        
        <Content style={{ 
          margin: isMobile ? '4px' : '8px', 
          padding: isMobile ? '8px' : '12px', 
          background: '#f5f7fa',
          overflow: 'auto',
          marginBottom: isMobile ? '70px' : '0',
          minHeight: isMobile ? 'calc(100vh - 126px)' : 'calc(100vh - 64px)'
        }}>
          {/* Mobile Navigation */}
          {isMobile && <MobileNavBar />}
          {isMobile && <MobileDrawer />}

          {showWelcome && location.pathname === '/admin/dashboard' && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: isMobile ? '50vh' : '60vh',
              fontSize: isMobile ? '1.2rem' : '2.5rem',
              fontWeight: 'bold',
              color: '#3498db',
              animation: 'fadeIn 1s',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center',
              padding: isMobile ? '8px' : '16px'
            }}>
              WELCOME TO WADAVE SUPERMARKET ADMIN DASHBOARD
            </div>
          )}
          
          {!showWelcome && location.pathname === '/admin/dashboard' && (
            <>
              {/* Data Timestamp */}
              <Row style={{ marginBottom: isMobile ? '8px' : '12px' }} justify="space-between" align="middle" gutter={[8, 8]}>
                <Col xs={24} sm={12}>
                  {dataTimestamp && (
                    <Text type="secondary" style={{ 
                      fontSize: isMobile ? '10px' : '12px',
                      display: 'block'
                    }}>
                      Last updated: {new Date(dataTimestamp).toLocaleString()}
                    </Text>
                  )}
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ 
                    fontSize: isMobile ? '10px' : '12px',
                    display: 'block',
                    textAlign: isMobile ? 'left' : 'right'
                  }}>
                    Showing last 30 days data
                  </Text>
                </Col>
              </Row>

              {/* Financial Overview */}
              <DeviceAwareCard 
                title="Financial Overview"
                loading={loading}
              >
                <FinancialStatsCards />
              </DeviceAwareCard>

              {/* Business Overview */}
              <DeviceAwareCard 
                title="Business Overview"
                loading={loading}
              >
                <BusinessStatsCards />
              </DeviceAwareCard>

              {/* Alerts Section */}
              {dashboardData.businessStats.lowStockCount > 0 && (
                <Alert
                  message={
                    <Text style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: '500' }}>
                      <Text strong style={{ fontSize: isMobile ? '16px' : '18px', color: '#e74c3c', marginRight: '8px' }}>
                        {dashboardData.businessStats.lowStockCount}
                      </Text>
                      products are low on stock
                    </Text>
                  }
                  description={
                    <Text style={{ fontSize: isMobile ? '12px' : '13px' }}>
                      Some products need to be reordered to avoid stockouts.
                    </Text>
                  }
                  type="warning"
                  showIcon
                  icon={<WarningOutlined />}
                  action={
                    <Button size={isMobile ? "small" : "middle"} type="primary" onClick={() => handleViewAll('inventory')}>
                      View
                    </Button>
                  }
                  style={{ marginBottom: '16px', borderRadius: '8px' }}
                />
              )}

              {/* Mobile Layout */}
              {isMobile ? (
                <div style={{ 
                  height: 'calc(100vh - 350px)',
                  overflowY: 'auto',
                  paddingBottom: '8px'
                }}>
                  {mobileView === 'overview' && (
                    <>
                      {/* Top Products */}
                      <DeviceAwareCard
                        title="Top Selling Products"
                        extra={<Badge count={dashboardData.topProducts.length} showZero color={colors.purple} />}
                      >
                        <List
                          dataSource={dashboardData.topProducts}
                          renderItem={(item, index) => (
                            <List.Item style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <List.Item.Meta
                                avatar={
                                  <Avatar 
                                    size="small" 
                                    style={{ 
                                      backgroundColor: index < 3 ? colors.primary : '#95a5a6',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      width: '24px',
                                      height: '24px',
                                      lineHeight: '24px'
                                    }}
                                  >
                                    {index + 1}
                                  </Avatar>
                                }
                                title={
                                  <Text style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.name}</Text>
                                }
                                description={
                                  <Space direction="vertical" size={0}>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Sold: 
                                      <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.primary }}>
                                        {item.totalSold} units
                                      </Text>
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Revenue: 
                                      <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.success }}>
                                        {CalculationUtils.formatCurrency(item.totalRevenue)}
                                      </Text>
                                    </Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                          locale={{ emptyText: 'No product sales data' }}
                        />
                      </DeviceAwareCard>

                      {/* Shop Performance */}
                      <DeviceAwareCard
                        title="Shop Performance"
                        extra={<Badge count={dashboardData.shopPerformance.length} showZero color={colors.primary} />}
                      >
                        <List
                          dataSource={dashboardData.shopPerformance}
                          renderItem={(item, index) => (
                            <List.Item style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <List.Item.Meta
                                avatar={
                                  <Avatar 
                                    size="small" 
                                    style={{ 
                                      backgroundColor: index < 3 ? colors.purple : '#bdc3c7',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      width: '24px',
                                      height: '24px',
                                      lineHeight: '24px'
                                    }}
                                  >
                                    {item.name?.charAt(0)?.toUpperCase() || 'S'}
                                  </Avatar>
                                }
                                title={
                                  <Text style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.name}</Text>
                                }
                                description={
                                  <Space direction="vertical" size={0}>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Transactions: 
                                      <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.primary }}>
                                        {item.transactions}
                                      </Text>
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Revenue: 
                                      <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.success }}>
                                        {CalculationUtils.formatCurrency(item.revenue)}
                                      </Text>
                                    </Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                          locale={{ emptyText: 'No shop performance data' }}
                        />
                      </DeviceAwareCard>

                      {/* Cashier Performance */}
                      <DeviceAwareCard
                        title="Cashier Performance"
                        extra={<Badge count={dashboardData.cashierPerformance.length} showZero color={colors.primary} />}
                      >
                        <List
                          dataSource={dashboardData.cashierPerformance}
                          renderItem={(item, index) => (
                            <List.Item style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <List.Item.Meta
                                avatar={
                                  <Avatar 
                                    size="small" 
                                    style={{ 
                                      backgroundColor: index < 3 ? colors.cyan : '#bdc3c7',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      width: '24px',
                                      height: '24px',
                                      lineHeight: '24px'
                                    }}
                                  >
                                    {item.name?.charAt(0)?.toUpperCase() || 'C'}
                                  </Avatar>
                                }
                                title={
                                  <Text style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.name}</Text>
                                }
                                description={
                                  <Space direction="vertical" size={0}>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Transactions: 
                                      <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.primary }}>
                                        {item.transactions}
                                      </Text>
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Revenue: 
                                      <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.success }}>
                                        {CalculationUtils.formatCurrency(item.revenue)}
                                      </Text>
                                    </Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                          locale={{ emptyText: 'No cashier performance data' }}
                        />
                      </DeviceAwareCard>
                    </>
                  )}

                  {mobileView === 'financial' && (
                    <>
                      {/* Payment Composition */}
                      <DeviceAwareCard title="Payment Composition">
                        <Row gutter={[16, 16]}>
                          <Col span={24}>
                            <div style={{ marginBottom: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <Text strong style={{ color: colors.success, fontSize: '13px' }}>
                                  <MoneyCollectOutlined /> Cash
                                </Text>
                                <Text strong style={{ fontSize: '13px' }}>
                                  {dashboardData.financialStats.totalCash > 0 ? 
                                    ((dashboardData.financialStats.totalCash / dashboardData.financialStats.totalRevenue) * 100).toFixed(1) : 0}%
                                </Text>
                              </div>
                              <Progress 
                                percent={dashboardData.financialStats.totalCash > 0 ? 
                                  (dashboardData.financialStats.totalCash / dashboardData.financialStats.totalRevenue) * 100 : 0} 
                                strokeColor={colors.success}
                                strokeWidth={10}
                                showInfo={false}
                                style={{ marginBottom: '16px' }}
                              />
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <Text strong style={{ color: colors.primary, fontSize: '13px' }}>
                                  <BankOutlined /> Digital
                                </Text>
                                <Text strong style={{ fontSize: '13px' }}>
                                  {dashboardData.financialStats.totalMpesaBank > 0 ? 
                                    ((dashboardData.financialStats.totalMpesaBank / dashboardData.financialStats.totalRevenue) * 100).toFixed(1) : 0}%
                                </Text>
                              </div>
                              <Progress 
                                percent={dashboardData.financialStats.totalMpesaBank > 0 ? 
                                  (dashboardData.financialStats.totalMpesaBank / dashboardData.financialStats.totalRevenue) * 100 : 0} 
                                strokeColor={colors.primary}
                                strokeWidth={10}
                                showInfo={false}
                              />
                            </div>
                          </Col>
                        </Row>
                      </DeviceAwareCard>

                      {/* Cost of Goods and Expenses Summary */}
                      <DeviceAwareCard title="Cost Breakdown">
                        <List>
                          <List.Item>
                            <List.Item.Meta
                              title={<Text strong>Cost of Goods Sold</Text>}
                              description="Total cost of products sold"
                            />
                            <Text strong style={{ color: colors.warning, fontSize: '16px' }}>
                              {CalculationUtils.formatCurrency(dashboardData.financialStats.costOfGoodsSold || 0)}
                            </Text>
                          </List.Item>
                          <List.Item>
                            <List.Item.Meta
                              title={<Text strong>Total Expenses</Text>}
                              description="Operational costs"
                            />
                            <Text strong style={{ color: colors.error, fontSize: '16px' }}>
                              {CalculationUtils.formatCurrency(dashboardData.financialStats.totalExpenses || 0)}
                            </Text>
                          </List.Item>
                          <List.Item>
                            <List.Item.Meta
                              title={<Text strong>Gross Profit</Text>}
                              description="Revenue - COGS"
                            />
                            <Text strong style={{ color: colors.success, fontSize: '16px' }}>
                              {CalculationUtils.formatCurrency(dashboardData.financialStats.grossProfit || 0)}
                            </Text>
                          </List.Item>
                        </List>
                      </DeviceAwareCard>
                    </>
                  )}

                  {mobileView === 'transactions' && (
                    <>
                      {/* Recent Transactions */}
                      <DeviceAwareCard
                        title="Recent Transactions"
                        extra={
                          <Space>
                            <Search
                              placeholder="Search..."
                              size="small"
                              style={{ width: 120 }}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              allowClear
                            />
                          </Space>
                        }
                      >
                        <List
                          dataSource={filteredRecentTransactions.slice(0, 5)}
                          renderItem={(transaction) => (
                            <List.Item 
                              style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}
                              onClick={() => handleViewDetails('transaction', transaction)}
                            >
                              <List.Item.Meta
                                avatar={
                                  <Avatar
                                    style={{ 
                                      backgroundColor: transaction.profit > 0 ? colors.success : colors.error
                                    }}
                                  >
                                    {transaction.customerName?.charAt(0) || 'C'}
                                  </Avatar>
                                }
                                title={
                                  <Text style={{ fontSize: '13px', fontWeight: 'bold' }}>
                                    {transaction.customerName || 'Walk-in Customer'}
                                  </Text>
                                }
                                description={
                                  <Space direction="vertical" size={0}>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      {dayjs(transaction.saleDate).format('MMM D, h:mm A')}
                                    </Text>
                                    <Text strong style={{ fontSize: '14px', color: colors.primary }}>
                                      {CalculationUtils.formatCurrency(transaction.totalAmount)}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '10px' }}>
                                      {transaction.shop} • {transaction.paymentMethod?.toUpperCase()}
                                    </Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                          locale={{ emptyText: 'No recent transactions' }}
                        />
                        {dashboardData.recentTransactions.length > 5 && (
                          <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <Button 
                              type="link" 
                              onClick={() => navigate('/admin/transactions')}
                              size="small"
                            >
                              View All Transactions
                            </Button>
                          </div>
                        )}
                      </DeviceAwareCard>

                      {/* Low Stock Products */}
                      <DeviceAwareCard
                        title="Low Stock Products"
                        extra={
                          <Badge 
                            count={dashboardData.lowStockProducts.length} 
                            showZero 
                            style={{ backgroundColor: colors.error }} 
                          />
                        }
                      >
                        <List
                          dataSource={dashboardData.lowStockProducts}
                          renderItem={(product) => (
                            <List.Item style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <List.Item.Meta
                                avatar={
                                  <Avatar
                                    style={{ 
                                      backgroundColor: product.currentStock === 0 ? colors.error : colors.warning
                                    }}
                                  >
                                    {product.name.charAt(0)}
                                  </Avatar>
                                }
                                title={
                                  <Text style={{ fontSize: '13px', fontWeight: 'bold' }}>
                                    {product.name}
                                  </Text>
                                }
                                description={
                                  <Space direction="vertical" size={0}>
                                    <Text strong style={{ 
                                      fontSize: '14px',
                                      color: product.currentStock === 0 ? colors.error : colors.warning
                                    }}>
                                      Stock: {product.currentStock} / {product.minStockLevel || 5}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      {CalculationUtils.formatCurrency(product.minSellingPrice)}
                                    </Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                          locale={{ emptyText: 'All products are well stocked' }}
                        />
                      </DeviceAwareCard>
                    </>
                  )}
                </div>
              ) : (
                /* Desktop/Tablet Layout */
                <>
                  {/* Main Content Grid */}
                  <Row gutter={[12, 12]}>
                    {/* Recent Transactions */}
                    <Col xs={24} lg={12}>
                      <DeviceAwareCard
                        title="Recent Transactions"
                        extra={
                          <Space size="small">
                            <Search
                              placeholder="Search..."
                              size="small"
                              style={{ width: 150 }}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              allowClear
                            />
                            <Button 
                              size="small" 
                              type="primary" 
                              onClick={() => handleViewAll('sales')}
                            >
                              View All
                            </Button>
                          </Space>
                        }
                      >
                        <Table 
                          dataSource={filteredRecentTransactions} 
                          columns={salesColumns} 
                          pagination={{ 
                            pageSize: 5,
                            size: 'small',
                            simple: true,
                            hideOnSinglePage: true
                          }}
                          size="small"
                          scroll={{ x: 600 }}
                          rowKey="_id"
                          locale={{ emptyText: 'No recent transactions' }}
                        />
                      </DeviceAwareCard>
                    </Col>

                    {/* Low Stock Products */}
                    <Col xs={24} lg={12}>
                      <DeviceAwareCard
                        title="Low Stock Products"
                        extra={
                          <Button 
                            size="small" 
                            onClick={() => handleViewAll('inventory')}
                          >
                            Manage
                          </Button>
                        }
                      >
                        <Table 
                          dataSource={dashboardData.lowStockProducts} 
                          columns={lowStockColumns} 
                          pagination={false}
                          size="small"
                          rowKey="_id"
                          locale={{ emptyText: 'All products are well stocked' }}
                        />
                      </DeviceAwareCard>
                    </Col>

                    {/* Top Products */}
                    <Col xs={24} lg={8}>
                      <DeviceAwareCard
                        title="Top Selling Products"
                        extra={<Badge count={dashboardData.topProducts.length} showZero color={colors.purple} />}
                      >
                        <List
                          dataSource={dashboardData.topProducts}
                          renderItem={(item, index) => (
                            <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <List.Item.Meta
                                avatar={
                                  <Avatar 
                                    size="small" 
                                    style={{ 
                                      backgroundColor: index < 3 ? colors.primary : '#95a5a6',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      width: '24px',
                                      height: '24px',
                                      lineHeight: '24px'
                                    }}
                                  >
                                    {index + 1}
                                  </Avatar>
                                }
                                title={
                                  <Text style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.name}</Text>
                                }
                                description={
                                  <Space>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Sold: 
                                      <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.primary }}>
                                        {item.totalSold}
                                      </Text>
                                    </Text>
                                    <Divider type="vertical" />
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Revenue: 
                                      <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.success }}>
                                        {CalculationUtils.formatCurrency(item.totalRevenue)}
                                      </Text>
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

                    {/* Shop Performance */}
                    <Col xs={24} lg={8}>
                      <DeviceAwareCard
                        title="Shop Performance"
                        extra={<Badge count={dashboardData.shopPerformance.length} showZero color={colors.primary} />}
                      >
                        <List
                          dataSource={dashboardData.shopPerformance}
                          renderItem={(item, index) => (
                            <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <List.Item.Meta
                                avatar={
                                  <Avatar 
                                    size="small" 
                                    style={{ 
                                      backgroundColor: index < 3 ? colors.purple : '#bdc3c7',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      width: '24px',
                                      height: '24px',
                                      lineHeight: '24px'
                                    }}
                                  >
                                    {item.name?.charAt(0)?.toUpperCase() || 'S'}
                                  </Avatar>
                                }
                                title={
                                  <Text style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.name}</Text>
                                }
                                description={
                                  <Space>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Transactions: 
                                      <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.primary }}>
                                        {item.transactions}
                                      </Text>
                                    </Text>
                                    <Divider type="vertical" />
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Revenue: 
                                      <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.success }}>
                                        {CalculationUtils.formatCurrency(item.revenue)}
                                      </Text>
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

                    {/* Cashier Performance */}
                    <Col xs={24} lg={8}>
                      <DeviceAwareCard
                        title="Cashier Performance"
                        extra={<Badge count={dashboardData.cashierPerformance.length} showZero color={colors.primary} />}
                      >
                        <List
                          dataSource={dashboardData.cashierPerformance}
                          renderItem={(item, index) => (
                            <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <List.Item.Meta
                                avatar={
                                  <Avatar 
                                    size="small" 
                                    style={{ 
                                      backgroundColor: index < 3 ? colors.cyan : '#bdc3c7',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      width: '24px',
                                      height: '24px',
                                      lineHeight: '24px'
                                    }}
                                  >
                                    {item.name?.charAt(0)?.toUpperCase() || 'C'}
                                  </Avatar>
                                }
                                title={
                                  <Text style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.name}</Text>
                                }
                                description={
                                  <Space>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Transactions: 
                                      <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.primary }}>
                                        {item.transactions}
                                      </Text>
                                    </Text>
                                    <Divider type="vertical" />
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Revenue: 
                                      <Text strong style={{ fontSize: '12px', marginLeft: '4px', color: colors.success }}>
                                        {CalculationUtils.formatCurrency(item.revenue)}
                                      </Text>
                                    </Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                          locale={{ emptyText: 'No cashier performance data' }}
                        />
                      </DeviceAwareCard>
                    </Col>
                  </Row>

                  {/* Quick Actions */}
                  <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
                    <Col span={24}>
                      <DeviceAwareCard title="Quick Actions">
                        <Space wrap>
                          <Button 
                            type="primary" 
                            icon={<BarChartOutlined />}
                            onClick={() => navigate('/admin/transactions')}
                            size="middle"
                          >
                            Full Reports
                          </Button>
                          <Button 
                            icon={<ProductOutlined />}
                            onClick={() => navigate('/admin/products')}
                            size="middle"
                          >
                            Manage Products
                          </Button>
                          <Button 
                            icon={<ShopOutlined />}
                            onClick={() => navigate('/admin/shops')}
                            size="middle"
                          >
                            Manage Shops
                          </Button>
                          <Button 
                            icon={<UserOutlined />}
                            onClick={() => navigate('/admin/cashiers')}
                            size="middle"
                          >
                            Manage Cashiers
                          </Button>
                          <Button 
                            icon={<AppstoreOutlined />}
                            onClick={() => navigate('/admin/inventory')}
                            size="middle"
                          >
                            Check Inventory
                          </Button>
                          <Button 
                            icon={<DollarOutlined />}
                            onClick={() => navigate('/admin/expenses')}
                            size="middle"
                          >
                            Manage Expenses
                          </Button>
                          <Button 
                            icon={<ReloadOutlined />}
                            onClick={handleManualRefresh}
                            size="middle"
                          >
                            Refresh Data
                          </Button>
                        </Space>
                      </DeviceAwareCard>
                    </Col>
                  </Row>
                </>
              )}
            </>
          )}
          
          {location.pathname !== '/admin/dashboard' && <Outlet />}

          {/* View Details Modal */}
          <Modal
            title={viewModalTitle}
            open={viewModalVisible}
            onCancel={() => setViewModalVisible(false)}
            footer={[
              <Button key="close" onClick={() => setViewModalVisible(false)}>
                Close
              </Button>
            ]}
            width={Math.min(700, window.innerWidth * 0.9)}
            style={{ top: 20 }}
            centered={isMobile}
          >
            {viewModalContent && (
              <Descriptions bordered column={isMobile ? 1 : 2} size="small">
                {Object.entries(viewModalContent).map(([key, value]) => {
                  if (key === '_id' || key === '__v') return null;
                  
                  if (key === 'items' && Array.isArray(value)) {
                    return (
                      <Descriptions.Item label="Items" span={2} key={key}>
                        <List
                          size="small"
                          dataSource={value.slice(0, 10)}
                          renderItem={item => (
                            <List.Item>
                              {item.productName} - 
                              <Text strong style={{ margin: '0 4px', fontSize: '13px' }}>{item.quantity}</Text> 
                              x 
                              <Text strong style={{ margin: '0 4px', fontSize: '13px', color: colors.success }}>
                                {CalculationUtils.formatCurrency(item.unitPrice)}
                              </Text> 
                              = 
                              <Text strong style={{ margin: '0 4px', fontSize: '13px', color: colors.primary }}>
                                {CalculationUtils.formatCurrency(item.totalPrice)}
                              </Text>
                            </List.Item>
                          )}
                        />
                        {value.length > 10 && (
                          <Text type="secondary">
                            ... and 
                            <Text strong style={{ margin: '0 4px', fontSize: '13px' }}>
                              {value.length - 10}
                            </Text> 
                            more items
                          </Text>
                        )}
                      </Descriptions.Item>
                    );
                  }
                  
                  if (typeof value === 'object' && value !== null) {
                    return (
                      <Descriptions.Item label={key} span={2} key={key}>
                        <Text code>{JSON.stringify(value, null, 2)}</Text>
                      </Descriptions.Item>
                    );
                  }
                  
                  if (typeof value === 'number' && key.toLowerCase().includes('amount')) {
                    return (
                      <Descriptions.Item label={key} key={key}>
                        <Text strong style={{ fontSize: '14px', color: colors.primary }}>
                          {CalculationUtils.formatCurrency(value)}
                        </Text>
                      </Descriptions.Item>
                    );
                  }
                  
                  if (typeof value === 'string' && key.toLowerCase().includes('date')) {
                    return (
                      <Descriptions.Item label={key} key={key}>
                        {new Date(value).toLocaleString()}
                      </Descriptions.Item>
                    );
                  }
                  
                  if (typeof value === 'number') {
                    return (
                      <Descriptions.Item label={key} key={key}>
                        <Text strong style={{ fontSize: '14px', color: colors.purple }}>
                          {value}
                        </Text>
                      </Descriptions.Item>
                    );
                  }
                  
                  return (
                    <Descriptions.Item label={key} key={key}>
                      {String(value)}
                    </Descriptions.Item>
                  );
                })}
              </Descriptions>
            )}
          </Modal>
        </Content>
      </Layout>

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <FloatButton.Group
          trigger="click"
          type="primary"
          icon={<SettingOutlined />}
          tooltip="Quick Actions"
          style={{ right: 24, bottom: 80 }}
        >
          <FloatButton 
            icon={<ReloadOutlined />}
            onClick={handleManualRefresh}
            tooltip="Refresh Data"
          />
          <FloatButton 
            icon={<ExportOutlined />}
            onClick={handleExportData}
            tooltip="Export Data"
          />
          <FloatButton.BackTop visibilityHeight={0} tooltip="Back to Top" />
        </FloatButton.Group>
      )}
    </Layout>
  );
};

export default AdminDashboard;