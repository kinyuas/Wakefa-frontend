// src/pages/Admin/TransactionReports.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Table,
  Card,
  Typography,
  Input,
  Button,
  DatePicker,
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
  Grid,
  Layout,
  Flex,
  Dropdown,
  FloatButton,
  Segmented,
  theme,
  Divider
} from 'antd';
import {
  // Core icons
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
  MobileOutlined,
  TabletOutlined,
  DesktopOutlined,
  MenuOutlined,
  CloseOutlined,
  DownloadOutlined,
  PrinterOutlined,
  ShareAltOutlined,
  InfoCircleOutlined,
  RiseOutlined,
  FallOutlined,
  MoneyCollectOutlined,
  BankOutlined,
  PhoneOutlined,
  CalculatorOutlined,
  ShoppingCartOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  BarcodeOutlined,
  LineChartOutlined,
  AreaChartOutlined,
  CreditCardOutlined,
  WalletOutlined,
  PercentageOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  StockOutlined,
  
  // Additional icons needed
  DatabaseOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ShopFilled
} from '@ant-design/icons';
import { unifiedAPI, shopAPI } from '../../services/api';
import { CalculationUtils } from '../../utils/calculationUtils';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import relativeTime from 'dayjs/plugin/relativeTime';

// Extend dayjs with plugins
dayjs.extend(advancedFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(relativeTime);

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { Header, Content, Footer } = Layout;
const { useToken } = theme;

// =============================================
// CONSTANTS AND CONFIGURATION
// =============================================

const TIME_RANGE_OPTIONS = [
  { label: 'Today', value: 'daily', icon: <CalendarOutlined /> },
  { label: 'Last 7 Days', value: '7d', icon: <ClockCircleOutlined /> },
  { label: 'Last 30 Days', value: '30d', icon: <AreaChartOutlined /> },
  { label: 'This Year', value: 'yearly', icon: <LineChartOutlined /> },
  { label: 'All Time', value: 'all', icon: <DatabaseOutlined /> },
  { label: 'Custom Range', value: 'custom', icon: <FilterOutlined /> }
];

const PAYMENT_METHOD_OPTIONS = [
  { label: 'All Payments', value: '', icon: <WalletOutlined /> },
  { label: 'Cash', value: 'cash', icon: <MoneyCollectOutlined />, color: '#52c41a' },
  { label: 'M-Pesa/Bank', value: 'mpesa_bank', icon: <BankOutlined />, color: '#1890ff' }
];

const TRANSACTION_TYPE_OPTIONS = [
  { label: 'All Transactions', value: '', icon: <ShoppingCartOutlined /> },
  { label: 'Complete Transactions', value: 'complete', icon: <CheckCircleOutlined /> }
];

const STATUS_CONFIG = {
  completed: { color: '#10b981', text: 'COMPLETED', icon: <CheckCircleOutlined /> },
  pending: { color: '#f59e0b', text: 'PENDING', icon: <ClockCircleOutlined /> },
  refunded: { color: '#3b82f6', text: 'REFUNDED', icon: <ReloadOutlined /> },
  cancelled: { color: '#ef4444', text: 'CANCELLED', icon: <CloseOutlined /> }
};

const PAYMENT_METHOD_CONFIG = {
  cash: { color: '#52c41a', text: 'CASH', icon: <MoneyCollectOutlined /> },
  mpesa: { color: '#1890ff', text: 'MPESA', icon: <PhoneOutlined /> },
  bank: { color: '#722ed1', text: 'BANK', icon: <BankOutlined /> },
  mpesa_bank: { color: '#1890ff', text: 'MPESA/BANK', icon: <BankOutlined /> }
};

// =============================================
// AI-ENHANCED RESPONSIVE COMPONENTS
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
        marginBottom: screens.xs ? '16px' : '24px',
        ...style
      }}
      headStyle={{ 
        padding: screens.xs ? '12px 16px' : '16px 24px',
        borderBottom: `1px solid ${token.colorBorder}`,
        background: screens.xs ? 'white' : 'transparent'
      }}
      bodyStyle={{ 
        padding: screens.xs ? '16px' : '24px'
      }}
      loading={loading}
      {...props}
    >
      {children}
    </Card>
  );
};

const ResponsiveStatCard = ({ title, value, prefix, suffix, icon, color, trend, children, loading }) => {
  const screens = useBreakpoint();
  const { token } = useToken();
  
  const getIconSize = () => {
    if (screens.xxl) return 40;
    if (screens.xl) return 36;
    if (screens.lg) return 32;
    if (screens.md) return 28;
    if (screens.sm) return 26;
    return 24;
  };
  
  return (
    <Card
      style={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}15, ${color}08)`,
        borderRadius: '12px',
        border: `1px solid ${color}20`,
        transition: 'all 0.3s ease',
      }}
      hoverable
      bodyStyle={{ 
        padding: screens.xs ? '16px' : '20px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
      loading={loading}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '8px'
          }}>
            <div style={{
              background: `${color}15`,
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {React.cloneElement(icon, { 
                style: { 
                  color, 
                  fontSize: getIconSize(),
                  transition: 'all 0.3s ease'
                }
              })}
            </div>
            <Text strong style={{ 
              color: token.colorTextSecondary,
              fontSize: screens.xs ? '12px' : '14px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {title}
            </Text>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'baseline',
            gap: '4px',
            flexWrap: 'wrap'
          }}>
            {prefix && (
              <Text style={{ 
                color: token.colorTextTertiary,
                fontSize: screens.xs ? '12px' : '14px'
              }}>
                {prefix}
              </Text>
            )}
            <Text strong style={{ 
              color,
              fontSize: screens.xs ? '22px' : '28px',
              fontWeight: 700,
              lineHeight: 1.2
            }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Text>
            {suffix && (
              <Text style={{ 
                color: token.colorTextTertiary,
                fontSize: screens.xs ? '12px' : '14px'
              }}>
                {suffix}
              </Text>
            )}
          </div>
          
          {trend && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '4px',
              marginTop: '4px'
            }}>
              {trend.direction === 'up' ? (
                <RiseOutlined style={{ color: token.colorSuccess, fontSize: '12px' }} />
              ) : (
                <FallOutlined style={{ color: token.colorError, fontSize: '12px' }} />
              )}
              <Text style={{ 
                color: trend.direction === 'up' ? token.colorSuccess : token.colorError,
                fontSize: '12px',
                fontWeight: 500
              }}>
                {trend.value}%
              </Text>
            </div>
          )}
        </div>
      </div>
      
      {children && (
        <div style={{ 
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${token.colorBorder}` 
        }}>
          {children}
        </div>
      )}
    </Card>
  );
};

