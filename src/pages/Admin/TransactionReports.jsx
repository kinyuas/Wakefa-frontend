// src/pages/Admin/TransactionReports.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Card,
  Typography,
  Input,
  Button,
  DatePicker,
  Statistic,
  Row,
  Col,
  Alert,
  Space,
  Tag,
  Modal,
  message,
  Select,
  Spin,
  Tooltip,
  Tabs,
  Empty,
  List,
  Avatar,
  Progress,
  Badge,
  Descriptions,
  Grid
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  DollarOutlined,
  UserOutlined,
  ShopOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  PieChartOutlined,
  TableOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  FilterOutlined,
  ReloadOutlined,
  BarChartOutlined,
  MobileOutlined
} from '@ant-design/icons';
import { unifiedAPI, shopAPI } from '../../services/api';
import { CalculationUtils } from '../../utils/calculationUtils';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

// Extend dayjs with plugins
dayjs.extend(advancedFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// =============================================
// CONSTANTS AND CONFIGURATION
// =============================================

const TIME_RANGE_OPTIONS = [
  { label: 'Today', value: 'daily' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'This Year', value: 'yearly' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom Range', value: 'custom' }
];

const PAYMENT_METHOD_OPTIONS = [
  { label: 'All Payments', value: '' },
  { label: 'CASH', value: 'cash' },
  { label: 'MPESA/BANK', value: 'mpesa' }
];

const TRANSACTION_TYPE_OPTIONS = [
  { label: 'All Transactions', value: '' },
  { label: 'Complete Transactions', value: 'complete' }
];

const STATUS_CONFIG = {
  completed: { color: '#10b981', text: 'COMPLETED' },
  pending: { color: '#f59e0b', text: 'PENDING' },
  refunded: { color: '#3b82f6', text: 'REFUNDED' },
  cancelled: { color: '#ef4444', text: 'CANCELLED' }
};

const PAYMENT_METHOD_CONFIG = {
  cash: { color: '#f59e0b', text: 'CASH' },
  mpesa: { color: '#10b981', text: 'MPESA' },
  bank: { color: '#3b82f6', text: 'BANK' },
  card: { color: '#8b5cf6', text: 'CARD' }
};

// =============================================
// MAIN COMPONENT - ALIGNED WITH ADMIN DASHBOARD
// =============================================

const TransactionsReport = ({ currentUser }) => {
  const screens = useBreakpoint();
  
  // State management - aligned with AdminDashboard structure
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
    cashierPerformance: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  
  // Filters - aligned with AdminDashboard
  const [filters, setFilters] = useState({
    dateRange: null,
    shop: 'all',
    paymentMethod: '',
    transactionType: '',
    timeRange: '30d',
    autoRefresh: false
  });
  
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [shops, setShops] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [dataTimestamp, setDataTimestamp] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(true);

  // Data fetching - SAME AS ADMIN DASHBOARD
  const fetchDashboardData = async (customFilters = null) => {
    const activeFilters = customFilters || filters;
    
    console.log('🚀 Fetching transaction report data with unified API (same as Admin Dashboard)...', activeFilters);
    
    try {
      setLoading(true);
      
      // Fetch shops first for filtering
      const shopsData = await shopAPI.getAll();
      setShops(shopsData);

      // Build params for unified API - SAME AS ADMIN DASHBOARD
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

      // Use unified API endpoint (same as Admin Dashboard)
      const comprehensiveData = await unifiedAPI.getCombinedTransactions(params);
      
      console.log('📊 Unified API response for Transaction Report:', {
        transactions: comprehensiveData.salesWithProfit?.length,
        financialStats: comprehensiveData.financialStats,
        hasEnhancedStats: !!comprehensiveData.enhancedStats
      });

      // Process data using the SAME utility as Admin Dashboard
      const processedData = processDashboardData(comprehensiveData, shopsData, activeFilters);

      setDashboardData(processedData);
      setDataTimestamp(new Date().toISOString());
      
      console.log('✅ Transaction Report data processed (same as Admin Dashboard):', {
        totalRevenue: processedData.financialStats.totalRevenue,
        netProfit: processedData.financialStats.netProfit,
        recentTransactions: processedData.recentTransactions.length
      });
      
      message.success(`Transaction Report refreshed - ${processedData.financialStats.totalSales} transactions`);
  
    } catch (error) {
      console.error('💥 Transaction Report fetch failed:', error);
      await fetchDataWithFallback(activeFilters);
    } finally {
      setLoading(false);
    }
  };

  // Fallback - SAME AS ADMIN DASHBOARD
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
      message.error('Failed to load transaction report data');
      
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
        cashierPerformance: []
      });
    }
  };

  // Data processing - SAME AS ADMIN DASHBOARD
  const processDashboardData = (comprehensiveData, shops, activeFilters) => {
    console.log('🔄 Processing transaction report data with unified structure (same as Admin Dashboard)...');
    
    // Use the same data processing as Admin Dashboard
    const processedData = CalculationUtils.processComprehensiveData(
      comprehensiveData, 
      activeFilters.shop === 'all' ? null : activeFilters.shop,
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

    // Apply additional filters for transaction report
    let filteredTransactions = transactions;
    
    // Apply payment method filter
    if (activeFilters.paymentMethod) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.paymentMethod === activeFilters.paymentMethod
      );
    }
    
    // Apply transaction type filter (only complete transactions now)
    if (activeFilters.transactionType === 'complete') {
      // All transactions are complete since credit is removed
      filteredTransactions = filteredTransactions;
    }

    // Apply date range filter to transactions if needed
    if (activeFilters.dateRange && activeFilters.dateRange[0] && activeFilters.dateRange[1]) {
      filteredTransactions = CalculationUtils.filterDataByDateRange(
        filteredTransactions,
        activeFilters.dateRange[0],
        activeFilters.dateRange[1],
        'saleDate'
      );
    }

    // Recent transactions (all filtered transactions for report)
    const recentTransactions = filteredTransactions
      .sort((a, b) => new Date(b.saleDate || b.createdAt) - new Date(a.saleDate || a.createdAt));

    // Low stock products
    const lowStockProducts = products.filter(p => 
      CalculationUtils.safeNumber(p.currentStock) <= CalculationUtils.safeNumber(p.minStockLevel, 5)
    ).slice(0, 5);

    // Top products using same calculation as Admin Dashboard
    const topProducts = CalculationUtils.calculateTopProducts(filteredTransactions, 10);

    // Shop performance using same calculation as Admin Dashboard
    const shopPerformance = CalculationUtils.calculateShopPerformance(filteredTransactions, shops);

    // Cashier performance using same calculation as Admin Dashboard
    const cashierPerformance = CalculationUtils.calculateCashierPerformance(filteredTransactions, cashiers);

    // ENHANCE COGS CALCULATION: Use the same robust calculation as in Admin Dashboard
    const costOfGoodsSold = financialStats.costOfGoodsSold || 
                           filteredTransactions.reduce((sum, t) => {
                             // Calculate from transaction cost or items using the same logic as in main calculations
                             if (t.cost) {
                               return sum + CalculationUtils.safeNumber(t.cost);
                             }
                             
                             // Calculate from items as fallback using the utility function
                             return sum + CalculationUtils.calculateCostFromItems(t);
                           }, 0);

    // Enhanced financial stats with additional calculations - SAME AS ADMIN DASHBOARD
    const enhancedFinancialStats = {
      ...financialStats,
      // Remove credit-related fields
      creditSales: 0,
      creditSalesCount: 0,
      nonCreditSales: financialStats.totalRevenue || 0,
      outstandingCredit: 0,
      totalCreditGiven: 0,
      // Ensure all required fields are present
      totalRevenue: financialStats.totalRevenue || 0,
      netProfit: financialStats.netProfit || 0,
      totalSales: financialStats.totalSales || filteredTransactions.length,
      totalExpenses: financialStats.totalExpenses || expenses.reduce((sum, e) => sum + CalculationUtils.safeNumber(e.amount), 0),
      
      // Use the enhanced COGS calculation
      costOfGoodsSold: parseFloat(costOfGoodsSold.toFixed(2)),
      
      // Recalculate gross profit and profit margin with accurate COGS
      grossProfit: financialStats.grossProfit || parseFloat((financialStats.totalRevenue - costOfGoodsSold).toFixed(2)),
      profitMargin: financialStats.profitMargin || CalculationUtils.calculateProfitMargin(financialStats.totalRevenue, financialStats.grossProfit)
    };

    // Recalculate net profit with accurate expenses and COGS
    if (!financialStats.netProfit) {
      enhancedFinancialStats.netProfit = parseFloat((enhancedFinancialStats.grossProfit - enhancedFinancialStats.totalExpenses).toFixed(2));
    }

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

  // Calculate date range based on timeRangeFilter
  const calculateDateRange = useCallback((rangeType) => {
    const now = dayjs();
    let startDate;

    switch (rangeType) {
      case 'daily':
        startDate = now.startOf('day');
        break;
      case '7d':
        startDate = now.subtract(7, 'days');
        break;
      case '30d':
        startDate = now.subtract(30, 'days');
        break;
      case 'yearly':
        startDate = now.startOf('year');
        break;
      case 'all':
        return null;
      case 'custom':
        return filters.dateRange;
      default:
        startDate = now.subtract(30, 'days');
    }

    return [startDate, now];
  }, [filters.dateRange]);

  // Update date range when timeRange changes
  useEffect(() => {
    const newDateRange = calculateDateRange(filters.timeRange);
    setFilters(prev => ({ ...prev, dateRange: newDateRange }));
  }, [filters.timeRange, calculateDateRange]);

  // Auto-refresh effect - SAME AS ADMIN DASHBOARD
  useEffect(() => {
    let intervalId;
    
    if (filters.autoRefresh) {
      intervalId = setInterval(() => {
        console.log('🔄 Auto-refreshing transaction report...');
        fetchDashboardData();
      }, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [filters.autoRefresh]);

  // Auto-fetch data when filters change
  useEffect(() => {
    fetchDashboardData();
  }, [filters.shop, filters.timeRange, filters.paymentMethod, filters.transactionType]);

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
      paymentMethod: '',
      transactionType: '',
      timeRange: '30d',
      autoRefresh: filters.autoRefresh // Keep auto-refresh setting
    };
    setFilters(clearedFilters);
    fetchDashboardData(clearedFilters);
    message.info('Filters cleared - showing last 30 days data');
  };

  // Quick refresh function - SAME AS ADMIN DASHBOARD
  const quickRefresh = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  // Event handlers
  const handleViewTransaction = useCallback((transaction) => {
    setSelectedTransaction(transaction);
    setViewModalVisible(true);
  }, []);

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
      link.download = `transaction-report-${new Date().toISOString().split('T')[0]}.json`;
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

  // Filtered data with search
  const filteredTransactions = useMemo(() => {
    if (!dashboardData?.recentTransactions) return [];
    
    let filtered = dashboardData.recentTransactions;
    
    // Apply search filter
    const searchLower = searchText.toLowerCase().trim();
    if (searchLower) {
      filtered = filtered.filter(transaction => {
        if (!transaction) return false;
        
        const searchFields = [
          transaction.cashierName,
          transaction.shop && typeof transaction.shop === 'string' ? transaction.shop : 
            (transaction.shop && typeof transaction.shop === 'object' ? transaction.shop.name : ''),
          transaction.paymentMethod,
          transaction.transactionNumber,
          transaction.customerName,
          ...(transaction.items?.map(item => item.productName) || [])
        ].filter(Boolean).map(field => field.toLowerCase());

        return searchFields.some(field => field.includes(searchLower));
      });
    }
    
    return filtered;
  }, [dashboardData, searchText]);

  // Transaction type counts
  const transactionTypeCounts = useMemo(() => {
    if (!dashboardData?.recentTransactions) {
      return { total: 0, complete: 0 };
    }
    
    const transactions = dashboardData.recentTransactions;
    return {
      total: transactions.length,
      complete: transactions.length // All transactions are complete now
    };
  }, [dashboardData]);

  // Helper functions
  const getShopNameForDisplay = () => {
    if (filters.shop === 'all') return 'All Shops';
    const foundShop = shops.find(s => s._id === filters.shop);
    return foundShop?.name || 'Selected Shop';
  };

  // Format number without abbreviation
  const formatFullNumber = (num) => {
    if (typeof num !== 'number') return '0';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Table columns - RESPONSIVE FOR MOBILE
  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: 'ID',
        dataIndex: '_id',
        key: 'transactionId',
        render: (id, record) => (
          <Tooltip title={id}>
            <Text code style={{ 
              cursor: 'pointer',
              fontSize: screens.xs ? '10px' : '12px',
              fontWeight: 'bold'
            }}>
              {record.transactionNumber || (id ? `${id.substring(0, 6)}...` : 'N/A')}
            </Text>
          </Tooltip>
        ),
        width: screens.xs ? 80 : 100,
        fixed: 'left',
        responsive: ['xs', 'sm']
      },
      {
        title: 'Date',
        dataIndex: 'saleDate',
        key: 'date',
        render: (date, record) => (
          <div>
            <div style={{ fontSize: screens.xs ? '10px' : '12px', fontWeight: '500' }}>
              {dayjs(date).format('DD/MM')}
            </div>
            <div style={{ fontSize: screens.xs ? '9px' : '10px', color: '#666' }}>
              {dayjs(date).format('HH:mm')}
            </div>
          </div>
        ),
        width: screens.xs ? 70 : 90,
        sorter: (a, b) => new Date(a.saleDate) - new Date(b.saleDate),
        responsive: ['xs', 'sm', 'md']
      },
      {
        title: 'Customer',
        dataIndex: 'customerName',
        key: 'customerName',
        render: (name) => (
          <Text ellipsis style={{ fontSize: screens.xs ? '11px' : '13px' }}>
            {name || 'Walk-in'}
          </Text>
        ),
        width: screens.xs ? 80 : 100,
        responsive: ['xs', 'sm', 'md']
      },
      {
        title: 'Type',
        key: 'transactionType',
        width: screens.xs ? 70 : 90,
        render: (_, record) => (
          <Tag 
            color="#10b981"
            style={{ 
              fontSize: screens.xs ? '9px' : '11px',
              fontWeight: 'bold',
              margin: 0,
              padding: screens.xs ? '2px 6px' : '4px 8px'
            }}
          >
            COMPLETE
          </Tag>
        ),
        responsive: ['xs', 'sm', 'md']
      },
      {
        title: 'Amount',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        render: (amount) => (
          <div>
            <Text strong style={{ 
              color: '#2563eb',
              fontSize: screens.xs ? '12px' : '14px',
              fontWeight: '600'
            }}>
              {CalculationUtils.formatCurrency(amount)}
            </Text>
          </div>
        ),
        sorter: (a, b) => (a.totalAmount || 0) - (b.totalAmount || 0),
        width: screens.xs ? 90 : 110,
        responsive: ['xs', 'sm', 'md', 'lg']
      },
      {
        title: 'Profit',
        dataIndex: 'profit',
        key: 'profit',
        render: (profit) => (
          <Text strong style={{ 
            color: CalculationUtils.getProfitColor(profit),
            fontSize: screens.xs ? '12px' : '14px',
            fontWeight: '600'
          }}>
            {CalculationUtils.formatCurrency(profit || 0)}
          </Text>
        ),
        sorter: (a, b) => (a.profit || 0) - (b.profit || 0),
        width: screens.xs ? 90 : 110,
        responsive: ['md', 'lg']
      },
      {
        title: 'Margin',
        dataIndex: 'profitMargin',
        key: 'profitMargin',
        render: (margin) => (
          <Text strong style={{ 
            color: '#059669',
            fontSize: screens.xs ? '11px' : '13px',
            fontWeight: '600'
          }}>
            {CalculationUtils.safeNumber(margin, 0).toFixed(1)}%
          </Text>
        ),
        width: screens.xs ? 70 : 80,
        responsive: ['md', 'lg']
      },
      {
        title: 'Payment',
        key: 'paymentMethod',
        width: screens.xs ? 100 : 120,
        render: (_, record) => (
          <Tag 
            color={PAYMENT_METHOD_CONFIG[record.paymentMethod]?.color || '#6b7280'}
            style={{ 
              fontSize: screens.xs ? '9px' : '11px',
              marginBottom: 2
            }}
          >
            {record.paymentMethod?.toUpperCase() || 'N/A'}
          </Tag>
        ),
        responsive: ['sm', 'md', 'lg']
      },
      {
        title: 'Actions',
        key: 'actions',
        width: screens.xs ? 60 : 80,
        fixed: 'right',
        render: (_, record) => (
          <Button
            type="link"
            icon={<EyeOutlined style={{ fontSize: screens.xs ? '14px' : '16px' }} />}
            onClick={() => handleViewTransaction(record)}
            size="small"
            style={{ padding: screens.xs ? '2px 4px' : '4px 8px' }}
            title="View Details"
          />
        )
      }
    ];

    // For mobile, show minimal columns
    if (screens.xs) {
      return baseColumns.filter(col => 
        col.responsive?.includes('xs') || col.fixed
      );
    }

    return baseColumns;
  }, [screens, shops, handleViewTransaction]);

  // UPDATED: Financial Overview Component with 24px numbers and 15px bold titles
  const FinancialOverview = () => {
    const safeStats = dashboardData?.financialStats || CalculationUtils.getDefaultStats();
    
    const hasData = safeStats.totalTransactions > 0 || safeStats.totalRevenue > 0;

    // UPDATED COLOR SCHEME - Light backgrounds with dark text for better visibility
    const statCardColors = [
      { bg: '#e0f2fe', border: '#bae6fd', title: '#0369a1', value: '#0c4a6e' }, // Blue
      { bg: '#f0f9ff', border: '#7dd3fc', title: '#0ea5e9', value: '#0369a1' }, // Light Blue
      { bg: '#fef3c7', border: '#fcd34d', title: '#d97706', value: '#92400e' }, // Amber
      { bg: '#dcfce7', border: '#86efac', title: '#16a34a', value: '#166534' }, // Green
      { bg: '#fee2e2', border: '#fca5a5', title: '#dc2626', value: '#991b1b' }, // Red
      { bg: '#f5f3ff', border: '#c4b5fd', title: '#7c3aed', value: '#5b21b6' }, // Purple
      { bg: '#fef9c3', border: '#fde047', title: '#ca8a04', value: '#854d0e' }, // Yellow
      { bg: '#fce7f3', border: '#f9a8d4', title: '#db2777', value: '#9d174d' }, // Pink
      { bg: '#ecfdf5', border: '#a7f3d0', title: '#10b981', value: '#065f46' }, // Emerald
      { bg: '#f1f5f9', border: '#cbd5e1', title: '#64748b', value: '#334155' }  // Gray
    ];

    const StatCard = ({ title, value, prefix = "KES", description, colorIndex = 0 }) => {
      const color = statCardColors[colorIndex % statCardColors.length];
      
      return (
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <Card 
            size="small" 
            style={{ 
              background: color.bg,
              border: `1px solid ${color.border}`,
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              marginBottom: '12px',
              minHeight: screens.xs ? '120px' : '140px', // Adjusted for mobile
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              // Added for mobile touch compatibility
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
            bodyStyle={{ 
              padding: screens.xs ? '14px 10px' : '16px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              // Prevent text overflow on mobile
              overflow: 'hidden'
            }}
          >
            <div style={{ marginBottom: screens.xs ? '6px' : '8px' }}>
              {/* UPDATED: Title with 15px font and bold weight */}
              <Text style={{ 
                color: color.title,
                fontSize: screens.xs ? '13px' : '15px', // 15px as requested
                fontWeight: '700', // Bolder as requested
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block',
                lineHeight: '1.2'
              }}>
                {title}
              </Text>
            </div>
            
            {/* UPDATED: Value with 24px font */}
            <div style={{ 
              color: color.value,
              fontSize: screens.xs ? '18px' : '24px', // 24px as requested
              fontWeight: '700',
              lineHeight: '1.2',
              marginBottom: '4px',
              // Ensure numbers are visible on mobile
              textShadow: screens.xs ? '0 1px 1px rgba(0,0,0,0.1)' : 'none'
            }}>
              {prefix} {formatFullNumber(value)}
            </div>
            
            {description && (
              <Text style={{ 
                color: '#6b7280',
                fontSize: screens.xs ? '9px' : '11px',
                opacity: 0.9,
                lineHeight: '1.2',
                display: 'block',
                marginTop: '4px'
              }}>
                {description}
              </Text>
            )}
            
            {!hasData && value === 0 && (
              <Text style={{ 
                color: '#9ca3af',
                fontSize: screens.xs ? '9px' : '10px',
                fontStyle: 'italic',
                marginTop: '4px'
              }}>
                No data
              </Text>
            )}
          </Card>
        </Col>
      );
    };

    return (
      <Card 
        title={
          <Space>
            <DollarOutlined style={{ color: '#2563eb' }} />
            <Text strong style={{ 
              fontSize: screens.xs ? '16px' : '18px',
              fontWeight: '600'
            }}>Financial Overview</Text>
            {loading && <Spin size="small" />}
            {!hasData && !loading && <Tag color="#f59e0b">No Data</Tag>}
          </Space>
        } 
        style={{ 
          marginBottom: 24,
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
          // Mobile optimization
          overflow: 'hidden'
        }}
        loading={loading}
        extra={
          <Tag color="#3b82f6" style={{ 
            fontSize: screens.xs ? '11px' : '12px',
            fontWeight: '500'
          }}>
            {getShopNameForDisplay()}
          </Tag>
        }
      >
        {!hasData && !loading && (
          <Alert
            message="No Transaction Data Available"
            description={
              <div style={{ fontSize: screens.xs ? '12px' : '14px' }}>
                <p>No transactions found for the selected filters. This could be because:</p>
                <ul>
                  <li>No transactions have been created yet</li>
                  <li>The selected date range has no transactions</li>
                  <li>The selected shop has no transactions</li>
                  <li>All transactions are in "pending" status</li>
                </ul>
              </div>
            }
            type="warning"
            showIcon
            style={{ 
              marginBottom: 16, 
              borderRadius: '12px',
              fontSize: screens.xs ? '12px' : '14px'
            }}
          />
        )}

        <Row gutter={[screens.xs ? 8 : 16, screens.xs ? 8 : 16]} justify="center">
          {/* First Row - Core Metrics */}
          <StatCard 
            title="Total Sales" 
            value={safeStats.totalSales} 
            colorIndex={0}
            description={`${safeStats.totalTransactions || 0} transactions`} 
          />
          
          <StatCard 
            title="Total Revenue" 
            value={safeStats.totalRevenue} 
            colorIndex={1}
            description="All completed sales" 
          />

          {/* Second Row - Profit & Expenses */}
          <StatCard 
            title="Expenses" 
            value={safeStats.totalExpenses} 
            colorIndex={2}
            description="Operational costs" 
          />
          
          <StatCard 
            title="Gross Profit" 
            value={safeStats.grossProfit} 
            colorIndex={3}
            description="Revenue - COGS" 
          />
          
          <StatCard 
            title="Net Profit" 
            value={safeStats.netProfit} 
            colorIndex={4}
            description="After all expenses" 
          />
          
          <StatCard 
            title="Cost of Goods" 
            value={safeStats.costOfGoodsSold} 
            colorIndex={5}
            description="Total COGS" 
          />

          {/* Third Row - Payment Methods */}
          <StatCard 
            title="Total Mpesa/Bank" 
            value={safeStats.totalMpesaBank} 
            colorIndex={6}
            description="Digital payments" 
          />
          
          <StatCard 
            title="Total Cash" 
            value={safeStats.totalCash} 
            colorIndex={7}
            description="Cash payments" 
          />
          
          <StatCard 
            title="Profit Margin" 
            value={safeStats.profitMargin} 
            colorIndex={8}
            prefix=""
            suffix="%"
            description="Net profit margin" 
          />
          
          <StatCard 
            title="Avg Transaction" 
            value={safeStats.totalSales > 0 ? safeStats.totalRevenue / safeStats.totalSales : 0} 
            colorIndex={9}
            description="Average sale value" 
          />
        </Row>
      </Card>
    );
  };

  // Performance List Component - RESPONSIVE
  const PerformanceList = ({ data, title, icon, loading, renderItem, emptyDescription }) => (
    <Card 
      title={
        <Space>
          {React.cloneElement(icon, { style: { color: '#2563eb', fontSize: screens.xs ? '14px' : '16px' } })}
          <Text strong style={{ 
            fontSize: screens.xs ? '14px' : '16px',
            fontWeight: '600'
          }}>{title}</Text>
          <Badge count={data.length} showZero color="#2563eb" style={{ fontSize: screens.xs ? '10px' : '12px' }} />
        </Space>
      } 
      style={{ 
        marginBottom: 24,
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        // Mobile optimization
        overflow: 'hidden'
      }}
      loading={loading}
    >
      {data.length > 0 ? (
        <List 
          dataSource={data} 
          renderItem={renderItem}
          grid={screens.xs ? { gutter: 16, column: 1 } : { gutter: 16, column: 1 }}
        />
      ) : (
        <Empty 
          description={
            <Text style={{ color: '#6b7280', fontSize: screens.xs ? '12px' : '14px' }}>
              {emptyDescription}
            </Text>
          }
          imageStyle={{ height: screens.xs ? 60 : 80 }}
        />
      )}
    </Card>
  );

  // Cashier Performance Component - RESPONSIVE
  const CashierPerformance = () => {
    const renderCashierItem = (cashier, index) => (
      <List.Item style={{ 
        padding: screens.xs ? '12px 8px' : '16px 20px', 
        borderBottom: '1px solid #f3f4f6',
        // Mobile touch optimization
        touchAction: 'manipulation'
      }}>
        <div style={{ width: '100%' }}>
          <Row gutter={[16, 16]} align="middle" style={{ marginBottom: screens.xs ? 8 : 12 }}>
            <Col flex="none">
              <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? '#2563eb' : '#9ca3af'}>
                <Avatar 
                  style={{ 
                    backgroundColor: index < 3 ? '#3b82f6' : '#d1d5db',
                    color: '#ffffff',
                    fontSize: screens.xs ? '14px' : '16px',
                    width: screens.xs ? 36 : 40,
                    height: screens.xs ? 36 : 40
                  }}
                  icon={<UserOutlined />}
                >
                  {cashier.name?.charAt(0)?.toUpperCase() || 'C'}
                </Avatar>
              </Badge>
            </Col>
            <Col flex="auto">
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <Row justify="space-between" align="middle">
                  <Text strong style={{ 
                    fontSize: screens.xs ? '13px' : '15px',
                    color: '#1f2937',
                    fontWeight: '600'
                  }}>
                    {cashier.name}
                  </Text>
                  {index < 3 && (
                    <Tag color="#fbbf24" style={{ 
                      fontSize: screens.xs ? '9px' : '10px',
                      padding: screens.xs ? '1px 4px' : '2px 6px',
                      fontWeight: '500'
                    }}>
                      Top
                    </Tag>
                  )}
                </Row>
                <Tag color="#60a5fa" style={{ 
                  fontSize: screens.xs ? '9px' : '10px',
                  padding: screens.xs ? '1px 4px' : '2px 6px'
                }}>
                  {cashier.transactions} transactions
                </Tag>
              </Space>
            </Col>
          </Row>
          
          <Row gutter={[12, 12]} style={{ marginTop: screens.xs ? 8 : 12 }}>
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#eff6ff',
                padding: screens.xs ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                // Mobile touch optimization
                minHeight: screens.xs ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: screens.xs ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Revenue
                </Text>
                <Text strong style={{ 
                  color: '#2563eb',
                  fontSize: screens.xs ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {CalculationUtils.formatCurrency(cashier.revenue)}
                </Text>
              </div>
            </Col>
            
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#f0fdf4',
                padding: screens.xs ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: screens.xs ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: screens.xs ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Profit
                </Text>
                <Text strong style={{ 
                  color: CalculationUtils.getProfitColor(cashier.profit),
                  fontSize: screens.xs ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {CalculationUtils.formatCurrency(cashier.profit)}
                </Text>
              </div>
            </Col>
            
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#fefce8',
                padding: screens.xs ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: screens.xs ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: screens.xs ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Margin
                </Text>
                <Text strong style={{ 
                  color: '#059669',
                  fontSize: screens.xs ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {cashier.profitMargin.toFixed(1)}%
                </Text>
              </div>
            </Col>
          </Row>
        </div>
      </List.Item>
    );

    return (
      <PerformanceList
        data={dashboardData.cashierPerformance || []}
        title="Cashier Performance"
        icon={<UserOutlined />}
        loading={loading}
        renderItem={renderCashierItem}
        emptyDescription="No cashier performance data available"
      />
    );
  };

  // Shop Performance Component - RESPONSIVE
  const ShopPerformance = () => {
    const renderShopItem = (shop, index) => (
      <List.Item style={{ 
        padding: screens.xs ? '12px 8px' : '16px 20px', 
        borderBottom: '1px solid #f3f4f6',
        touchAction: 'manipulation'
      }}>
        <div style={{ width: '100%' }}>
          <Row gutter={[16, 16]} align="middle" style={{ marginBottom: screens.xs ? 8 : 12 }}>
            <Col flex="none">
              <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? '#2563eb' : '#9ca3af'}>
                <Avatar 
                  style={{ 
                    backgroundColor: index < 3 ? '#3b82f6' : '#d1d5db',
                    color: '#ffffff',
                    fontSize: screens.xs ? '14px' : '16px',
                    width: screens.xs ? 36 : 40,
                    height: screens.xs ? 36 : 40
                  }}
                >
                  {shop.name?.charAt(0)?.toUpperCase() || 'S'}
                </Avatar>
              </Badge>
            </Col>
            <Col flex="auto">
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <Row justify="space-between" align="middle">
                  <Text strong style={{ 
                    fontSize: screens.xs ? '13px' : '15px',
                    color: '#1f2937',
                    fontWeight: '600'
                  }}>
                    {shop.name}
                  </Text>
                  {index < 3 && (
                    <Tag color="#fbbf24" style={{ 
                      fontSize: screens.xs ? '9px' : '10px',
                      padding: screens.xs ? '1px 4px' : '2px 6px',
                      fontWeight: '500'
                    }}>
                      Top
                    </Tag>
                  )}
                </Row>
                <Space size={8} wrap>
                  <Tag color="#10b981" style={{ fontSize: screens.xs ? '9px' : '10px' }}>
                    {shop.transactions} transactions
                  </Tag>
                </Space>
              </Space>
            </Col>
          </Row>
          
          <Row gutter={[12, 12]} style={{ marginTop: screens.xs ? 8 : 12 }}>
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#eff6ff',
                padding: screens.xs ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: screens.xs ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: screens.xs ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Revenue
                </Text>
                <Text strong style={{ 
                  color: '#2563eb',
                  fontSize: screens.xs ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {CalculationUtils.formatCurrency(shop.revenue)}
                </Text>
              </div>
            </Col>
            
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#f0f9ff',
                padding: screens.xs ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: screens.xs ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: screens.xs ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Transactions
                </Text>
                <Text strong style={{ 
                  color: '#0ea5e9',
                  fontSize: screens.xs ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {shop.transactions}
                </Text>
              </div>
            </Col>
            
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#fefce8',
                padding: screens.xs ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: screens.xs ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: screens.xs ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Margin
                </Text>
                <Text strong style={{ 
                  color: '#059669',
                  fontSize: screens.xs ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {shop.profitMargin.toFixed(1)}%
                </Text>
              </div>
            </Col>
          </Row>
        </div>
      </List.Item>
    );

    return (
      <PerformanceList
        data={dashboardData.shopPerformance || []}
        title="Shop Performance"
        icon={<ShopOutlined />}
        loading={loading}
        renderItem={renderShopItem}
        emptyDescription="No shop performance data available"
      />
    );
  };

  // Product Performance Component - RESPONSIVE
  const ProductPerformance = () => {
    const renderProductItem = (product, index) => (
      <List.Item style={{ 
        padding: screens.xs ? '12px 8px' : '16px 20px', 
        borderBottom: '1px solid #f3f4f6',
        touchAction: 'manipulation'
      }}>
        <div style={{ width: '100%' }}>
          <Row gutter={[16, 16]} align="middle" style={{ marginBottom: screens.xs ? 8 : 12 }}>
            <Col flex="none">
              <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? '#2563eb' : '#9ca3af'}>
                <Avatar 
                  style={{ 
                    backgroundColor: index < 3 ? '#8b5cf6' : '#d1d5db',
                    color: '#ffffff',
                    fontSize: screens.xs ? '14px' : '16px',
                    width: screens.xs ? 36 : 40,
                    height: screens.xs ? 36 : 40
                  }}
                >
                  {product.name?.charAt(0)?.toUpperCase() || 'P'}
                </Avatar>
              </Badge>
            </Col>
            <Col flex="auto">
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <Row justify="space-between" align="middle">
                  <Text strong style={{ 
                    fontSize: screens.xs ? '13px' : '15px',
                    color: '#1f2937',
                    fontWeight: '600'
                  }}>
                    {product.name}
                  </Text>
                  <Tag color="#60a5fa" style={{ fontSize: screens.xs ? '9px' : '10px' }}>
                    {product.totalSold} sold
                  </Tag>
                </Row>
                {index < 3 && (
                  <Tag color="#fbbf24" style={{ 
                    fontSize: screens.xs ? '9px' : '10px',
                    width: 'fit-content',
                    fontWeight: '500'
                  }}>
                    Top Seller
                  </Tag>
                )}
              </Space>
            </Col>
          </Row>
          
          <Row gutter={[12, 12]} style={{ marginTop: screens.xs ? 8 : 12 }}>
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#eff6ff',
                padding: screens.xs ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: screens.xs ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: screens.xs ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Revenue
                </Text>
                <Text strong style={{ 
                  color: '#2563eb',
                  fontSize: screens.xs ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {CalculationUtils.formatCurrency(product.totalRevenue)}
                </Text>
              </div>
            </Col>
            
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#f0fdf4',
                padding: screens.xs ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: screens.xs ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: screens.xs ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Profit
                </Text>
                <Text strong style={{ 
                  color: CalculationUtils.getProfitColor(product.totalProfit),
                  fontSize: screens.xs ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {CalculationUtils.formatCurrency(product.totalProfit)}
                </Text>
              </div>
            </Col>
            
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#fefce8',
                padding: screens.xs ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: screens.xs ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: screens.xs ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Margin
                </Text>
                <Text strong style={{ 
                  color: '#059669',
                  fontSize: screens.xs ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {product.profitMargin.toFixed(1)}%
                </Text>
              </div>
            </Col>
          </Row>
        </div>
      </List.Item>
    );

    return (
      <PerformanceList
        data={dashboardData.topProducts || []}
        title="Top Performing Products"
        icon={<AppstoreOutlined />}
        loading={loading}
        renderItem={renderProductItem}
        emptyDescription="No product sales data available"
      />
    );
  };

  // Transaction Details Modal - RESPONSIVE
  const TransactionDetailsModal = ({ transaction, visible, onCancel }) => {
    if (!transaction) return null;

    const getShopName = () => {
      if (transaction.shop && typeof transaction.shop === 'string') {
        return transaction.shop;
      }
      if (transaction.shop && typeof transaction.shop === 'object' && transaction.shop.name) {
        return transaction.shop.name;
      }
      if (transaction.shopId) {
        const foundShop = shops.find(s => s._id === transaction.shopId);
        return foundShop?.name || 'Unknown Shop';
      }
      return 'Unknown Shop';
    };

    const shopName = getShopName();

    return (
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#2563eb' }} />
            <Text strong style={{ 
              fontSize: screens.xs ? '14px' : '16px',
              fontWeight: '600'
            }}>Transaction Details</Text>
            <Tag color={transaction.status === 'completed' ? '#10b981' : '#f59e0b'}>
              {transaction.status?.toUpperCase()}
            </Tag>
          </Space>
        }
        open={visible}
        onCancel={onCancel}
        footer={[
          <Button key="close" onClick={onCancel} type="primary" size={screens.xs ? "middle" : "large"}>
            Close
          </Button>
        ]}
        width={screens.xs ? '100%' : 700}
        style={{ 
          top: screens.xs ? 0 : 50,
          maxHeight: screens.xs ? '100vh' : '80vh'
        }}
        bodyStyle={{ 
          padding: screens.xs ? '16px 12px' : '24px',
          maxHeight: screens.xs ? 'calc(100vh - 120px)' : '60vh',
          overflowY: 'auto',
          // Mobile scroll optimization
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <Descriptions 
          bordered 
          column={screens.xs ? 1 : 2} 
          size="small"
          labelStyle={{ 
            fontWeight: '600',
            background: '#f9fafb',
            width: screens.xs ? '100%' : 'auto',
            fontSize: screens.xs ? '12px' : '13px'
          }}
          contentStyle={{ 
            background: '#ffffff',
            fontSize: screens.xs ? '13px' : '14px'
          }}
        >
          <Descriptions.Item label="Transaction ID" span={screens.xs ? 1 : 2}>
            <Text code style={{ fontSize: screens.xs ? '11px' : '12px' }}>
              {transaction.transactionNumber || transaction._id}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Date & Time">
            {transaction.displayDate || dayjs(transaction.saleDate).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Customer">
            {transaction.customerName || 'Walk-in Customer'}
          </Descriptions.Item>
          <Descriptions.Item label="Shop">{shopName}</Descriptions.Item>
          <Descriptions.Item label="Cashier">
            {transaction.cashierName || 'Unknown Cashier'}
          </Descriptions.Item>
          <Descriptions.Item label="Transaction Type">
            <Tag color="#10b981">
              COMPLETE SALE
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Payment Method">
            <Tag color={PAYMENT_METHOD_CONFIG[transaction.paymentMethod]?.color || '#3b82f6'}>
              {transaction.paymentMethod?.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount">
            <Text strong style={{ 
              color: '#2563eb', 
              fontSize: screens.xs ? '16px' : '18px',
              fontWeight: '600'
            }}>
              {CalculationUtils.formatCurrency(transaction.totalAmount)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Cost">
            <Text style={{ 
              color: '#d97706', 
              fontSize: screens.xs ? '14px' : '16px',
              fontWeight: '500'
            }}>
              {CalculationUtils.formatCurrency(transaction.cost || 0)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Profit">
            <Text strong style={{ 
              color: CalculationUtils.getProfitColor(transaction.profit),
              fontSize: screens.xs ? '14px' : '16px',
              fontWeight: '600'
            }}>
              {CalculationUtils.formatCurrency(transaction.profit || 0)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Profit Margin">
            <Text strong style={{ 
              color: '#059669', 
              fontSize: screens.xs ? '14px' : '16px',
              fontWeight: '600'
            }}>
              {CalculationUtils.safeNumber(transaction.profitMargin, 0).toFixed(1)}%
            </Text>
          </Descriptions.Item>
          
          {transaction.items && transaction.items.length > 0 && (
            <Descriptions.Item label="Items" span={screens.xs ? 1 : 2}>
              <List
                size="small"
                dataSource={transaction.items}
                renderItem={(item, index) => (
                  <List.Item style={{ padding: screens.xs ? '8px 4px' : '12px 0' }}>
                    <div style={{ width: '100%' }}>
                      <Text strong style={{ 
                        fontSize: screens.xs ? '12px' : '13px',
                        fontWeight: '600'
                      }}>
                        {item.productName} (x{item.quantity})
                      </Text>
                      <Row gutter={[8, 4]} style={{ marginTop: 4 }}>
                        <Col xs={12}>
                          <Text style={{ fontSize: screens.xs ? '10px' : '11px', color: '#6b7280' }}>
                            Price: {CalculationUtils.formatCurrency(item.unitPrice)}
                          </Text>
                        </Col>
                        <Col xs={12}>
                          <Text style={{ fontSize: screens.xs ? '10px' : '11px', color: '#6b7280' }}>
                            Total: {CalculationUtils.formatCurrency(item.totalPrice)}
                          </Text>
                        </Col>
                        {item.profit && (
                          <Col xs={24}>
                            <Text style={{ 
                              fontSize: screens.xs ? '10px' : '11px', 
                              color: '#059669',
                              fontWeight: '500'
                            }}>
                              Profit: {CalculationUtils.formatCurrency(item.profit)}
                            </Text>
                          </Col>
                        )}
                      </Row>
                    </div>
                  </List.Item>
                )}
              />
            </Descriptions.Item>
          )}
        </Descriptions>
      </Modal>
    );
  };

  // Overview Tab Content
  const renderOverviewTab = () => {
    return (
      <div>
        <FinancialOverview />
        
        <ShopPerformance />
        
        <CashierPerformance />
        
        <ProductPerformance />
      </div>
    );
  };

  // Filter Components - RESPONSIVE
  const ShopFilter = ({ value, onChange }) => (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Text strong style={{ 
          fontSize: screens.xs ? '12px' : '13px',
          fontWeight: '600'
        }}>Select Shop:</Text>
      </div>
      <Select
        value={value}
        onChange={onChange}
        style={{ width: '100%' }}
        placeholder="Filter by shop"
        allowClear
        loading={loading}
        size={screens.xs ? "small" : "middle"}
        // Mobile optimization for dropdown
        dropdownStyle={screens.xs ? { fontSize: '14px' } : {}}
        optionLabelProp="label"
      >
        <Option value="all" label="All Shops">All Shops</Option>
        {shops.map(shop => (
          <Option key={shop._id} value={shop._id} label={shop.name}>
            {shop.name}
          </Option>
        ))}
      </Select>
    </div>
  );

  const TimeRangeFilter = ({ value, onChange }) => (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Text strong style={{ 
          fontSize: screens.xs ? '12px' : '13px',
          fontWeight: '600'
        }}>Time Range:</Text>
      </div>
      <Select
        value={value}
        onChange={onChange}
        style={{ width: '100%' }}
        placeholder="Choose time range"
        size={screens.xs ? "small" : "middle"}
        dropdownStyle={screens.xs ? { fontSize: '14px' } : {}}
      >
        {TIME_RANGE_OPTIONS.map(option => (
          <Option key={option.value} value={option.value} label={option.label}>
            {option.label}
          </Option>
        ))}
      </Select>
    </div>
  );

  const PaymentModeFilter = ({ value, onChange }) => (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Text strong style={{ 
          fontSize: screens.xs ? '12px' : '13px',
          fontWeight: '600'
        }}>Payment Mode:</Text>
      </div>
      <Select
        value={value}
        onChange={onChange}
        style={{ width: '100%' }}
        placeholder="Filter by payment mode"
        allowClear
        size={screens.xs ? "small" : "middle"}
        dropdownStyle={screens.xs ? { fontSize: '14px' } : {}}
      >
        {PAYMENT_METHOD_OPTIONS.map(option => (
          <Option key={option.value} value={option.value} label={option.label}>
            {option.label}
          </Option>
        ))}
      </Select>
    </div>
  );

  const TransactionTypeFilter = ({ value, onChange }) => (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Text strong style={{ 
          fontSize: screens.xs ? '12px' : '13px',
          fontWeight: '600'
        }}>Transaction Type:</Text>
      </div>
      <Select
        value={value}
        onChange={onChange}
        style={{ width: '100%' }}
        placeholder="Filter by transaction type"
        allowClear
        size={screens.xs ? "small" : "middle"}
        dropdownStyle={screens.xs ? { fontSize: '14px' } : {}}
      >
        {TRANSACTION_TYPE_OPTIONS.map(option => (
          <Option key={option.value} value={option.value} label={option.label}>
            {option.label}
          </Option>
        ))}
      </Select>
    </div>
  );

  return (
    <div style={{ 
      padding: screens.xs ? '12px 8px' : '24px', 
      background: '#f9fafb', 
      minHeight: '100vh',
      maxWidth: '100vw',
      overflowX: 'hidden',
      // Mobile viewport optimization
      WebkitTextSizeAdjust: '100%'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: screens.xs ? '16px' : '24px', 
        flexWrap: 'wrap', 
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <BarChartOutlined style={{ 
            color: '#2563eb', 
            fontSize: screens.xs ? '20px' : '24px',
            marginRight: screens.xs ? 8 : 12 
          }} />
          <Title level={2} style={{ 
            color: '#1f2937', 
            margin: 0,
            fontSize: screens.xs ? '18px' : '24px',
            fontWeight: '600'
          }}>
            Transactions Report
          </Title>
          {screens.xs && <MobileOutlined style={{ color: '#6b7280' }} />}
          {currentUser?.role === 'cashier' && (
            <Tag color="#3b82f6" style={{ 
              fontSize: screens.xs ? '10px' : '12px',
              marginLeft: screens.xs ? 0 : 8,
              fontWeight: '500'
            }}>
              My Transactions
            </Tag>
          )}
        </div>
        
        <Space wrap style={{ 
          justifyContent: screens.xs ? 'flex-start' : 'flex-end',
          // Mobile button spacing
          gap: screens.xs ? '8px' : '12px'
        }}>
          {/* Auto-refresh indicator */}
          <Tooltip title={filters.autoRefresh ? "Auto-refresh ON (30s)" : "Auto-refresh OFF"}>
            <Button 
              type={filters.autoRefresh ? "primary" : "default"}
              icon={<ReloadOutlined spin={filters.autoRefresh} />}
              onClick={() => handleFilterChange('autoRefresh', !filters.autoRefresh)}
              size={screens.xs ? "small" : "middle"}
              style={{ 
                background: filters.autoRefresh ? '#10b981' : '#f3f4f6',
                borderColor: filters.autoRefresh ? '#10b981' : '#d1d5db',
                // Mobile touch target
                minWidth: screens.xs ? '40px' : 'auto',
                height: screens.xs ? '32px' : 'auto'
              }}
            >
              {screens.xs ? 'Auto' : 'Auto Refresh'}
            </Button>
          </Tooltip>
          
          <Button
            icon={<ReloadOutlined />}
            onClick={quickRefresh}
            disabled={loading}
            size={screens.xs ? "small" : "middle"}
            type="primary"
            style={{ 
              background: '#2563eb', 
              borderColor: '#2563eb',
              minWidth: screens.xs ? '40px' : 'auto',
              height: screens.xs ? '32px' : 'auto'
            }}
          >
            {screens.xs ? 'Refresh' : 'Quick Refresh'}
          </Button>

          <Button
            icon={<ExportOutlined />}
            onClick={handleExportData}
            loading={exportLoading}
            size={screens.xs ? "small" : "middle"}
            style={{ 
              color: '#059669', 
              borderColor: '#059669',
              minWidth: screens.xs ? '40px' : 'auto',
              height: screens.xs ? '32px' : 'auto'
            }}
          >
            {screens.xs ? 'Export' : 'Export Data'}
          </Button>

          <Button
            icon={<FilterOutlined />}
            onClick={() => setFilterVisible(!filterVisible)}
            size={screens.xs ? "small" : "middle"}
            type={filterVisible ? "primary" : "default"}
            style={filterVisible ? { 
              background: '#f97316', 
              borderColor: '#f97316',
              minWidth: screens.xs ? '40px' : 'auto',
              height: screens.xs ? '32px' : 'auto'
            } : {
              minWidth: screens.xs ? '40px' : 'auto',
              height: screens.xs ? '32px' : 'auto'
            }}
          >
            {screens.xs ? 'Filters' : 'Toggle Filters'}
          </Button>
        </Space>
      </div>

      {/* Data Timestamp and Active Filters */}
      <Row style={{ marginBottom: 16 }} justify="space-between" align="middle" gutter={[8, 8]}>
        <Col xs={24} sm={12}>
          {dataTimestamp && (
            <Text type="secondary" style={{ 
              fontSize: screens.xs ? '10px' : '12px',
              display: 'block'
            }}>
              Last updated: {new Date(dataTimestamp).toLocaleString()}
              {filters.autoRefresh && (
                <Tag color="#10b981" style={{ marginLeft: 8, fontSize: screens.xs ? '9px' : '10px' }}>
                  Auto-refresh ON
                </Tag>
              )}
            </Text>
          )}
        </Col>
        <Col xs={24} sm={12}>
          {(filters.dateRange || filters.shop !== 'all' || filters.paymentMethod || filters.transactionType) && (
            <Space wrap style={{ justifyContent: screens.xs ? 'flex-start' : 'flex-end' }}>
              <Text type="secondary" style={{ fontSize: screens.xs ? '10px' : '12px' }}>
                Active filters:
              </Text>
              {filters.dateRange && (
                <Tag color="#3b82f6" style={{ fontSize: screens.xs ? '9px' : '10px' }}>
                  {filters.dateRange[0].format('MM/DD')} - {filters.dateRange[1].format('MM/DD')}
                </Tag>
              )}
              {filters.shop !== 'all' && (
                <Tag color="#10b981" style={{ fontSize: screens.xs ? '9px' : '10px' }}>
                  Shop: {shops.find(s => s._id === filters.shop)?.name || filters.shop}
                </Tag>
              )}
              {filters.paymentMethod && (
                <Tag color="#f59e0b" style={{ fontSize: screens.xs ? '9px' : '10px' }}>
                  Payment: {filters.paymentMethod.toUpperCase()}
                </Tag>
              )}
              {filters.transactionType && (
                <Tag color="#8b5cf6" style={{ fontSize: screens.xs ? '9px' : '10px' }}>
                  Type: {filters.transactionType.toUpperCase()}
                </Tag>
              )}
            </Space>
          )}
        </Col>
      </Row>

      {/* Filters Section - Collapsible */}
      {filterVisible && (
        <Card 
          style={{ 
            marginBottom: 24,
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
            // Mobile optimization
            padding: screens.xs ? '12px' : '16px'
          }}
          title={
            <Space>
              <FilterOutlined style={{ color: '#2563eb' }} />
              <Text strong style={{ 
                fontSize: screens.xs ? '14px' : '16px',
                fontWeight: '600'
              }}>Transaction Filters</Text>
            </Space>
          }
          extra={
            <Button 
              size={screens.xs ? "small" : "middle"} 
              onClick={handleClearFilters}
              style={{ 
                color: '#ef4444', 
                borderColor: '#ef4444',
                minWidth: screens.xs ? '60px' : 'auto'
              }}
            >
              Clear All
            </Button>
          }
        >
          <Row gutter={[12, 12]}>
            <Col span={24}>
              <Input
                placeholder="Search transactions... (product name, customer, cashier, shop, transaction ID)"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: '100%' }}
                allowClear
                size={screens.xs ? "middle" : "large"}
                // Mobile input optimization
                inputMode="search"
                enterKeyHint="search"
              />
            </Col>
            
            <Col xs={24} sm={12} md={6} lg={4}>
              <ShopFilter 
                value={filters.shop}
                onChange={(value) => handleFilterChange('shop', value)}
              />
            </Col>

            <Col xs={24} sm={12} md={6} lg={4}>
              <TimeRangeFilter 
                value={filters.timeRange}
                onChange={(value) => handleFilterChange('timeRange', value)}
              />
            </Col>

            <Col xs={24} sm={12} md={6} lg={4}>
              <PaymentModeFilter 
                value={filters.paymentMethod}
                onChange={(value) => handleFilterChange('paymentMethod', value)}
              />
            </Col>

            <Col xs={24} sm={12} md={6} lg={4}>
              <TransactionTypeFilter 
                value={filters.transactionType}
                onChange={(value) => handleFilterChange('transactionType', value)}
              />
            </Col>

            {filters.timeRange === 'custom' && (
              <Col xs={24} sm={24} md={8} lg={6}>
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ 
                      fontSize: screens.xs ? '12px' : '13px',
                      fontWeight: '600'
                    }}>Custom Date Range:</Text>
                  </div>
                  <RangePicker
                    onChange={(dates) => handleFilterChange('dateRange', dates)}
                    value={filters.dateRange}
                    style={{ width: '100%' }}
                    allowClear
                    size={screens.xs ? "small" : "middle"}
                    placeholder={['Start Date', 'End Date']}
                    // Mobile date picker optimization
                    format="DD/MM/YYYY"
                  />
                </div>
              </Col>
            )}
          </Row>

          {/* Active Filters Display */}
          <div style={{ 
            marginTop: 16, 
            padding: screens.xs ? '10px 12px' : '12px 16px', 
            backgroundColor: '#eff6ff', 
            borderRadius: '12px',
            border: '1px solid #dbeafe'
          }}>
            <Text strong style={{ 
              fontSize: screens.xs ? '12px' : '13px',
              fontWeight: '600'
            }}>Active Filters: </Text>
            <Space wrap style={{ marginTop: 8 }}>
              <Tag color="#3b82f6" style={{ fontSize: screens.xs ? '9px' : '10px' }}>
                Shop: {getShopNameForDisplay()}
              </Tag>
              {filters.timeRange && (
                <Tag color="#3b82f6" style={{ fontSize: screens.xs ? '9px' : '10px' }}>
                  Time: {TIME_RANGE_OPTIONS.find(opt => opt.value === filters.timeRange)?.label || filters.timeRange.toUpperCase()}
                </Tag>
              )}
              {filters.paymentMethod && (
                <Tag color="#10b981" style={{ fontSize: screens.xs ? '9px' : '10px' }}>
                  Payment: {filters.paymentMethod.toUpperCase()}
                </Tag>
              )}
              {filters.transactionType && (
                <Tag color="#8b5cf6" style={{ fontSize: screens.xs ? '9px' : '10px' }}>
                  Type: {filters.transactionType.toUpperCase()}
                </Tag>
              )}
              {searchText && (
                <Tag color="#f59e0b" style={{ fontSize: screens.xs ? '9px' : '10px' }}>
                  Search: "{searchText}"
                </Tag>
              )}
            </Space>
            <div style={{ marginTop: 12 }}>
              <Text strong style={{ 
                fontSize: screens.xs ? '11px' : '12px',
                fontWeight: '600'
              }}>Transaction Counts: </Text>
              <Space wrap style={{ marginTop: 4 }}>
                <Badge count={transactionTypeCounts.total} showZero color="#2563eb" style={{ fontSize: screens.xs ? '10px' : '11px' }} />
                <Text type="secondary" style={{ fontSize: screens.xs ? '10px' : '11px' }}>Total Transactions</Text>
              </Space>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <Alert
          message="Error Loading Data"
          description={error}
          type="error"
          style={{ 
            marginBottom: 16,
            borderRadius: '12px',
            fontSize: screens.xs ? '12px' : '14px'
          }}
          closable
          onClose={() => setError(null)}
        />
      )}

      {loading && !dashboardData.recentTransactions.length ? (
        <div style={{ 
          textAlign: 'center', 
          padding: screens.xs ? '30px 16px' : '50px', 
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <Spin size="large" />
          <div style={{ 
            marginTop: 16, 
            color: '#6b7280', 
            fontSize: screens.xs ? '12px' : '14px',
            fontWeight: '500'
          }}>
            Loading comprehensive transaction data...
          </div>
        </div>
      ) : (
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          style={{
            background: 'white',
            padding: screens.xs ? '12px' : '16px',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
            // Mobile optimization
            overflow: 'hidden'
          }}
          tabBarStyle={{ margin: 0 }}
          size={screens.xs ? "small" : "middle"}
          // Mobile tab optimization
          moreIcon={screens.xs ? null : undefined}
        >
          <Tabs.TabPane 
            tab={
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                padding: screens.xs ? '4px 8px' : '8px 12px'
              }}>
                <PieChartOutlined style={{ fontSize: screens.xs ? '12px' : '14px' }} />
                <span style={{ 
                  fontSize: screens.xs ? '11px' : '13px',
                  fontWeight: '500'
                }}>Overview</span>
                <Badge 
                  count={dashboardData?.recentTransactions?.length || 0} 
                  overflowCount={999} 
                  style={{ 
                    marginLeft: 4, 
                    fontSize: screens.xs ? '9px' : '10px',
                    background: '#2563eb'
                  }} 
                />
              </span>
            } 
            key="overview"
          >
            {renderOverviewTab()}
          </Tabs.TabPane>

          <Tabs.TabPane 
            tab={
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                padding: screens.xs ? '4px 8px' : '8px 12px'
              }}>
                <TableOutlined style={{ fontSize: screens.xs ? '12px' : '14px' }} />
                <span style={{ 
                  fontSize: screens.xs ? '11px' : '13px',
                  fontWeight: '500'
                }}>Transactions</span>
                <Badge 
                  count={filteredTransactions.length} 
                  overflowCount={999} 
                  style={{ 
                    marginLeft: 4, 
                    fontSize: screens.xs ? '9px' : '10px',
                    background: '#2563eb'
                  }} 
                />
              </span>
            } 
            key="details"
          >
            <Card
              style={{
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb',
                padding: screens.xs ? '12px' : '16px',
                // Mobile optimization
                overflow: 'hidden'
              }}
              bodyStyle={{ padding: 0 }}
            >
              <div style={{ 
                padding: screens.xs ? '12px 8px' : '16px', 
                borderBottom: '1px solid #f3f4f6' 
              }}>
                <Text strong style={{ 
                  fontSize: screens.xs ? '13px' : '15px',
                  fontWeight: '600'
                }}>
                  Showing {filteredTransactions.length} of {dashboardData?.recentTransactions?.length || 0} transactions
                </Text>
                {filters.shop !== 'all' && (
                  <Text type="secondary" style={{ 
                    fontSize: screens.xs ? '11px' : '13px',
                    fontWeight: '400'
                  }}>
                    {' '}for {getShopNameForDisplay()}
                  </Text>
                )}
                {dashboardData?.financialStats && (
                  <div style={{ marginTop: 8 }}>
                    <Row gutter={[8, 8]}>
                      <Col xs={12} sm={6}>
                        <Tag color="#2563eb" style={{ 
                          fontSize: screens.xs ? '10px' : '11px', 
                          width: '100%',
                          fontWeight: '500'
                        }}>
                          Revenue: {CalculationUtils.formatCurrency(dashboardData.financialStats.totalRevenue)}
                        </Tag>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Tag color="#10b981" style={{ 
                          fontSize: screens.xs ? '10px' : '11px', 
                          width: '100%',
                          fontWeight: '500'
                        }}>
                          Profit: {CalculationUtils.formatCurrency(dashboardData.financialStats.netProfit)}
                        </Tag>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Tag color="#f59e0b" style={{ 
                          fontSize: screens.xs ? '10px' : '11px', 
                          width: '100%',
                          fontWeight: '500'
                        }}>
                          Total Transactions: {dashboardData.financialStats.totalSales}
                        </Tag>
                      </Col>
                    </Row>
                  </div>
                )}
              </div>
              <div style={{ 
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
                // Mobile optimization
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
              }}>
                <Table
                  columns={columns}
                  dataSource={filteredTransactions}
                  rowKey={(record) => record._id || record.transactionNumber || Math.random()}
                  loading={loading}
                  pagination={{
                    pageSize: screens.xs ? 10 : 20,
                    showSizeChanger: !screens.xs,
                    showQuickJumper: !screens.xs,
                    showTotal: !screens.xs ? (total, range) =>
                      `${range[0]}-${range[1]} of ${total} transactions` : undefined,
                    size: screens.xs ? "small" : "default",
                    simple: screens.xs,
                    // Mobile pagination optimization
                    position: ['bottomCenter']
                  }}
                  scroll={{ x: screens.xs ? 600 : 2000 }}
                  locale={{ 
                    emptyText: filteredTransactions.length === 0 && dashboardData?.recentTransactions?.length > 0 ? 
                      'No transactions match your search' : 
                      <Empty 
                        description={
                          <Text style={{ 
                            color: '#6b7280', 
                            fontSize: screens.xs ? '12px' : '14px',
                            fontWeight: '500'
                          }}>
                            No transactions found
                          </Text>
                        }
                        imageStyle={{ height: screens.xs ? 60 : 80 }}
                      />
                  }}
                  size={screens.xs ? "small" : "middle"}
                  // Mobile table optimization
                  sticky={screens.xs}
                />
              </div>
            </Card>
          </Tabs.TabPane>
        </Tabs>
      )}

      <TransactionDetailsModal
        transaction={selectedTransaction}
        visible={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
      />
    </div>
  );
};

export default TransactionsReport;