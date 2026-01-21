// src/pages/Admin/AdminDashboard.jsx - UPDATED: CREDIT FUNCTIONALITY REMOVED
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layout, Menu, Typography, Card, Row, Col, Table, Tag, Statistic, List, Alert, Spin, 
  Button, Modal, Space, Tooltip, Divider, message, Badge, Avatar, Progress,
  Tabs, Descriptions, Dropdown, Input, Select, DatePicker, Switch
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
  BankOutlined
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  unifiedAPI, 
  shopAPI, 
  reportAPI 
} from '../../services/api';
import { CalculationUtils } from '../../utils/calculationUtils';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// UPDATED: Enhanced Admin Dashboard Component without Credit Integration
const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // UPDATED: Dashboard data without credit-related fields
  const [dashboardData, setDashboardData] = useState({
    financialStats: CalculationUtils.getDefaultStats(), // UPDATED: Use default stats without credit
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
    cashierPerformance: []
  });
  
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewModalContent, setViewModalContent] = useState(null);
  const [viewModalTitle, setViewModalTitle] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataTimestamp, setDataTimestamp] = useState(null);
  const [shops, setShops] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    dateRange: null,
    shop: 'all',
    autoRefresh: false
  });
  const [filterVisible, setFilterVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);
    
    fetchDashboardData();
    
    return () => clearTimeout(timer);
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    let intervalId;
    
    if (filters.autoRefresh) {
      intervalId = setInterval(() => {
        console.log('🔄 Auto-refreshing dashboard data...');
        fetchDashboardData();
      }, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [filters.autoRefresh]);

  // UPDATED: Data fetching without credit integration
  const fetchDashboardData = async (customFilters = null) => {
    const activeFilters = customFilters || filters;
    
    console.log('🚀 Fetching dashboard data without credit...', activeFilters);
    
    try {
      setLoading(true);
      setRefreshing(true);
      
      // Fetch shops first for filtering
      const shopsData = await shopAPI.getAll();
      setShops(shopsData);

      // Build params for unified API (without credit parameters)
      const params = {};
      
      // Apply date range filter
      if (activeFilters.dateRange && activeFilters.dateRange[0] && activeFilters.dateRange[1]) {
        params.startDate = activeFilters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = activeFilters.dateRange[1].format('YYYY-MM-DD');
      }
      
      // Apply shop filter
      if (activeFilters.shop && activeFilters.shop !== 'all') {
        params.shopId = activeFilters.shop;
      }

      // Use unified API endpoint without credit data
      const comprehensiveData = await unifiedAPI.getCombinedTransactions(params);
      
      console.log('📊 Unified API response (no credit):', {
        transactions: comprehensiveData.salesWithProfit?.length,
        financialStats: comprehensiveData.financialStats
      });

      // Process data without credit functionality
      const processedData = processDashboardData(comprehensiveData, shopsData, activeFilters);

      setDashboardData(processedData);
      setDataTimestamp(new Date().toISOString());
      
      console.log('✅ Dashboard data processed (no credit):', {
        totalRevenue: processedData.financialStats.totalRevenue,
        netProfit: processedData.financialStats.netProfit,
        recentTransactions: processedData.recentTransactions.length
      });
      
      message.success(`Dashboard refreshed - ${processedData.financialStats.totalSales} transactions`);
  
    } catch (error) {
      console.error('💥 Dashboard fetch failed:', error);
      await fetchDataWithFallback(activeFilters);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // UPDATED: Fallback without credit structure
  const fetchDataWithFallback = async (activeFilters) => {
    try {
      const shopsData = await shopAPI.getAll();
      setShops(shopsData);

      // Build basic params for fallback
      const params = {};
      if (activeFilters.shop && activeFilters.shop !== 'all') {
        params.shopId = activeFilters.shop;
      }

      const comprehensiveData = await unifiedAPI.getCombinedTransactions(params);
      const processedData = processDashboardData(comprehensiveData, shopsData, activeFilters);

      setDashboardData(processedData);
      setDataTimestamp(new Date().toISOString());
      
    } catch (fallbackError) {
      console.error('💥 Fallback data fetch failed:', fallbackError);
      message.error('Failed to load dashboard data');
      
      // Set empty data structure without credit fields
      setDashboardData({
        financialStats: CalculationUtils.getDefaultStats(), // UPDATED: Use default stats
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
        cashierPerformance: []
      });
    }
  };

  // UPDATED: Dashboard data processing without credit functionality
  const processDashboardData = (comprehensiveData, shops, activeFilters) => {
    console.log('🔄 Processing dashboard data without credit...');
    
    // Process data without credit functionality
    const processedData = CalculationUtils.processComprehensiveData(
      comprehensiveData, 
      activeFilters.shop === 'all' ? null : activeFilters.shop,
      { 
        includePerformance: true,
        includeProducts: true,
        excludeCredit: true // UPDATED: Exclude credit data
      }
    );

    // Extract data from processed structure (without credit)
    const transactions = processedData.salesWithProfit || [];
    const financialStats = processedData.financialStats || CalculationUtils.getDefaultStats();
    const products = processedData.products || [];
    const expenses = processedData.expenses || [];
    const cashiers = processedData.cashiers || [];

    console.log('📈 Processed data extracted (no credit):', {
      transactions: transactions.length,
      products: products.length,
      expenses: expenses.length,
      cashiers: cashiers.length
    });

    // Apply date range filter to transactions if needed
    let filteredTransactions = transactions;
    if (activeFilters.dateRange && activeFilters.dateRange[0] && activeFilters.dateRange[1]) {
      filteredTransactions = CalculationUtils.filterDataByDateRange(
        transactions,
        activeFilters.dateRange[0],
        activeFilters.dateRange[1],
        'saleDate'
      );
    }

    // Recent transactions (last 10)
    const recentTransactions = filteredTransactions
      .sort((a, b) => new Date(b.saleDate || b.createdAt) - new Date(a.saleDate || a.createdAt))
      .slice(0, 10);

    // Low stock products
    const lowStockProducts = products.filter(p => 
      CalculationUtils.safeNumber(p.currentStock) <= CalculationUtils.safeNumber(p.minStockLevel, 5)
    ).slice(0, 5);

    // Top products using same calculation
    const topProducts = CalculationUtils.calculateTopProducts(filteredTransactions, 5);

    // Shop performance
    const shopPerformance = CalculationUtils.calculateShopPerformance(filteredTransactions, shops);

    // Cashier performance
    const cashierPerformance = CalculationUtils.calculateCashierPerformance(filteredTransactions, cashiers);

    // UPDATED: Enhanced COGS CALCULATION without credit
    const costOfGoodsSold = financialStats.costOfGoodsSold || 
                           filteredTransactions.reduce((sum, t) => {
                             // Calculate from transaction cost or items
                             if (t.cost) {
                               return sum + CalculationUtils.safeNumber(t.cost);
                             }
                             
                             // Calculate from items as fallback using the utility function
                             return sum + CalculationUtils.calculateCostFromItems(t);
                           }, 0);

    // Enhanced financial stats without credit fields
    const enhancedFinancialStats = {
      ...financialStats,
      // Ensure all required fields are present (without credit)
      totalRevenue: financialStats.totalRevenue || 0,
      netProfit: financialStats.netProfit || 0,
      totalSales: financialStats.totalSales || filteredTransactions.length,
      totalExpenses: financialStats.totalExpenses || expenses.reduce((sum, e) => sum + CalculationUtils.safeNumber(e.amount), 0),
      
      // Use the enhanced COGS calculation
      costOfGoodsSold: parseFloat(costOfGoodsSold.toFixed(2)),
      
      // Recalculate gross profit and profit margin with accurate COGS
      grossProfit: financialStats.grossProfit || parseFloat((enhancedFinancialStats.totalRevenue - costOfGoodsSold).toFixed(2)),
      profitMargin: financialStats.profitMargin || CalculationUtils.calculateProfitMargin(enhancedFinancialStats.totalRevenue, enhancedFinancialStats.grossProfit),
      
      // UPDATED: Payment breakdown without credit
      totalCash: financialStats.totalCash || filteredTransactions.reduce((sum, t) => {
        if (t.paymentMethod === 'cash' || (t.paymentSplit && t.paymentSplit.cash)) {
          return sum + CalculationUtils.safeNumber(t.paymentSplit?.cash || t.totalAmount);
        }
        return sum;
      }, 0),
      
      totalMpesaBank: financialStats.totalMpesaBank || filteredTransactions.reduce((sum, t) => {
        if (['mpesa', 'bank', 'bank_mpesa'].includes(t.paymentMethod) || (t.paymentSplit && t.paymentSplit.bank_mpesa)) {
          return sum + CalculationUtils.safeNumber(t.paymentSplit?.bank_mpesa || t.totalAmount);
        }
        return sum;
      }, 0)
    };

    // Recalculate net profit with accurate expenses and COGS
    if (!financialStats.netProfit) {
      enhancedFinancialStats.netProfit = parseFloat((enhancedFinancialStats.grossProfit - enhancedFinancialStats.totalExpenses).toFixed(2));
    }

    // Business stats without credit
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
      timestamp: new Date().toISOString(),
      appliedFilters: activeFilters,
      dataSources: {
        transactions: filteredTransactions.length,
        products: products.length,
        expenses: expenses.length,
        shops: shops.length,
        cashiers: cashiers.length
      }
    };
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Auto-refresh when filters change
    fetchDashboardData(newFilters);
  };

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters = {
      dateRange: null,
      shop: 'all',
      autoRefresh: filters.autoRefresh // Keep auto-refresh setting
    };
    setFilters(clearedFilters);
    fetchDashboardData(clearedFilters);
  };

  // Quick refresh function
  const quickRefresh = async () => {
    setRefreshing(true);
    try {
      const params = {};
      if (filters.shop && filters.shop !== 'all') {
        params.shopId = filters.shop;
      }

      const comprehensiveData = await unifiedAPI.getCombinedTransactions(params);
      const shopsData = await shopAPI.getAll();
      const processedData = processDashboardData(comprehensiveData, shopsData, filters);
      
      setDashboardData(processedData);
      setDataTimestamp(new Date().toISOString());
      message.success('Quick refresh completed');
    } catch (error) {
      console.error('Quick refresh failed:', error);
      message.error('Quick refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshData = () => {
    fetchDashboardData();
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const exportData = {
        timestamp: dataTimestamp,
        filters: filters,
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

      message.success('Data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Failed to export data');
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
      onOk: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        navigate('/login');
        message.success('Logged out successfully');
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

  // UPDATED: Sales Columns without credit functionality
  const salesColumns = [
    {
      title: <Text strong style={{ fontSize: '11px' }}>Transaction ID</Text>,
      dataIndex: '_id',
      key: 'transactionId',
      render: (id, record) => (
        <Tooltip title={id}>
          <Text code style={{ fontSize: '10px' }}>
            {record.transactionNumber || (id ? `${id.substring(0, 8)}...` : 'N/A')}
          </Text>
        </Tooltip>
      ),
      width: 100
    },
    {
      title: <Text strong style={{ fontSize: '11px' }}>Date</Text>,
      dataIndex: 'saleDate',
      key: 'saleDate',
      render: (date) => (
        <Text style={{ fontSize: '10px' }}>
          {date ? new Date(date).toLocaleDateString('en-KE') : 'N/A'}
        </Text>
      ),
      width: 90
    },
    {
      title: <Text strong style={{ fontSize: '11px' }}>Customer</Text>,
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name) => <Text style={{ fontSize: '10px' }}>{name || 'Walk-in'}</Text>,
      width: 100
    },
    {
      title: <Text strong style={{ fontSize: '11px' }}>Amount</Text>,
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => (
        <Text strong style={{ 
          fontSize: '16px', 
          color: '#1890ff',
          fontWeight: 'bold'
        }}>
          {CalculationUtils.formatCurrency(amount)}
        </Text>
      ),
      width: 100
    },
    {
      title: <Text strong style={{ fontSize: '11px' }}>Profit</Text>,
      dataIndex: 'profit',
      key: 'profit',
      render: (profit) => (
        <Text 
          strong 
          style={{ 
            fontSize: '16px',
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
      title: <Text strong style={{ fontSize: '11px' }}>Shop</Text>,
      dataIndex: 'shop',
      key: 'shop',
      render: (text) => <Tag color="blue" style={{ fontSize: '10px' }}>{text || 'Unknown Shop'}</Tag>,
      width: 80
    },
    {
      title: <Text strong style={{ fontSize: '11px' }}>Payment</Text>,
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method) => {
        const methodColors = {
          cash: 'green',
          bank_mpesa: 'blue',
          mpesa: 'geekblue',
          bank: 'purple'
        };
        
        return (
          <Tag 
            color={methodColors[method] || 'default'}
            style={{ fontSize: '10px' }}
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
      title: <Text strong style={{ fontSize: '11px' }}>Product</Text>,
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <ProductOutlined />
          <Text style={{ fontSize: '11px' }}>{text}</Text>
          {record.currentStock === 0 && <Tag color="red" style={{ fontSize: '9px' }}>OUT</Tag>}
        </Space>
      )
    },
    {
      title: <Text strong style={{ fontSize: '11px' }}>Stock</Text>,
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (stock, record) => (
        <Text 
          strong 
          style={{ 
            fontSize: '24px',
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
      title: <Text strong style={{ fontSize: '11px' }}>Min</Text>,
      dataIndex: 'minStockLevel',
      key: 'minStockLevel',
      render: (min) => (
        <Text strong style={{ fontSize: '16px', fontWeight: 'bold', color: '#722ed1' }}>
          {min}
        </Text>
      ),
      width: 60
    },
    {
      title: <Text strong style={{ fontSize: '11px' }}>Price</Text>,
      dataIndex: 'sellingPrice',
      key: 'sellingPrice',
      render: (price) => (
        <Text strong style={{ fontSize: '14px', fontWeight: 'bold', color: '#2ecc71' }}>
          {CalculationUtils.formatCurrency(price)}
        </Text>
      ),
      width: 100
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        breakpoint="xs"
        collapsedWidth="60"
        style={{ 
          background: 'linear-gradient(180deg, #2c3e50 0%, #3498db 100%)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)'
        }}
      >
        <div className="logo" style={{ padding: '16px 0', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Title level={4} style={{ color: 'white', margin: 0, fontWeight: 'bold', fontSize: collapsed ? '14px' : '18px' }}>
            {collapsed ? 'TP' : 'Demo Shop'}
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
          {/* UPDATED: Credits menu item removed */}
        </Menu>
      </Sider>

      <Layout className="site-layout">
        <Header className="site-layout-header" style={{ 
          background: 'linear-gradient(90deg, #3498db 0%, #2980b9 100%)',
          padding: '0 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          height: '60px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Title level={5} style={{ color: 'white', margin: 0, fontWeight: 'bold' }}>
              Admin Dashboard
            </Title>
            <Space size="small" wrap>
              {/* Auto-refresh toggle */}
              <Tooltip title={filters.autoRefresh ? "Auto-refresh ON (30s)" : "Auto-refresh OFF"}>
                <Button 
                  type={filters.autoRefresh ? "primary" : "default"}
                  icon={<ReloadOutlined spin={filters.autoRefresh} />}
                  onClick={() => handleFilterChange('autoRefresh', !filters.autoRefresh)}
                  size="small"
                  style={{ background: filters.autoRefresh ? '#52c41a' : '#f0f0f0' }}
                />
              </Tooltip>
              
              <Button 
                icon={<ReloadOutlined spin={refreshing} />} 
                onClick={quickRefresh}
                disabled={refreshing}
                size="small"
                type="primary"
              />
              
              {/* Filter button */}
              <Button 
                icon={<FilterOutlined />}
                onClick={() => setFilterVisible(!filterVisible)}
                size="small"
                type="default"
              />
              
              <Button 
                icon={<ExportOutlined />} 
                onClick={handleExportData}
                loading={exportLoading}
                size="small"
                type="default"
              />
              
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
              >
                <Button type="text" style={{ color: 'white', fontWeight: 'bold' }} size="small">
                  <Space>
                    <UserOutlined />
                    {window.innerWidth > 768 && 'Admin'}
                  </Space>
                </Button>
              </Dropdown>
              
              <Button 
                type="primary" 
                danger 
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                size="small"
              />
            </Space>
          </div>
        </Header>
        
        <Content style={{ 
          margin: '8px', 
          padding: '12px', 
          background: '#f5f7fa',
          overflow: 'auto'
        }}>
          {showWelcome && location.pathname === '/admin/dashboard' && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '60vh',
              fontSize: window.innerWidth < 768 ? '1.5rem' : '2.5rem',
              fontWeight: 'bold',
              color: '#3498db',
              animation: 'fadeIn 1s',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center',
              padding: '16px'
            }}>
              WELCOME TO THE Demo Shop ADMIN DASHBOARD
            </div>
          )}
          
          {!showWelcome && location.pathname === '/admin/dashboard' && (
            <>
              {/* Filter Panel */}
              {filterVisible && (
                <Card 
                  size="small" 
                  style={{ marginBottom: 12, border: '1px solid #e8e8e8', borderRadius: '8px' }}
                  title={
                    <Space>
                      <FilterOutlined style={{ color: '#3498db' }} />
                      <Text strong style={{ fontSize: '14px' }}>Dashboard Filters</Text>
                    </Space>
                  }
                  extra={
                    <Button size="small" onClick={handleClearFilters}>
                      Clear
                    </Button>
                  }
                >
                  <Row gutter={[8, 8]} align="middle">
                    <Col xs={24} sm={12} md={8}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: '12px' }}>Date Range</Text>
                        <RangePicker
                          style={{ width: '100%' }}
                          value={filters.dateRange}
                          onChange={(dates) => handleFilterChange('dateRange', dates)}
                          format="YYYY-MM-DD"
                          size="small"
                        />
                      </Space>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: '12px' }}>Shop</Text>
                        <Select
                          style={{ width: '100%' }}
                          value={filters.shop}
                          onChange={(value) => handleFilterChange('shop', value)}
                          placeholder="Select Shop"
                          size="small"
                        >
                          <Option value="all">All Shops</Option>
                          {shops.map(shop => (
                            <Option key={shop._id} value={shop._id}>
                              {shop.name}
                            </Option>
                          ))}
                        </Select>
                      </Space>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: '12px' }}>Auto Refresh</Text>
                        <div>
                          <Switch
                            checked={filters.autoRefresh}
                            onChange={(checked) => handleFilterChange('autoRefresh', checked)}
                            checkedChildren="ON"
                            unCheckedChildren="OFF"
                            size="small"
                          />
                          <Text type="secondary" style={{ marginLeft: 8, fontSize: '10px' }}>
                            Every 30s
                          </Text>
                        </div>
                      </Space>
                    </Col>
                  </Row>
                </Card>
              )}

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 16, fontSize: '14px' }}>Loading dashboard data...</div>
                </div>
              ) : (
                <>
                  {/* Data Timestamp and Active Filters */}
                  <Row style={{ marginBottom: 12 }} justify="space-between" align="middle">
                    <Col>
                      {dataTimestamp && (
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          Last updated: {new Date(dataTimestamp).toLocaleString()}
                          {filters.autoRefresh && (
                            <Tag color="green" style={{ marginLeft: 8, fontSize: '10px' }}>Auto ON</Tag>
                          )}
                        </Text>
                      )}
                    </Col>
                    <Col>
                      {(filters.dateRange || filters.shop !== 'all') && (
                        <Space size="small">
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            Active filters:
                          </Text>
                          {filters.dateRange && (
                            <Tag color="blue" style={{ fontSize: '10px' }}>
                              {filters.dateRange[0].format('MM-DD')} - {filters.dateRange[1].format('MM-DD')}
                            </Tag>
                          )}
                          {filters.shop !== 'all' && (
                            <Tag color="green" style={{ fontSize: '10px' }}>
                              {shops.find(s => s._id === filters.shop)?.name || filters.shop}
                            </Tag>
                          )}
                        </Space>
                      )}
                    </Col>
                  </Row>

                  {/* UPDATED: Enhanced Financial Overview without Credit */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col span={24}>
                      <Card 
                        title={
                          <Space>
                            <LineChartOutlined style={{ color: '#3498db', fontSize: '16px' }} />
                            <Text strong style={{ fontSize: '14px', color: '#2c3e50' }}>Financial Overview</Text>
                            {filters.dateRange && (
                              <Text type="secondary" style={{ fontSize: '10px', marginLeft: 4 }}>
                                ({filters.dateRange[0].format('MM-DD')} - {filters.dateRange[1].format('MM-DD')})
                              </Text>
                            )}
                          </Space>
                        }
                        style={{ 
                          borderRadius: '10px',
                          boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                          border: 'none'
                        }}
                        bodyStyle={{ padding: '12px' }}
                      >
                        <Row gutter={[12, 12]}>
                          {/* Core Revenue Metrics */}
                          <Col xs={12} sm={12} md={6} lg={3}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: '6px',
                                height: '100%'
                              }}
                              bodyStyle={{ padding: '8px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ 
                                    color: 'white', 
                                    fontSize: window.innerWidth < 768 ? '11px' : '15px',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px',
                                    lineHeight: '1.4'
                                  }}>
                                    Total Revenue
                                  </Text>
                                }
                                value={dashboardData.financialStats.totalRevenue} 
                                prefix="KES" 
                                precision={0}
                                valueStyle={{ 
                                  color: 'white', 
                                  fontSize: window.innerWidth < 768 ? '18px' : '24px',
                                  fontWeight: 'bold',
                                  lineHeight: '1.2'
                                }}
                              />
                            </Card>
                          </Col>
                          
                          <Col xs={12} sm={12} md={6} lg={3}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                border: 'none',
                                borderRadius: '6px',
                                height: '100%'
                              }}
                              bodyStyle={{ padding: '8px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ 
                                    color: 'white', 
                                    fontSize: window.innerWidth < 768 ? '11px' : '15px',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px',
                                    lineHeight: '1.4'
                                  }}>
                                    Total Sales
                                  </Text>
                                }
                                value={dashboardData.financialStats.totalSales} 
                                precision={0}
                                valueStyle={{ 
                                  color: 'white', 
                                  fontSize: window.innerWidth < 768 ? '18px' : '24px',
                                  fontWeight: 'bold',
                                  lineHeight: '1.2'
                                }}
                              />
                            </Card>
                          </Col>

                          {/* Expense Metrics */}
                          <Col xs={12} sm={12} md={6} lg={3}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                border: 'none',
                                borderRadius: '6px',
                                height: '100%'
                              }}
                              bodyStyle={{ padding: '8px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ 
                                    color: 'white', 
                                    fontSize: window.innerWidth < 768 ? '11px' : '15px',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px',
                                    lineHeight: '1.4'
                                  }}>
                                    Total Expenses
                                  </Text>
                                }
                                value={dashboardData.financialStats.totalExpenses} 
                                prefix="KES" 
                                precision={0}
                                valueStyle={{ 
                                  color: 'white', 
                                  fontSize: window.innerWidth < 768 ? '18px' : '24px',
                                  fontWeight: 'bold',
                                  lineHeight: '1.2'
                                }}
                              />
                            </Card>
                          </Col>

                          <Col xs={12} sm={12} md={6} lg={3}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                border: 'none',
                                borderRadius: '6px',
                                height: '100%'
                              }}
                              bodyStyle={{ padding: '8px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ 
                                    color: 'white', 
                                    fontSize: window.innerWidth < 768 ? '11px' : '15px',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px',
                                    lineHeight: '1.4'
                                  }}>
                                    Net Profit
                                  </Text>
                                }
                                value={dashboardData.financialStats.netProfit} 
                                prefix="KES" 
                                precision={0}
                                valueStyle={{ 
                                  color: 'white', 
                                  fontSize: window.innerWidth < 768 ? '18px' : '24px',
                                  fontWeight: 'bold',
                                  lineHeight: '1.2'
                                }}
                              />
                            </Card>
                          </Col>

                          {/* Cost of Goods Sold */}
                          <Col xs={12} sm={12} md={6} lg={3}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                                border: 'none',
                                borderRadius: '6px',
                                height: '100%'
                              }}
                              bodyStyle={{ padding: '8px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ 
                                    color: 'white', 
                                    fontSize: window.innerWidth < 768 ? '11px' : '15px',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px',
                                    lineHeight: '1.4'
                                  }}>
                                    Cost of Goods Sold
                                  </Text>
                                }
                                value={dashboardData.financialStats.costOfGoodsSold} 
                                prefix="KES" 
                                precision={0}
                                valueStyle={{ 
                                  color: 'white', 
                                  fontSize: window.innerWidth < 768 ? '18px' : '24px',
                                  fontWeight: 'bold',
                                  lineHeight: '1.2'
                                }}
                              />
                            </Card>
                          </Col>

                          {/* UPDATED: Bank/Mpesa Payment (removed credit sales) */}
                          <Col xs={12} sm={12} md={6} lg={3}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                                border: 'none',
                                borderRadius: '6px',
                                height: '100%'
                              }}
                              bodyStyle={{ padding: '8px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ 
                                    color: '#2c3e50', 
                                    fontSize: window.innerWidth < 768 ? '11px' : '15px',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px',
                                    lineHeight: '1.4'
                                  }}>
                                    Bank/Mpesa Payment
                                  </Text>
                                }
                                value={dashboardData.financialStats.totalMpesaBank} 
                                prefix="KES" 
                                precision={0}
                                valueStyle={{ 
                                  color: '#2c3e50', 
                                  fontSize: window.innerWidth < 768 ? '18px' : '24px',
                                  fontWeight: 'bold',
                                  lineHeight: '1.2'
                                }}
                              />
                            </Card>
                          </Col>

                          <Col xs={12} sm={12} md={6} lg={3}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
                                border: 'none',
                                borderRadius: '6px',
                                height: '100%'
                              }}
                              bodyStyle={{ padding: '8px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ 
                                    color: '#2c3e50', 
                                    fontSize: window.innerWidth < 768 ? '11px' : '15px',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px',
                                    lineHeight: '1.4'
                                  }}>
                                    Cash Payments
                                  </Text>
                                }
                                value={dashboardData.financialStats.totalCash} 
                                prefix="KES" 
                                precision={0}
                                valueStyle={{ 
                                  color: '#2c3e50', 
                                  fontSize: window.innerWidth < 768 ? '18px' : '24px',
                                  fontWeight: 'bold',
                                  lineHeight: '1.2'
                                }}
                              />
                            </Card>
                          </Col>
                          
                          {/* UPDATED: Items Sold (replaced credit sales) */}
                          <Col xs={12} sm={12} md={6} lg={3}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                                border: 'none',
                                borderRadius: '6px',
                                height: '100%'
                              }}
                              bodyStyle={{ padding: '8px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ 
                                    color: '#2c3e50', 
                                    fontSize: window.innerWidth < 768 ? '11px' : '15px',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px',
                                    lineHeight: '1.4'
                                  }}>
                                    Items Sold
                                  </Text>
                                }
                                value={dashboardData.financialStats.totalItemsSold || 0} 
                                precision={0}
                                valueStyle={{ 
                                  color: '#2c3e50', 
                                  fontSize: window.innerWidth < 768 ? '18px' : '24px',
                                  fontWeight: 'bold',
                                  lineHeight: '1.2'
                                }}
                              />
                            </Card>
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  </Row>

                  {/* UPDATED: Business Overview without Active Credits */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col span={24}>
                      <Card 
                        title={
                          <Space>
                            <AppstoreOutlined style={{ color: '#9b59b6', fontSize: '14px' }} />
                            <Text strong style={{ fontSize: '14px' }}>Business Overview</Text>
                          </Space>
                        }
                        style={{ 
                          borderRadius: '10px', 
                          boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                          border: 'none'
                        }}
                        bodyStyle={{ padding: '12px' }}
                      >
                        <Row gutter={[12, 12]}>
                          <Col xs={12} sm={12} md={6} lg={3}>
                            <Card size="small" style={{ background: '#ebf5fb', border: 'none', borderRadius: '6px' }}>
                              <Statistic 
                                title={
                                  <Text style={{ 
                                    fontSize: window.innerWidth < 768 ? '11px' : '15px',
                                    color: '#3498db',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px'
                                  }}>
                                    Total Products
                                  </Text>
                                } 
                                value={dashboardData.businessStats.totalProducts} 
                                valueStyle={{ 
                                  color: '#3498db', 
                                  fontSize: window.innerWidth < 768 ? '18px' : '24px',
                                  fontWeight: 'bold',
                                  lineHeight: '1.2'
                                }}
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={12} md={6} lg={3}>
                            <Card size="small" style={{ background: '#e8f6f3', border: 'none', borderRadius: '6px' }}>
                              <Statistic 
                                title={
                                  <Text style={{ 
                                    fontSize: window.innerWidth < 768 ? '11px' : '15px',
                                    color: '#2ecc71',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px'
                                  }}>
                                    Total Shops
                                  </Text>
                                } 
                                value={dashboardData.businessStats.totalShops} 
                                valueStyle={{ 
                                  color: '#2ecc71', 
                                  fontSize: window.innerWidth < 768 ? '18px' : '24px',
                                  fontWeight: 'bold',
                                  lineHeight: '1.2'
                                }}
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={12} md={6} lg={3}>
                            <Card size="small" style={{ background: '#f4ecf7', border: 'none', borderRadius: '6px' }}>
                              <Statistic 
                                title={
                                  <Text style={{ 
                                    fontSize: window.innerWidth < 768 ? '11px' : '15px',
                                    color: '#9b59b6',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px'
                                  }}>
                                    Total Cashiers
                                  </Text>
                                } 
                                value={dashboardData.businessStats.totalCashiers} 
                                valueStyle={{ 
                                  color: '#9b59b6', 
                                  fontSize: window.innerWidth < 768 ? '18px' : '24px',
                                  fontWeight: 'bold',
                                  lineHeight: '1.2'
                                }}
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={12} md={6} lg={3}>
                            <Card size="small" style={{ 
                              background: dashboardData.businessStats.lowStockCount > 0 ? '#fbebea' : '#eafaf1', 
                              border: 'none', 
                              borderRadius: '6px' 
                            }}>
                              <Statistic 
                                title={
                                  <Text style={{ 
                                    fontSize: window.innerWidth < 768 ? '11px' : '15px',
                                    color: dashboardData.businessStats.lowStockCount > 0 ? '#e74c3c' : '#27ae60',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px'
                                  }}>
                                    Low Stock
                                  </Text>
                                } 
                                value={dashboardData.businessStats.lowStockCount} 
                                valueStyle={{ 
                                  color: dashboardData.businessStats.lowStockCount > 0 ? '#e74c3c' : '#27ae60',
                                  fontSize: window.innerWidth < 768 ? '18px' : '24px',
                                  fontWeight: 'bold',
                                  lineHeight: '1.2'
                                }}
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={12} md={6} lg={3}>
                            <Card size="small" style={{ background: '#e8f8f8', border: 'none', borderRadius: '6px' }}>
                              <Statistic 
                                title={
                                  <Text style={{ 
                                    fontSize: window.innerWidth < 768 ? '11px' : '15px',
                                    color: '#1abc9c',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px'
                                  }}>
                                    Items Sold
                                  </Text>
                                } 
                                value={dashboardData.financialStats.totalItemsSold || 0} 
                                valueStyle={{ 
                                  color: '#1abc9c', 
                                  fontSize: window.innerWidth < 768 ? '18px' : '24px',
                                  fontWeight: 'bold',
                                  lineHeight: '1.2'
                                }}
                              />
                            </Card>
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  </Row>

                  {/* UPDATED: Alerts Section without Credit Alerts */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col span={24}>
                      {dashboardData.businessStats.lowStockCount > 0 && (
                        <Alert
                          message={
                            <Text style={{ fontSize: '12px', fontWeight: '500' }}>
                              <Text strong style={{ fontSize: '20px', color: '#e74c3c', marginRight: '8px' }}>
                                {dashboardData.businessStats.lowStockCount}
                              </Text>
                              products are low on stock
                            </Text>
                          }
                          description={
                            <Text style={{ fontSize: '11px' }}>
                              {/* Some products need to be reordered to avoid stockouts. */}
                            </Text>
                          }
                          type="warning"
                          showIcon
                          icon={<WarningOutlined />}
                          action={
                            <Button size="small" type="primary" onClick={() => handleViewAll('inventory')}>
                              View
                            </Button>
                          }
                          style={{ marginBottom: 8, borderRadius: '6px' }}
                        />
                      )}
                    </Col>
                  </Row>

                  {/* Main Content Grid */}
                  <Row gutter={[12, 12]}>
                    {/* Recent Transactions */}
                    <Col xs={24} lg={12}>
                      <Card 
                        title={
                          <Space>
                            <ShoppingCartOutlined style={{ color: '#3498db', fontSize: '14px' }} />
                            <Text strong style={{ fontSize: '14px' }}>Recent Transactions</Text>
                            <Badge 
                              count={dashboardData.recentTransactions.length} 
                              showZero 
                              size="small" 
                              style={{ fontSize: '10px', fontWeight: 'bold' }}
                            />
                          </Space>
                        }
                        extra={
                          <Space size="small">
                            <Search
                              placeholder="Search..."
                              size="small"
                              style={{ width: 120 }}
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
                        style={{ 
                          borderRadius: '10px', 
                          boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                          border: 'none'
                        }}
                        bodyStyle={{ padding: '12px' }}
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
                      </Card>
                    </Col>

                    {/* Low Stock Products */}
                    <Col xs={24} lg={12}>
                      <Card 
                        title={
                          <Space>
                            <WarningOutlined style={{ color: '#e74c3c', fontSize: '14px' }} />
                            <Text strong style={{ fontSize: '14px' }}>Low Stock Products</Text>
                            <Badge 
                              count={dashboardData.lowStockProducts.length} 
                              showZero 
                              size="small"
                              style={{ 
                                backgroundColor: '#e74c3c',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }} 
                            />
                          </Space>
                        }
                        extra={
                          <Button 
                            size="small" 
                            onClick={() => handleViewAll('inventory')}
                          >
                            Manage
                          </Button>
                        }
                        style={{ 
                          borderRadius: '10px', 
                          boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                          border: 'none'
                        }}
                        bodyStyle={{ padding: '12px' }}
                      >
                        <Table 
                          dataSource={dashboardData.lowStockProducts} 
                          columns={lowStockColumns} 
                          pagination={false}
                          size="small"
                          rowKey="_id"
                          locale={{ emptyText: 'All products are well stocked' }}
                        />
                      </Card>
                    </Col>

                    {/* Top Products */}
                    <Col xs={24} lg={12}>
                      <Card 
                        title={
                          <Space>
                            <ProductOutlined style={{ color: '#2ecc71', fontSize: '14px' }} />
                            <Text strong style={{ fontSize: '14px' }}>Top Selling Products</Text>
                          </Space>
                        }
                        style={{ 
                          borderRadius: '10px', 
                          boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                          border: 'none'
                        }}
                        bodyStyle={{ padding: '12px' }}
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
                                      backgroundColor: index < 3 ? '#3498db' : '#95a5a6',
                                      fontSize: '10px',
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
                                  <Text style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.name}</Text>
                                }
                                description={
                                  <Space direction="vertical" size={0}>
                                    <Text type="secondary" style={{ fontSize: '10px' }}>
                                      Sold: 
                                      <Text strong style={{ fontSize: '16px', marginLeft: '4px', color: '#1890ff' }}>
                                        {item.totalSold} units
                                      </Text>
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '10px' }}>
                                      Revenue: 
                                      <Text strong style={{ fontSize: '14px', marginLeft: '4px', color: '#52c41a' }}>
                                        {CalculationUtils.formatCurrency(item.totalRevenue)}
                                      </Text>
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '10px' }}>
                                      Profit: 
                                      <Text strong style={{ 
                                        fontSize: '14px', 
                                        marginLeft: '4px', 
                                        color: CalculationUtils.getProfitColor(item.totalProfit),
                                        fontWeight: 'bold'
                                      }}>
                                        {CalculationUtils.formatCurrency(item.totalProfit)}
                                      </Text>
                                    </Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                          locale={{ emptyText: 'No product sales data' }}
                        />
                      </Card>
                    </Col>

                    {/* Shop Performance */}
                    <Col xs={24} lg={12}>
                      <Card 
                        title={
                          <Space>
                            <ShopOutlined style={{ color: '#9b59b6', fontSize: '14px' }} />
                            <Text strong style={{ fontSize: '14px' }}>Shop Performance</Text>
                          </Space>
                        }
                        style={{ 
                          borderRadius: '10px', 
                          boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                          border: 'none'
                        }}
                        bodyStyle={{ padding: '12px' }}
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
                                      backgroundColor: index < 3 ? '#9b59b6' : '#bdc3c7',
                                      fontSize: '10px',
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
                                  <Text style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.name}</Text>
                                }
                                description={
                                  <Space direction="vertical" size={0}>
                                    <Text type="secondary" style={{ fontSize: '10px' }}>
                                      Transactions: 
                                      <Text strong style={{ fontSize: '16px', marginLeft: '4px', color: '#3498db' }}>
                                        {item.transactions}
                                      </Text>
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '10px' }}>
                                      Revenue: 
                                      <Text strong style={{ fontSize: '14px', marginLeft: '4px', color: '#2ecc71' }}>
                                        {CalculationUtils.formatCurrency(item.revenue)}
                                      </Text>
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '10px' }}>
                                      Profit: 
                                      <Text strong style={{ 
                                        fontSize: '14px', 
                                        marginLeft: '4px', 
                                        color: CalculationUtils.getProfitColor(item.profit),
                                        fontWeight: 'bold'
                                      }}>
                                        {CalculationUtils.formatCurrency(item.profit)}
                                      </Text>
                                    </Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                          locale={{ emptyText: 'No shop performance data' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* UPDATED: Quick Actions without Manage Credits */}
                  <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
                    <Col span={24}>
                      <Card 
                        title={
                          <Text strong style={{ fontSize: '14px' }}>Quick Actions</Text>
                        } 
                        style={{ 
                          borderRadius: '10px', 
                          boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                          border: 'none'
                        }}
                        bodyStyle={{ padding: '12px' }}
                      >
                        <Space wrap>
                          <Button 
                            type="primary" 
                            icon={<BarChartOutlined />}
                            onClick={() => handleViewAll('sales')}
                            size="middle"
                          >
                            Full Reports
                          </Button>
                          <Button 
                            icon={<ProductOutlined />}
                            onClick={() => handleViewAll('products')}
                            size="middle"
                          >
                            Manage Products
                          </Button>
                          <Button 
                            icon={<AppstoreOutlined />}
                            onClick={() => handleViewAll('inventory')}
                            size="middle"
                          >
                            Check Inventory
                          </Button>
                          <Button 
                            icon={<DollarOutlined />}
                            onClick={() => handleViewAll('expenses')}
                            size="middle"
                          >
                            Manage Expenses
                          </Button>
                          <Button 
                            icon={<ReloadOutlined />}
                            onClick={handleRefreshData}
                            size="middle"
                          >
                            Full Refresh
                          </Button>
                        </Space>
                      </Card>
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
          >
            {viewModalContent && (
              <Descriptions bordered column={2} size="small">
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
                              <Text strong style={{ margin: '0 4px', fontSize: '14px' }}>{item.quantity}</Text> 
                              x 
                              <Text strong style={{ margin: '0 4px', fontSize: '14px', color: '#52c41a' }}>
                                {CalculationUtils.formatCurrency(item.unitPrice)}
                              </Text> 
                              = 
                              <Text strong style={{ margin: '0 4px', fontSize: '16px', color: '#1890ff' }}>
                                {CalculationUtils.formatCurrency(item.totalPrice)}
                              </Text>
                              {item.buyingPrice && (
                                <Text type="secondary" style={{ marginLeft: 8, fontSize: '11px' }}>
                                  (COGS: 
                                  <Text strong style={{ marginLeft: '4px', fontSize: '12px' }}>
                                    {CalculationUtils.formatCurrency(item.buyingPrice)}
                                  </Text> 
                                  each)
                                </Text>
                              )}
                            </List.Item>
                          )}
                        />
                        {value.length > 10 && (
                          <Text type="secondary">
                            ... and 
                            <Text strong style={{ margin: '0 4px', fontSize: '14px' }}>
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
                        <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
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
                        <Text strong style={{ fontSize: '16px', color: '#722ed1' }}>
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
    </Layout>
  );
};

export default AdminDashboard;