const TransactionItem = ({ transaction, screens, colors, onView }) => {
  const { token } = useToken();
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div 
      style={{ 
        marginBottom: '12px', 
        padding: screens.xs ? '12px' : '16px',
        borderRadius: '10px',
        backgroundColor: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        ':hover': {
          borderColor: colors.primary,
          boxShadow: `0 2px 8px ${colors.primary}15`
        }
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ width: '100%' }}>
        <Flex vertical={screens.xs} gap={screens.xs ? 'small' : 'middle'} justify="space-between">
          <Flex vertical gap="small" style={{ flex: 1, minWidth: 0 }}>
            <Flex align="center" gap="small" wrap="wrap">
              <FileTextOutlined style={{ color: colors.primary, fontSize: '14px' }} />
              <Text strong style={{ 
                fontSize: screens.xs ? '13px' : '14px',
                color: token.colorTextHeading,
                flex: 1,
                minWidth: 0
              }}>
                {transaction.transactionNumber || `TXN-${transaction._id?.substring(0, 6)}`}
              </Text>
              <Tag 
                color={PAYMENT_METHOD_CONFIG[transaction.paymentMethod]?.color || '#6b7280'}
                style={{ 
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontWeight: '500',
                  fontSize: '10px',
                  margin: 0
                }}
              >
                {transaction.paymentMethod?.toUpperCase() || 'CASH'}
              </Tag>
            </Flex>
            
            <Flex align="center" gap="small" wrap="wrap">
              <CalendarOutlined style={{ fontSize: '11px', color: token.colorTextTertiary }} />
              <Text style={{ 
                fontSize: '11px', 
                color: token.colorTextTertiary,
              }}>
                {dayjs(transaction.saleDate || transaction.createdAt).format('MMM D, YYYY h:mm A')}
              </Text>
            </Flex>
            
            {expanded && transaction.items && (
              <div style={{ 
                marginTop: '8px',
                padding: '8px',
                background: token.colorBgLayout,
                borderRadius: '6px',
                fontSize: '12px'
              }}>
                {transaction.items.map((item, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: index < transaction.items.length - 1 ? `1px dashed ${token.colorBorder}` : 'none'
                  }}>
                    <Text style={{ fontSize: '11px' }}>
                      {item.productName || item.name} × {item.quantity}
                    </Text>
                    <Text style={{ fontSize: '11px', fontWeight: 500 }}>
                      KES {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </Flex>
          
          <Flex vertical align={screens.xs ? "flex-start" : "flex-end"} gap="small">
            <Text strong style={{ 
              fontSize: screens.xs ? '18px' : '20px', 
              color: colors.success,
              textAlign: screens.xs ? 'left' : 'right'
            }}>
              {CalculationUtils.formatCurrency(transaction.totalAmount || 0)}
            </Text>
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onView(transaction);
              }}
              style={{ borderRadius: '6px' }}
            >
              View
            </Button>
          </Flex>
        </Flex>
      </div>
    </div>
  );
};

// =============================================
// MAIN COMPONENT - TRANSACTIONS REPORT
// =============================================

const TransactionsReport = ({ currentUser }) => {
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
  
  // State management
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
  
  // Filters - REMOVED autoRefresh from initial state
  const [filters, setFilters] = useState({
    dateRange: null,
    shop: 'all',
    paymentMethod: '',
    transactionType: '',
    timeRange: '30d'
    // autoRefresh removed
  });
  
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [shops, setShops] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [dataTimestamp, setDataTimestamp] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(!isMobile);
  const [viewMode, setViewMode] = useState('grid'); // grid or list for mobile
  const [timeFilter, setTimeFilter] = useState('30d');
  const [customDateRange, setCustomDateRange] = useState(null);
  
  // Refs
  const searchInputRef = useRef(null);
  
  // Device-aware layout configuration
  const layoutConfig = useMemo(() => ({
    isMobile,
    isTablet,
    isDesktop,
    deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
    orientation: screens.height > screens.width ? 'portrait' : 'landscape',
    
    // Responsive column spans
    cols: {
      stats: isMobile ? 24 : isTablet ? 12 : 6,
      charts: isMobile ? 24 : isTablet ? 24 : 12,
    },
    
    // Padding and spacing
    padding: isMobile ? '12px' : isTablet ? '16px' : '24px',
    gap: isMobile ? '8px' : isTablet ? '12px' : '16px',
    
    // Font sizes
    fontSize: {
      title: isMobile ? '16px' : isTablet ? '18px' : '20px',
      subtitle: isMobile ? '12px' : isTablet ? '13px' : '14px',
      stat: isMobile ? '20px' : isTablet ? '24px' : '28px',
      body: isMobile ? '12px' : isTablet ? '13px' : '14px',
    }
  }), [isMobile, isTablet, isDesktop, screens]);

  const fetchDashboardData = async (customFilters = null) => {
    const activeFilters = customFilters || filters;
    
    console.log('🚀 Fetching transaction report data...', activeFilters);
    
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      // Fetch shops first for filtering
      let shopsData = [];
      try {
        shopsData = await shopAPI.getAll();
      } catch (shopError) {
        console.error('Error fetching shops:', shopError);
        shopsData = [];
      }
      
      setShops(shopsData);

      // Build params for unified API
      const params = {};
      
      // Apply date range filter
      if (activeFilters.dateRange && activeFilters.dateRange[0] && activeFilters.dateRange[1]) {
        params.startDate = activeFilters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = activeFilters.dateRange[1].format('YYYY-MM-DD');
      } else if (customDateRange && activeFilters.timeRange === 'custom') {
        params.startDate = customDateRange[0].format('YYYY-MM-DD');
        params.endDate = customDateRange[1].format('YYYY-MM-DD');
      }
      
      // Apply shop filter
      if (activeFilters.shop && activeFilters.shop !== 'all') {
        params.shopId = activeFilters.shop;
      }

      // Use unified API endpoint
      let comprehensiveData = null;
      try {
        comprehensiveData = await unifiedAPI.getCombinedTransactions(params);
      } catch (apiError) {
        console.error('Error fetching combined transactions:', apiError);
        comprehensiveData = { salesWithProfit: [], financialStats: CalculationUtils.getDefaultStats() };
      }
      
      console.log('📊 Unified API response:', {
        transactions: comprehensiveData.salesWithProfit?.length,
        financialStats: comprehensiveData.financialStats
      });

      // Process data
      const processedData = processDashboardData(comprehensiveData, shopsData, activeFilters);

      setDashboardData(processedData);
      setDataTimestamp(new Date().toISOString());
      
      console.log('✅ Transaction Report data processed:', {
        totalRevenue: processedData.financialStats.totalRevenue,
        netProfit: processedData.financialStats.netProfit,
        recentTransactions: processedData.recentTransactions.length
      });
      

    } catch (error) {
      console.error('💥 Transaction Report fetch failed:', error);
      setError(error.message || 'Failed to load transaction data');
    } finally {
      setLoading(false);
    }
  };

  // Data processing function
  const processDashboardData = (comprehensiveData, shops, activeFilters) => {
    console.log('🔄 Processing transaction report data...');
    
    // Use CalculationUtils to process data
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

    // Apply additional filters
    let filteredTransactions = transactions;
    
    // Apply payment method filter
    if (activeFilters.paymentMethod) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.paymentMethod === activeFilters.paymentMethod
      );
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

    // Recent transactions
    const recentTransactions = filteredTransactions
      .sort((a, b) => new Date(b.saleDate || b.createdAt) - new Date(a.saleDate || a.createdAt));

    // Low stock products
    const lowStockProducts = products.filter(p => 
      CalculationUtils.safeNumber(p.currentStock) <= CalculationUtils.safeNumber(p.minStockLevel, 5)
    ).slice(0, 5);

    // Top products
    const topProducts = CalculationUtils.calculateTopProducts(filteredTransactions, 10);

    // Shop performance
    const shopPerformance = CalculationUtils.calculateShopPerformance(filteredTransactions, shops);

    // Cashier performance
    const cashierPerformance = CalculationUtils.calculateCashierPerformance(filteredTransactions, cashiers);

    // Enhanced financial stats
    const enhancedFinancialStats = {
      ...financialStats,
      totalRevenue: financialStats.totalRevenue || 0,
      netProfit: financialStats.netProfit || 0,
      totalSales: financialStats.totalSales || filteredTransactions.length,
      totalExpenses: financialStats.totalExpenses || expenses.reduce((sum, e) => sum + CalculationUtils.safeNumber(e.amount), 0),
      costOfGoodsSold: financialStats.costOfGoodsSold || filteredTransactions.reduce((sum, t) => {
        if (t.cost) return sum + CalculationUtils.safeNumber(t.cost);
        return sum + CalculationUtils.calculateCostFromItems(t);
      }, 0),
      grossProfit: financialStats.grossProfit || parseFloat((financialStats.totalRevenue - (financialStats.costOfGoodsSold || 0)).toFixed(2)),
      profitMargin: financialStats.profitMargin || CalculationUtils.calculateProfitMargin(financialStats.totalRevenue, financialStats.grossProfit),
      totalCash: financialStats.totalCash || filteredTransactions.filter(t => t.paymentMethod === 'cash').reduce((sum, t) => sum + (t.totalAmount || 0), 0),
      totalMpesaBank: financialStats.totalMpesaBank || filteredTransactions.filter(t => ['mpesa', 'bank', 'mpesa_bank'].includes(t.paymentMethod)).reduce((sum, t) => sum + (t.totalAmount || 0), 0)
    };

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
    if (timeFilter !== 'custom') {
      const newDateRange = calculateDateRange(timeFilter);
      setFilters(prev => ({ ...prev, dateRange: newDateRange, timeRange: timeFilter }));
    }
  }, [timeFilter, calculateDateRange]);

  // Handle time filter change
  const handleTimeFilterChange = (value) => {
    setTimeFilter(value);
    if (value !== 'custom') {
      setCustomDateRange(null);
      const newDateRange = calculateDateRange(value);
      setFilters(prev => ({ ...prev, dateRange: newDateRange, timeRange: value }));
    } else {
      setFilters(prev => ({ ...prev, timeRange: 'custom' }));
    }
  };

  // Handle custom date change
  const handleCustomDateChange = (dates) => {
    setCustomDateRange(dates);
    if (dates) {
      setFilters(prev => ({ 
        ...prev, 
        dateRange: dates,
        timeRange: 'custom'
      }));
    }
  };

  // AUTO-REFRESH EFFECT COMPLETELY REMOVED

  // Auto-fetch data when filters change
  useEffect(() => {
    fetchDashboardData();
  }, [filters.shop, filters.timeRange, filters.paymentMethod, filters.transactionType, filters.dateRange]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    if (key !== 'dateRange') {
      fetchDashboardData(newFilters);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setTimeFilter('30d');
    setCustomDateRange(null);
    const clearedFilters = {
      dateRange: calculateDateRange('30d'),
      shop: 'all',
      paymentMethod: '',
      transactionType: '',
      timeRange: '30d'
      // autoRefresh removed
    };
    setFilters(clearedFilters);
    fetchDashboardData(clearedFilters);
   
  };

  // Manual refresh only (no auto-refresh)
  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      await fetchDashboardData(filters);
    } catch (error) {
      console.error('Manual refresh failed:', error);
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
        financialStats: dashboardData.financialStats,
        transactions: dashboardData.recentTransactions,
        shopPerformance: dashboardData.shopPerformance,
        cashierPerformance: dashboardData.cashierPerformance,
        topProducts: dashboardData.topProducts
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

    } catch (error) {
      console.error('Export failed:', error);
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

  // Get shop name for display
  const getShopNameForDisplay = () => {
    if (filters.shop === 'all') return 'All Shops';
    const foundShop = shops.find(s => s._id === filters.shop);
    return foundShop?.name || 'Selected Shop';
  };

  // Format full number
  const formatFullNumber = (num) => {
    if (typeof num !== 'number') return '0';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Responsive table columns
  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: 'Transaction ID',
        dataIndex: '_id',
        key: 'transactionId',
        render: (id, record) => (
          <Tooltip title={id}>
            <Text code style={{ 
              cursor: 'pointer',
              fontSize: isMobile ? '10px' : '12px',
              fontWeight: 'bold'
            }}>
              {record.transactionNumber || (id ? `${id.substring(0, 6)}...` : 'N/A')}
            </Text>
          </Tooltip>
        ),
        width: isMobile ? 80 : 120,
        fixed: 'left',
        responsive: ['xs', 'sm', 'md', 'lg']
      },
      {
        title: 'Date & Time',
        dataIndex: 'saleDate',
        key: 'date',
        render: (date) => (
          <div>
            <div style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: '500' }}>
              {dayjs(date).format('DD/MM/YYYY')}
            </div>
            <div style={{ fontSize: isMobile ? '9px' : '10px', color: '#666' }}>
              {dayjs(date).format('HH:mm')}
            </div>
          </div>
        ),
        width: isMobile ? 80 : 130,
        sorter: (a, b) => new Date(a.saleDate) - new Date(b.saleDate),
        responsive: ['xs', 'sm', 'md', 'lg']
      },
      {
        title: 'Customer',
        dataIndex: 'customerName',
        key: 'customerName',
        render: (name) => (
          <Text ellipsis style={{ fontSize: isMobile ? '11px' : '13px' }}>
            {name || 'Walk-in'}
          </Text>
        ),
        width: isMobile ? 80 : 120,
        responsive: ['xs', 'sm', 'md', 'lg']
      },
      {
        title: 'Shop',
        dataIndex: 'shop',
        key: 'shop',
        render: (shop) => {
          if (!shop) return <Text type="secondary">N/A</Text>;
          if (typeof shop === 'string') return <Text>{shop}</Text>;
          if (typeof shop === 'object') return <Text>{shop.name || 'Unknown'}</Text>;
          return <Text type="secondary">N/A</Text>;
        },
        width: 120,
        responsive: ['md', 'lg']
      },
      {
        title: 'Cashier',
        dataIndex: 'cashierName',
        key: 'cashierName',
        render: (name) => (
          <Text ellipsis style={{ fontSize: isMobile ? '11px' : '13px' }}>
            {name || 'Unknown'}
          </Text>
        ),
        width: 100,
        responsive: ['md', 'lg']
      },
      {
        title: 'Type',
        key: 'transactionType',
        width: isMobile ? 70 : 90,
        render: () => (
          <Tag 
            color="#10b981"
            style={{ 
              fontSize: isMobile ? '9px' : '11px',
              fontWeight: 'bold',
              margin: 0,
              padding: isMobile ? '2px 6px' : '4px 8px'
            }}
          >
            COMPLETE
          </Tag>
        ),
        responsive: ['xs', 'sm', 'md', 'lg']
      },
      {
        title: 'Amount',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        render: (amount) => (
          <div>
            <Text strong style={{ 
              color: colors.primary,
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: '600'
            }}>
              {CalculationUtils.formatCurrency(amount)}
            </Text>
          </div>
        ),
        sorter: (a, b) => (a.totalAmount || 0) - (b.totalAmount || 0),
        width: isMobile ? 90 : 110,
        responsive: ['xs', 'sm', 'md', 'lg']
      },
      {
        title: 'Profit',
        dataIndex: 'profit',
        key: 'profit',
        render: (profit) => (
          <Text strong style={{ 
            color: CalculationUtils.getProfitColor(profit),
            fontSize: isMobile ? '12px' : '14px',
            fontWeight: '600'
          }}>
            {CalculationUtils.formatCurrency(profit || 0)}
          </Text>
        ),
        sorter: (a, b) => (a.profit || 0) - (b.profit || 0),
        width: isMobile ? 90 : 110,
        responsive: ['md', 'lg']
      },
      {
        title: 'Margin',
        dataIndex: 'profitMargin',
        key: 'profitMargin',
        render: (margin) => (
          <Text strong style={{ 
            color: colors.success,
            fontSize: isMobile ? '11px' : '13px',
            fontWeight: '600'
          }}>
            {CalculationUtils.safeNumber(margin, 0).toFixed(1)}%
          </Text>
        ),
        width: isMobile ? 70 : 80,
        responsive: ['md', 'lg']
      },
      {
        title: 'Payment',
        key: 'paymentMethod',
        width: isMobile ? 100 : 120,
        render: (_, record) => (
          <Tag 
            color={PAYMENT_METHOD_CONFIG[record.paymentMethod]?.color || '#6b7280'}
            style={{ 
              fontSize: isMobile ? '9px' : '11px',
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
        width: isMobile ? 60 : 80,
        fixed: 'right',
        render: (_, record) => (
          <Button
            type="primary"
            icon={<EyeOutlined style={{ fontSize: isMobile ? '14px' : '16px' }} />}
            onClick={() => handleViewTransaction(record)}
            size="small"
            style={{ 
              padding: isMobile ? '2px 4px' : '4px 8px',
              background: colors.primary,
              border: 'none',
              borderRadius: '6px'
            }}
            title="View Details"
          />
        )
      }
    ];

    // For mobile, show minimal columns
    if (isMobile) {
      return baseColumns.filter(col => 
        col.responsive?.includes('xs') || col.fixed
      );
    }

    return baseColumns;
  }, [isMobile, colors, handleViewTransaction]);

  // Financial Overview Component
  const FinancialOverview = () => {
    const safeStats = dashboardData?.financialStats || CalculationUtils.getDefaultStats();
    const hasData = safeStats.totalSales > 0 || safeStats.totalRevenue > 0;

    // Stat card colors
    const statCardColors = [
      { bg: '#e0f2fe', border: '#bae6fd', title: '#0369a1', value: '#0c4a6e' },
      { bg: '#f0f9ff', border: '#7dd3fc', title: '#0ea5e9', value: '#0369a1' },
      { bg: '#fef3c7', border: '#fcd34d', title: '#d97706', value: '#92400e' },
      { bg: '#dcfce7', border: '#86efac', title: '#16a34a', value: '#166534' },
      { bg: '#fee2e2', border: '#fca5a5', title: '#dc2626', value: '#991b1b' },
      { bg: '#f5f3ff', border: '#c4b5fd', title: '#7c3aed', value: '#5b21b6' },
      { bg: '#fef9c3', border: '#fde047', title: '#ca8a04', value: '#854d0e' },
      { bg: '#fce7f3', border: '#f9a8d4', title: '#db2777', value: '#9d174d' },
      { bg: '#ecfdf5', border: '#a7f3d0', title: '#10b981', value: '#065f46' },
      { bg: '#f1f5f9', border: '#cbd5e1', title: '#64748b', value: '#334155' }
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
              minHeight: isMobile ? '120px' : '140px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
            bodyStyle={{ 
              padding: isMobile ? '14px 10px' : '16px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            <div style={{ marginBottom: isMobile ? '6px' : '8px' }}>
              <Text style={{ 
                color: color.title,
                fontSize: isMobile ? '13px' : '15px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block',
                lineHeight: '1.2'
              }}>
                {title}
              </Text>
            </div>
            
            <div style={{ 
              color: color.value,
              fontSize: isMobile ? '18px' : '24px',
              fontWeight: '700',
              lineHeight: '1.2',
              marginBottom: '4px',
              textShadow: isMobile ? '0 1px 1px rgba(0,0,0,0.1)' : 'none'
            }}>
              {prefix} {formatFullNumber(value)}
            </div>
            
            {description && (
              <Text style={{ 
                color: '#6b7280',
                fontSize: isMobile ? '9px' : '11px',
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
                fontSize: isMobile ? '9px' : '10px',
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
      <DeviceAwareCard 
        title="Financial Overview"
        extra={
          <Tag color={colors.primary} style={{ 
            fontSize: isMobile ? '11px' : '12px',
            fontWeight: '500'
          }}>
            {getShopNameForDisplay()}
          </Tag>
        }
        loading={loading}
      >
        {!hasData && !loading && (
          <Alert
            message="No Transaction Data Available"
            description={
              <div style={{ fontSize: isMobile ? '12px' : '14px' }}>
                <p>No transactions found for the selected filters.</p>
                <ul>
                  <li>No transactions have been created yet</li>
                  <li>The selected date range has no transactions</li>
                  <li>The selected shop has no transactions</li>
                </ul>
              </div>
            }
            type="warning"
            showIcon
            style={{ 
              marginBottom: 16, 
              borderRadius: '12px',
              fontSize: isMobile ? '12px' : '14px'
            }}
          />
        )}

        <Row gutter={[layoutConfig.gap, layoutConfig.gap]} justify="center">
          <StatCard title="Total Sales" value={safeStats.totalSales} colorIndex={0} description={`${safeStats.totalSales || 0} transactions`} />
          <StatCard title="Total Revenue" value={safeStats.totalRevenue} colorIndex={1} description="All completed sales" />
          <StatCard title="Expenses" value={safeStats.totalExpenses} colorIndex={2} description="Operational costs" />
          <StatCard title="Gross Profit" value={safeStats.grossProfit} colorIndex={3} description="Revenue - COGS" />
          <StatCard title="Net Profit" value={safeStats.netProfit} colorIndex={4} description="After all expenses" />
          <StatCard title="Cost of Goods" value={safeStats.costOfGoodsSold} colorIndex={5} description="Total COGS" />
          <StatCard title="Total Mpesa/Bank" value={safeStats.totalMpesaBank} colorIndex={6} description="Digital payments" />
          <StatCard title="Total Cash" value={safeStats.totalCash} colorIndex={7} description="Cash payments" />
          <StatCard title="Profit Margin" value={safeStats.profitMargin} colorIndex={8} prefix="" suffix="%" description="Net profit margin" />
          <StatCard title="Avg Transaction" value={safeStats.totalSales > 0 ? safeStats.totalRevenue / safeStats.totalSales : 0} colorIndex={9} description="Average sale value" />
        </Row>
      </DeviceAwareCard>
    );
  };

  // Payment Composition Component
  const PaymentComposition = () => {
    const safeStats = dashboardData?.financialStats || CalculationUtils.getDefaultStats();
    const totalAmount = (safeStats.totalCash || 0) + (safeStats.totalMpesaBank || 0);
    const cashPercentage = totalAmount > 0 ? ((safeStats.totalCash || 0) / totalAmount * 100) : 0;
    const digitalPercentage = totalAmount > 0 ? ((safeStats.totalMpesaBank || 0) / totalAmount * 100) : 0;

    return (
      <DeviceAwareCard title="Payment Composition">
        <Row gutter={[layoutConfig.gap, layoutConfig.gap]}>
          <Col xs={24} md={12}>
            <Card
              style={{ 
                height: '100%',
                background: `linear-gradient(135deg, ${colors.success}15, ${colors.success}08)`,
                borderRadius: '12px',
                border: `1px solid ${colors.success}20`,
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <Flex vertical gap="middle">
                <Flex justify="space-between" align="center">
                  <Flex align="center" gap="small">
                    <div style={{
                      background: `${colors.success}20`,
                      borderRadius: '8px',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <MoneyCollectOutlined style={{ color: colors.success, fontSize: '20px' }} />
                    </div>
                    <div>
                      <Text strong style={{ fontSize: '16px', color: token.colorTextHeading }}>
                        Cash Payments
                      </Text>
                    </div>
                  </Flex>
                  <Tag color="green" style={{ fontSize: '12px', fontWeight: '500' }}>
                    {cashPercentage.toFixed(1)}%
                  </Tag>
                </Flex>
                
                <Text strong style={{ 
                  fontSize: isMobile ? '24px' : '28px', 
                  color: colors.success,
                  textAlign: 'center'
                }}>
                  {CalculationUtils.formatCurrency(safeStats.totalCash || 0)}
                </Text>
                
                <Progress 
                  percent={cashPercentage} 
                  strokeColor={colors.success}
                  strokeWidth={8}
                  showInfo={false}
                />
              </Flex>
            </Card>
          </Col>
          
          <Col xs={24} md={12}>
            <Card
              style={{ 
                height: '100%',
                background: `linear-gradient(135deg, ${colors.primary}15, ${colors.primary}08)`,
                borderRadius: '12px',
                border: `1px solid ${colors.primary}20`,
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <Flex vertical gap="middle">
                <Flex justify="space-between" align="center">
                  <Flex align="center" gap="small">
                    <div style={{
                      background: `${colors.primary}20`,
                      borderRadius: '8px',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <BankOutlined style={{ color: colors.primary, fontSize: '20px' }} />
                    </div>
                    <div>
                      <Text strong style={{ fontSize: '16px', color: token.colorTextHeading }}>
                        M-Pesa/Bank Payments
                      </Text>
                    </div>
                  </Flex>
                  <Tag color="blue" style={{ fontSize: '12px', fontWeight: '500' }}>
                    {digitalPercentage.toFixed(1)}%
                  </Tag>
                </Flex>
                
                <Text strong style={{ 
                  fontSize: isMobile ? '24px' : '28px', 
                  color: colors.primary,
                  textAlign: 'center'
                }}>
                  {CalculationUtils.formatCurrency(safeStats.totalMpesaBank || 0)}
                </Text>
                
                <Progress 
                  percent={digitalPercentage} 
                  strokeColor={colors.primary}
                  strokeWidth={8}
                  showInfo={false}
                />
              </Flex>
            </Card>
          </Col>
        </Row>

        {totalAmount > 0 && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: '20px',
            padding: '12px',
            backgroundColor: `${colors.primary}08`,
            borderRadius: '8px'
          }}>
            <Text type="secondary">
              {safeStats.totalCash > safeStats.totalMpesaBank ? (
                <>Cash payments are <Text strong style={{ color: colors.success }}>{(cashPercentage - digitalPercentage).toFixed(1)}% higher</Text> than digital payments</>
              ) : safeStats.totalMpesaBank > safeStats.totalCash ? (
                <>Digital payments are <Text strong style={{ color: colors.primary }}>{(digitalPercentage - cashPercentage).toFixed(1)}% higher</Text> than cash payments</>
              ) : (
                <>Cash and digital payments are balanced</>
              )}
            </Text>
          </div>
        )}
      </DeviceAwareCard>
    );
  };

  // Shop Performance Component
  const ShopPerformance = () => {
    const renderShopItem = (shop, index) => (
      <List.Item style={{ 
        padding: isMobile ? '12px 8px' : '16px 20px', 
        borderBottom: '1px solid #f3f4f6',
        touchAction: 'manipulation'
      }}>
        <div style={{ width: '100%' }}>
          <Row gutter={[16, 16]} align="middle" style={{ marginBottom: isMobile ? 8 : 12 }}>
            <Col flex="none">
              <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? colors.primary : '#9ca3af'}>
                <Avatar 
                  style={{ 
                    backgroundColor: index < 3 ? colors.primary : '#d1d5db',
                    color: '#ffffff',
                    fontSize: isMobile ? '14px' : '16px',
                    width: isMobile ? 36 : 40,
                    height: isMobile ? 36 : 40
                  }}
                  icon={<ShopOutlined />}
                />
              </Badge>
            </Col>
            <Col flex="auto">
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <Row justify="space-between" align="middle">
                  <Text strong style={{ 
                    fontSize: isMobile ? '13px' : '15px',
                    color: '#1f2937',
                    fontWeight: '600'
                  }}>
                    {shop.name}
                  </Text>
                  {index < 3 && (
                    <Tag color="#fbbf24" style={{ 
                      fontSize: isMobile ? '9px' : '10px',
                      padding: isMobile ? '1px 4px' : '2px 6px',
                      fontWeight: '500'
                    }}>
                      Top
                    </Tag>
                  )}
                </Row>
                <Space size={8} wrap>
                  <Tag color={colors.primary} style={{ fontSize: isMobile ? '9px' : '10px' }}>
                    {shop.transactions} transactions
                  </Tag>
                </Space>
              </Space>
            </Col>
          </Row>
          
          <Row gutter={[12, 12]} style={{ marginTop: isMobile ? 8 : 12 }}>
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#eff6ff',
                padding: isMobile ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: isMobile ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: isMobile ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Revenue
                </Text>
                <Text strong style={{ 
                  color: colors.primary,
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {CalculationUtils.formatCurrency(shop.revenue)}
                </Text>
              </div>
            </Col>
            
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#f0f9ff',
                padding: isMobile ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: isMobile ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: isMobile ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Transactions
                </Text>
                <Text strong style={{ 
                  color: colors.cyan,
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {shop.transactions}
                </Text>
              </div>
            </Col>
            
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#fefce8',
                padding: isMobile ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: isMobile ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: isMobile ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Margin
                </Text>
                <Text strong style={{ 
                  color: colors.success,
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {shop.profitMargin?.toFixed(1) || '0.0'}%
                </Text>
              </div>
            </Col>
          </Row>
        </div>
      </List.Item>
    );

    return (
      <DeviceAwareCard
        title="Shop Performance"
        extra={<Badge count={dashboardData.shopPerformance?.length || 0} showZero color={colors.primary} />}
        loading={loading}
      >
        {dashboardData.shopPerformance?.length > 0 ? (
          <List 
            dataSource={dashboardData.shopPerformance} 
            renderItem={renderShopItem}
            pagination={{ 
              pageSize: isMobile ? 3 : 5,
              size: isMobile ? 'small' : 'default',
              simple: isMobile
            }}
          />
        ) : (
          <Empty 
            description="No shop performance data available"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </DeviceAwareCard>
    );
  };

  // Cashier Performance Component
  const CashierPerformance = () => {
    const renderCashierItem = (cashier, index) => (
      <List.Item style={{ 
        padding: isMobile ? '12px 8px' : '16px 20px', 
        borderBottom: '1px solid #f3f4f6',
        touchAction: 'manipulation'
      }}>
        <div style={{ width: '100%' }}>
          <Row gutter={[16, 16]} align="middle" style={{ marginBottom: isMobile ? 8 : 12 }}>
            <Col flex="none">
              <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? colors.primary : '#9ca3af'}>
                <Avatar 
                  style={{ 
                    backgroundColor: index < 3 ? colors.primary : '#d1d5db',
                    color: '#ffffff',
                    fontSize: isMobile ? '14px' : '16px',
                    width: isMobile ? 36 : 40,
                    height: isMobile ? 36 : 40
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
                    fontSize: isMobile ? '13px' : '15px',
                    color: '#1f2937',
                    fontWeight: '600'
                  }}>
                    {cashier.name}
                  </Text>
                  {index < 3 && (
                    <Tag color="#fbbf24" style={{ 
                      fontSize: isMobile ? '9px' : '10px',
                      padding: isMobile ? '1px 4px' : '2px 6px',
                      fontWeight: '500'
                    }}>
                      Top
                    </Tag>
                  )}
                </Row>
                <Tag color={colors.primary} style={{ 
                  fontSize: isMobile ? '9px' : '10px',
                  padding: isMobile ? '1px 4px' : '2px 6px'
                }}>
                  {cashier.transactions} transactions
                </Tag>
              </Space>
            </Col>
          </Row>
          
          <Row gutter={[12, 12]} style={{ marginTop: isMobile ? 8 : 12 }}>
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#eff6ff',
                padding: isMobile ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: isMobile ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: isMobile ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Revenue
                </Text>
                <Text strong style={{ 
                  color: colors.primary,
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {CalculationUtils.formatCurrency(cashier.revenue)}
                </Text>
              </div>
            </Col>
            
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#f0fdf4',
                padding: isMobile ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: isMobile ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: isMobile ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Profit
                </Text>
                <Text strong style={{ 
                  color: CalculationUtils.getProfitColor(cashier.profit),
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {CalculationUtils.formatCurrency(cashier.profit)}
                </Text>
              </div>
            </Col>
            
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#fefce8',
                padding: isMobile ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: isMobile ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: isMobile ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Margin
                </Text>
                <Text strong style={{ 
                  color: colors.success,
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {cashier.profitMargin?.toFixed(1) || '0.0'}%
                </Text>
              </div>
            </Col>
          </Row>
        </div>
      </List.Item>
    );

    return (
      <DeviceAwareCard
        title="Cashier Performance"
        extra={<Badge count={dashboardData.cashierPerformance?.length || 0} showZero color={colors.primary} />}
        loading={loading}
      >
        {dashboardData.cashierPerformance?.length > 0 ? (
          <List 
            dataSource={dashboardData.cashierPerformance} 
            renderItem={renderCashierItem}
            pagination={{ 
              pageSize: isMobile ? 3 : 5,
              size: isMobile ? 'small' : 'default',
              simple: isMobile
            }}
          />
        ) : (
          <Empty 
            description="No cashier performance data available"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </DeviceAwareCard>
    );
  };

  // Product Performance Component
  const ProductPerformance = () => {
    const renderProductItem = (product, index) => (
      <List.Item style={{ 
        padding: isMobile ? '12px 8px' : '16px 20px', 
        borderBottom: '1px solid #f3f4f6',
        touchAction: 'manipulation'
      }}>
        <div style={{ width: '100%' }}>
          <Row gutter={[16, 16]} align="middle" style={{ marginBottom: isMobile ? 8 : 12 }}>
            <Col flex="none">
              <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? colors.purple : '#9ca3af'}>
                <Avatar 
                  style={{ 
                    backgroundColor: index < 3 ? colors.purple : '#d1d5db',
                    color: '#ffffff',
                    fontSize: isMobile ? '14px' : '16px',
                    width: isMobile ? 36 : 40,
                    height: isMobile ? 36 : 40
                  }}
                  icon={<AppstoreOutlined />}
                />
              </Badge>
            </Col>
            <Col flex="auto">
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <Row justify="space-between" align="middle">
                  <Text strong style={{ 
                    fontSize: isMobile ? '13px' : '15px',
                    color: '#1f2937',
                    fontWeight: '600'
                  }}>
                    {product.name}
                  </Text>
                  <Tag color={colors.primary} style={{ fontSize: isMobile ? '9px' : '10px' }}>
                    {product.totalSold} sold
                  </Tag>
                </Row>
                {index < 3 && (
                  <Tag color="#fbbf24" style={{ 
                    fontSize: isMobile ? '9px' : '10px',
                    width: 'fit-content',
                    fontWeight: '500'
                  }}>
                    Top Seller
                  </Tag>
                )}
              </Space>
            </Col>
          </Row>
          
          <Row gutter={[12, 12]} style={{ marginTop: isMobile ? 8 : 12 }}>
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#eff6ff',
                padding: isMobile ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: isMobile ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: isMobile ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Revenue
                </Text>
                <Text strong style={{ 
                  color: colors.primary,
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {CalculationUtils.formatCurrency(product.totalRevenue)}
                </Text>
              </div>
            </Col>
            
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#f0fdf4',
                padding: isMobile ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: isMobile ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: isMobile ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Profit
                </Text>
                <Text strong style={{ 
                  color: CalculationUtils.getProfitColor(product.totalProfit),
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {CalculationUtils.formatCurrency(product.totalProfit)}
                </Text>
              </div>
            </Col>
            
            <Col xs={12} sm={8}>
              <div style={{ 
                background: '#fefce8',
                padding: isMobile ? '8px' : '10px',
                borderRadius: '8px',
                textAlign: 'center',
                minHeight: isMobile ? '70px' : 'auto'
              }}>
                <Text type="secondary" style={{ 
                  fontSize: isMobile ? '9px' : '10px',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Margin
                </Text>
                <Text strong style={{ 
                  color: colors.success,
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '600'
                }}>
                  {product.profitMargin?.toFixed(1) || '0.0'}%
                </Text>
              </div>
            </Col>
          </Row>
        </div>
      </List.Item>
    );

    return (
      <DeviceAwareCard
        title="Top Performing Products"
        extra={<Badge count={dashboardData.topProducts?.length || 0} showZero color={colors.purple} />}
        loading={loading}
      >
        {dashboardData.topProducts?.length > 0 ? (
          <List 
            dataSource={dashboardData.topProducts} 
            renderItem={renderProductItem}
            pagination={{ 
              pageSize: isMobile ? 3 : 5,
              size: isMobile ? 'small' : 'default',
              simple: isMobile
            }}
          />
        ) : (
          <Empty 
            description="No product performance data available"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </DeviceAwareCard>
    );
  };

  // Transaction Details Modal
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
          <Flex align="center" gap="small">
            <FileTextOutlined style={{ color: colors.primary }} />
            <Text strong style={{ fontSize: isMobile ? '14px' : '16px' }}>
              Transaction Details
            </Text>
            <Tag color={transaction.status === 'completed' ? colors.success : colors.warning}>
              {transaction.status?.toUpperCase() || 'COMPLETED'}
            </Tag>
          </Flex>
        }
        open={visible}
        onCancel={onCancel}
        footer={[
          <Button key="close" onClick={onCancel} type="primary" size={isMobile ? "middle" : "large"}>
            Close
          </Button>
        ]}
        width={isMobile ? '100%' : 700}
        style={{ 
          top: isMobile ? 0 : 50,
          maxHeight: isMobile ? '100vh' : '80vh'
        }}
        bodyStyle={{ 
          padding: isMobile ? '16px 12px' : '24px',
          maxHeight: isMobile ? 'calc(100vh - 120px)' : '60vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <Descriptions 
          bordered 
          column={isMobile ? 1 : 2} 
          size="small"
          labelStyle={{ 
            fontWeight: '600',
            background: '#f9fafb',
            width: isMobile ? '100%' : 'auto',
            fontSize: isMobile ? '12px' : '13px'
          }}
          contentStyle={{ 
            background: '#ffffff',
            fontSize: isMobile ? '13px' : '14px'
          }}
        >
          <Descriptions.Item label="Transaction ID" span={isMobile ? 1 : 2}>
            <Text code style={{ fontSize: isMobile ? '11px' : '12px' }}>
              {transaction.transactionNumber || transaction._id}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Date & Time">
            {dayjs(transaction.saleDate).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Customer">
            {transaction.customerName || 'Walk-in Customer'}
          </Descriptions.Item>
          <Descriptions.Item label="Shop">{shopName}</Descriptions.Item>
          <Descriptions.Item label="Cashier">
            {transaction.cashierName || 'Unknown Cashier'}
          </Descriptions.Item>
          <Descriptions.Item label="Transaction Type">
            <Tag color={colors.success}>
              COMPLETE SALE
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Payment Method">
            <Tag color={PAYMENT_METHOD_CONFIG[transaction.paymentMethod]?.color || colors.primary}>
              {transaction.paymentMethod?.toUpperCase() || 'CASH'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount">
            <Text strong style={{ 
              color: colors.primary, 
              fontSize: isMobile ? '16px' : '18px',
              fontWeight: '600'
            }}>
              {CalculationUtils.formatCurrency(transaction.totalAmount)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Cost">
            <Text style={{ 
              color: colors.warning, 
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '500'
            }}>
              {CalculationUtils.formatCurrency(transaction.cost || 0)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Profit">
            <Text strong style={{ 
              color: CalculationUtils.getProfitColor(transaction.profit),
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600'
            }}>
              {CalculationUtils.formatCurrency(transaction.profit || 0)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Profit Margin">
            <Text strong style={{ 
              color: colors.success, 
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600'
            }}>
              {CalculationUtils.safeNumber(transaction.profitMargin, 0).toFixed(1)}%
            </Text>
          </Descriptions.Item>
          
          {transaction.items && transaction.items.length > 0 && (
            <Descriptions.Item label="Items" span={isMobile ? 1 : 2}>
              <List
                size="small"
                dataSource={transaction.items}
                renderItem={(item, index) => (
                  <List.Item style={{ padding: isMobile ? '8px 4px' : '12px 0' }}>
                    <div style={{ width: '100%' }}>
                      <Text strong style={{ 
                        fontSize: isMobile ? '12px' : '13px',
                        fontWeight: '600'
                      }}>
                        {item.productName} (x{item.quantity})
                      </Text>
                      <Row gutter={[8, 4]} style={{ marginTop: 4 }}>
                        <Col xs={12}>
                          <Text style={{ fontSize: isMobile ? '10px' : '11px', color: '#6b7280' }}>
                            Price: {CalculationUtils.formatCurrency(item.unitPrice || item.price)}
                          </Text>
                        </Col>
                        <Col xs={12}>
                          <Text style={{ fontSize: isMobile ? '10px' : '11px', color: '#6b7280' }}>
                            Total: {CalculationUtils.formatCurrency(item.totalPrice || (item.price * item.quantity))}
                          </Text>
                        </Col>
                        {item.profit && (
                          <Col xs={24}>
                            <Text style={{ 
                              fontSize: isMobile ? '10px' : '11px', 
                              color: colors.success,
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
        <PaymentComposition />
        <Row gutter={[layoutConfig.gap, layoutConfig.gap]}>
          <Col xs={24} lg={12}>
            <ShopPerformance />
          </Col>
          <Col xs={24} lg={12}>
            <CashierPerformance />
          </Col>
        </Row>
        <ProductPerformance />
      </div>
    );
  };

  // Filter Components
  const ShopFilter = ({ value, onChange }) => (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Text strong style={{ 
          fontSize: isMobile ? '12px' : '13px',
          fontWeight: '600'
        }}>Shop:</Text>
      </div>
      <Select
        value={value}
        onChange={onChange}
        style={{ width: '100%' }}
        placeholder="Filter by shop"
        allowClear
        loading={loading}
        size={isMobile ? "small" : "middle"}
        dropdownStyle={isMobile ? { fontSize: '14px' } : {}}
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
          fontSize: isMobile ? '12px' : '13px',
          fontWeight: '600'
        }}>Time Range:</Text>
      </div>
      <Select
        value={value}
        onChange={onChange}
        style={{ width: '100%' }}
        placeholder="Choose time range"
        size={isMobile ? "small" : "middle"}
        dropdownStyle={isMobile ? { fontSize: '14px' } : {}}
      >
        {TIME_RANGE_OPTIONS.map(option => (
          <Option key={option.value} value={option.value} label={option.label}>
            <Space>
              {option.icon}
              {option.label}
            </Space>
          </Option>
        ))}
      </Select>
    </div>
  );

  const PaymentModeFilter = ({ value, onChange }) => (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Text strong style={{ 
          fontSize: isMobile ? '12px' : '13px',
          fontWeight: '600'
        }}>Payment Mode:</Text>
      </div>
      <Select
        value={value}
        onChange={onChange}
        style={{ width: '100%' }}
        placeholder="Filter by payment mode"
        allowClear
        size={isMobile ? "small" : "middle"}
        dropdownStyle={isMobile ? { fontSize: '14px' } : {}}
      >
        {PAYMENT_METHOD_OPTIONS.map(option => (
          <Option key={option.value} value={option.value} label={option.label}>
            <Space>
              {option.icon}
              {option.label}
            </Space>
          </Option>
        ))}
      </Select>
    </div>
  );

  return (
    <Layout style={{ 
      minHeight: '100vh', 
      background: token.colorBgLayout,
      overflow: 'hidden'
    }}>
      <Content style={{ 
        padding: layoutConfig.padding,
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%',
        minHeight: '100vh'
      }}>
        {/* Header Section */}
        <DeviceAwareCard
          title={
            <Flex vertical gap="small">
              <Flex align="center" gap="middle" wrap="wrap">
                <div style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.purple})`,
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <BarChartOutlined style={{ 
                    color: 'white', 
                    fontSize: isMobile ? '24px' : '28px'
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Title level={isMobile ? 4 : 3} style={{ margin: 0, lineHeight: 1.2 }}>
                    Transactions Report
                  </Title>
                  <Text type="secondary" style={{ 
                    fontSize: layoutConfig.fontSize.subtitle,
                    display: 'block',
                    marginTop: '4px'
                  }}>
                    Comprehensive analysis of all transactions across your shops
                  </Text>
                </div>
              </Flex>
              
              {/* Search and Controls - AUTO-REFRESH BUTTON REMOVED */}
              <Flex 
                gap="middle" 
                wrap="wrap" 
                justify="space-between" 
                style={{ marginTop: isMobile ? '12px' : '16px' }}
              >
                <Input
                  ref={searchInputRef}
                  placeholder="Search transactions..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ 
                    width: isMobile ? '100%' : 300,
                    maxWidth: '100%',
                    borderRadius: '8px'
                  }}
                  size={isMobile ? 'middle' : 'large'}
                  allowClear
                />
                
                <Flex gap="small" wrap="wrap">
                  {/* AUTO-REFRESH BUTTON COMPLETELY REMOVED */}
                  
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleManualRefresh}
                    disabled={loading}
                    size={isMobile ? "middle" : "large"}
                    type="primary"
                    style={{ 
                      background: colors.primary, 
                      borderColor: colors.primary,
                      minWidth: isMobile ? '40px' : 'auto'
                    }}
                  >
                    {!isMobile && 'Refresh'}
                  </Button>

                  <Button
                    icon={<ExportOutlined />}
                    onClick={handleExportData}
                    loading={exportLoading}
                    size={isMobile ? "middle" : "large"}
                    style={{ 
                      color: colors.success, 
                      borderColor: colors.success,
                      minWidth: isMobile ? '40px' : 'auto'
                    }}
                  >
                    {!isMobile && 'Export'}
                  </Button>

                  <Button
                    icon={<FilterOutlined />}
                    onClick={() => setFilterVisible(!filterVisible)}
                    size={isMobile ? "middle" : "large"}
                    type={filterVisible ? "primary" : "default"}
                    style={filterVisible ? { 
                      background: colors.warning, 
                      borderColor: colors.warning,
                      minWidth: isMobile ? '40px' : 'auto'
                    } : {
                      minWidth: isMobile ? '40px' : 'auto'
                    }}
                  >
                    {!isMobile && (filterVisible ? 'Hide Filters' : 'Show Filters')}
                  </Button>
                </Flex>
              </Flex>
            </Flex>
          }
          extra={null}
        />

        {/* Data Timestamp and Active Filters */}
        <Row style={{ marginBottom: 16 }} justify="space-between" align="middle" gutter={[8, 8]}>
          <Col xs={24} sm={12}>
            {dataTimestamp && (
              <Text type="secondary" style={{ 
                fontSize: isMobile ? '10px' : '12px',
                display: 'block'
              }}>
                Last updated: {new Date(dataTimestamp).toLocaleString()}
                {/* AUTO-REFRESH TAG REMOVED */}
              </Text>
            )}
          </Col>
          <Col xs={24} sm={12}>
            {(filters.dateRange || filters.shop !== 'all' || filters.paymentMethod) && (
              <Space wrap style={{ justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px' }}>
                  Active filters:
                </Text>
                {filters.dateRange && (
                  <Tag color={colors.primary} style={{ fontSize: isMobile ? '9px' : '10px' }}>
                    {filters.dateRange[0].format('MM/DD')} - {filters.dateRange[1].format('MM/DD')}
                  </Tag>
                )}
                {filters.shop !== 'all' && (
                  <Tag color={colors.success} style={{ fontSize: isMobile ? '9px' : '10px' }}>
                    Shop: {shops.find(s => s._id === filters.shop)?.name || filters.shop}
                  </Tag>
                )}
                {filters.paymentMethod && (
                  <Tag color={colors.warning} style={{ fontSize: isMobile ? '9px' : '10px' }}>
                    Payment: {filters.paymentMethod.toUpperCase()}
                  </Tag>
                )}
              </Space>
            )}
          </Col>
        </Row>

        {/* Filters Section - Collapsible */}
        {filterVisible && (
          <DeviceAwareCard
            title="Transaction Filters"
            extra={
              <Button 
                size={isMobile ? "small" : "middle"} 
                onClick={handleClearFilters}
                style={{ 
                  color: colors.error, 
                  borderColor: colors.error,
                  minWidth: isMobile ? '60px' : 'auto'
                }}
              >
                Clear All
              </Button>
            }
          >
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12} md={6} lg={4}>
                <ShopFilter 
                  value={filters.shop}
                  onChange={(value) => handleFilterChange('shop', value)}
                />
              </Col>

              <Col xs={24} sm={12} md={6} lg={4}>
                <TimeRangeFilter 
                  value={timeFilter}
                  onChange={handleTimeFilterChange}
                />
              </Col>

              <Col xs={24} sm={12} md={6} lg={4}>
                <PaymentModeFilter 
                  value={filters.paymentMethod}
                  onChange={(value) => handleFilterChange('paymentMethod', value)}
                />
              </Col>

              {timeFilter === 'custom' && (
                <Col xs={24} sm={24} md={8} lg={6}>
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong style={{ 
                        fontSize: isMobile ? '12px' : '13px',
                        fontWeight: '600'
                      }}>Custom Range:</Text>
                    </div>
                    <RangePicker
                      onChange={handleCustomDateChange}
                      value={customDateRange}
                      style={{ width: '100%' }}
                      allowClear
                      size={isMobile ? "small" : "middle"}
                      placeholder={['Start', 'End']}
                      format="DD/MM/YYYY"
                    />
                  </div>
                </Col>
              )}
            </Row>

            {/* Active Filters Summary */}
            <div style={{ 
              marginTop: 16, 
              padding: isMobile ? '10px 12px' : '12px 16px', 
              backgroundColor: '#eff6ff', 
              borderRadius: '12px',
              border: `1px solid ${colors.primary}20`
            }}>
              <Text strong style={{ 
                fontSize: isMobile ? '12px' : '13px',
                fontWeight: '600'
              }}>Current View: </Text>
              <Space wrap style={{ marginTop: 8 }}>
                <Tag color={colors.primary} style={{ fontSize: isMobile ? '9px' : '10px' }}>
                  Shop: {getShopNameForDisplay()}
                </Tag>
                <Tag color={colors.primary} style={{ fontSize: isMobile ? '9px' : '10px' }}>
                  Period: {TIME_RANGE_OPTIONS.find(opt => opt.value === timeFilter)?.label || timeFilter.toUpperCase()}
                </Tag>
                {filters.paymentMethod && (
                  <Tag color={colors.success} style={{ fontSize: isMobile ? '9px' : '10px' }}>
                    Payment: {filters.paymentMethod.toUpperCase()}
                  </Tag>
                )}
                {searchText && (
                  <Tag color={colors.warning} style={{ fontSize: isMobile ? '9px' : '10px' }}>
                    Search: "{searchText}"
                  </Tag>
                )}
              </Space>
              <div style={{ marginTop: 12 }}>
                <Text strong style={{ 
                  fontSize: isMobile ? '11px' : '12px',
                  fontWeight: '600'
                }}>Summary: </Text>
                <Space wrap style={{ marginTop: 4 }}>
                  <Badge 
                    count={filteredTransactions.length} 
                    showZero 
                    color={colors.primary} 
                    style={{ fontSize: isMobile ? '10px' : '11px' }} 
                  />
                  <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '11px' }}>
                    Transactions
                  </Text>
                  <Divider type="vertical" />
                  <Text style={{ fontSize: isMobile ? '10px' : '11px', color: colors.success }}>
                    Revenue: {CalculationUtils.formatCurrency(dashboardData.financialStats?.totalRevenue || 0)}
                  </Text>
                </Space>
              </div>
            </div>
          </DeviceAwareCard>
        )}

        {error && (
          <Alert
            message="Error Loading Data"
            description={error}
            type="error"
            style={{ 
              marginBottom: 16,
              borderRadius: '12px',
              fontSize: isMobile ? '12px' : '14px'
            }}
            closable
            onClose={() => setError(null)}
          />
        )}

        {loading && !dashboardData.recentTransactions.length ? (
          <div style={{ 
            textAlign: 'center', 
            padding: isMobile ? '30px 16px' : '50px', 
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}>
            <Spin size="large" />
            <div style={{ 
              marginTop: 16, 
              color: '#6b7280', 
              fontSize: isMobile ? '12px' : '14px',
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
              padding: isMobile ? '12px' : '16px',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}
            tabBarStyle={{ margin: 0 }}
            size={isMobile ? "small" : "middle"}
            tabBarExtraContent={
              isMobile && (
                <Segmented
                  options={[
                    { label: <AppstoreOutlined />, value: 'grid', title: 'Grid View' },
                    { label: <UnorderedListOutlined />, value: 'list', title: 'List View' }
                  ]}
                  value={viewMode}
                  onChange={setViewMode}
                  size="small"
                />
              )
            }
          >
            <Tabs.TabPane 
              tab={
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  padding: isMobile ? '4px 8px' : '8px 12px'
                }}>
                  <PieChartOutlined style={{ fontSize: isMobile ? '12px' : '14px' }} />
                  <span style={{ 
                    fontSize: isMobile ? '11px' : '13px',
                    fontWeight: '500'
                  }}>Overview</span>
                  <Badge 
                    count={dashboardData?.recentTransactions?.length || 0} 
                    overflowCount={999} 
                    style={{ 
                      marginLeft: 4, 
                      fontSize: isMobile ? '9px' : '10px',
                      background: colors.primary
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
                  padding: isMobile ? '4px 8px' : '8px 12px'
                }}>
                  <TableOutlined style={{ fontSize: isMobile ? '12px' : '14px' }} />
                  <span style={{ 
                    fontSize: isMobile ? '11px' : '13px',
                    fontWeight: '500'
                  }}>Transactions</span>
                  <Badge 
                    count={filteredTransactions.length} 
                    overflowCount={999} 
                    style={{ 
                      marginLeft: 4, 
                      fontSize: isMobile ? '9px' : '10px',
                      background: colors.primary
                    }} 
                  />
                </span>
              } 
              key="details"
            >
              <DeviceAwareCard
                title={`Transaction List (${filteredTransactions.length} of ${dashboardData?.recentTransactions?.length || 0})`}
                extra={
                  <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '12px' }}>
                    {filters.shop !== 'all' && `for ${getShopNameForDisplay()}`}
                  </Text>
                }
              >
                {isMobile && viewMode === 'list' ? (
                  // Mobile List View
                  <div style={{ 
                    maxHeight: 'calc(100vh - 300px)',
                    overflowY: 'auto',
                    padding: '4px'
                  }}>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map(transaction => (
                        <TransactionItem 
                          key={transaction._id} 
                          transaction={transaction} 
                          screens={screens} 
                          colors={colors}
                          onView={handleViewTransaction}
                        />
                      ))
                    ) : (
                      <Empty
                        description={
                          filteredTransactions.length === 0 && dashboardData?.recentTransactions?.length > 0 ? 
                            'No transactions match your search' : 
                            'No transactions found'
                        }
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ padding: '40px 0' }}
                      />
                    )}
                  </div>
                ) : (
                  // Desktop Table View or Mobile Grid View
                  <div style={{ 
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch'
                  }}>
                    <Table
                      columns={columns}
                      dataSource={filteredTransactions}
                      rowKey={(record) => record._id || record.transactionNumber || Math.random()}
                      loading={loading}
                      pagination={{
                        pageSize: isMobile ? 10 : 20,
                        showSizeChanger: !isMobile,
                        showQuickJumper: !isMobile,
                        showTotal: !isMobile ? (total, range) =>
                          `${range[0]}-${range[1]} of ${total} transactions` : undefined,
                        size: isMobile ? "small" : "default",
                        simple: isMobile,
                        position: ['bottomCenter']
                      }}
                      scroll={{ x: isMobile ? 600 : 1200 }}
                      locale={{ 
                        emptyText: filteredTransactions.length === 0 && dashboardData?.recentTransactions?.length > 0 ? 
                          'No transactions match your search' : 
                          <Empty 
                            description="No transactions found"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                      }}
                      size={isMobile ? "small" : "middle"}
                      sticky={isMobile}
                    />
                  </div>
                )}
              </DeviceAwareCard>
            </Tabs.TabPane>
          </Tabs>
        )}

        <TransactionDetailsModal
          transaction={selectedTransaction}
          visible={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
        />

        {/* Device Status Indicator */}
        {isMobile && (
          <div style={{ 
            position: 'fixed', 
            bottom: '16px', 
            right: '16px',
            zIndex: 1000
          }}>
            <FloatButton.Group
              trigger="click"
              type="primary"
              icon={<SettingOutlined />}
              tooltip="Device Settings"
            >
              <FloatButton 
                icon={<MobileOutlined />}
                tooltip={`Mobile View (${screens.width}×${screens.height})`}
              />
              <FloatButton 
                icon={<ReloadOutlined />}
                onClick={handleManualRefresh}
                tooltip="Refresh Data"
              />
              <FloatButton.BackTop visibilityHeight={0} />
            </FloatButton.Group>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default TransactionsReport;