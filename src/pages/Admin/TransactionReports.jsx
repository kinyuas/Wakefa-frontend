// src/pages/Admin/TransactionReports.jsx - CASHIER AGGREGATION FIX + AI DEVICE COMPATIBILITY
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Table, Card, Typography, Input, Button, DatePicker,
  Row, Col, Alert, Space, Tag, Modal, Select, Spin, Tooltip,
  Tabs, Empty, List, Avatar, Progress, Badge, Descriptions,
  Grid, Layout, Flex, FloatButton, Segmented, theme, Divider
} from 'antd';
import {
  SearchOutlined, EyeOutlined, DollarOutlined, UserOutlined,
  ShopOutlined, AppstoreOutlined, FileTextOutlined, PieChartOutlined,
  TableOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, ExportOutlined, FilterOutlined,
  ReloadOutlined, BarChartOutlined, MobileOutlined, TabletOutlined,
  DesktopOutlined, CloseOutlined, RiseOutlined, FallOutlined,
  MoneyCollectOutlined, BankOutlined, PhoneOutlined,
  CalculatorOutlined, ShoppingCartOutlined, CalendarOutlined,
  BarcodeOutlined, LineChartOutlined, AreaChartOutlined,
  WalletOutlined, DatabaseOutlined, UnorderedListOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { unifiedAPI, shopAPI } from '../../services/api';
import { CalculationUtils } from '../../utils/calculationUtils';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(advancedFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(relativeTime);

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { Content } = Layout;
const { useToken } = theme;

// =============================================
// CONSTANTS
// =============================================
const TIME_RANGE_OPTIONS = [
  { label: 'Today', value: 'daily', icon: <CalendarOutlined /> },
  { label: 'Last 7 Days', value: '7d', icon: <CalendarOutlined /> },
  { label: 'Last 30 Days', value: '30d', icon: <AreaChartOutlined /> },
  { label: 'This Year', value: 'yearly', icon: <LineChartOutlined /> },
  { label: 'All Time', value: 'all', icon: <DatabaseOutlined /> },
  { label: 'Custom Range', value: 'custom', icon: <FilterOutlined /> }
];

const PAYMENT_METHOD_OPTIONS = [
  { label: 'All Payments', value: '', icon: <WalletOutlined /> },
  { label: 'Cash', value: 'cash', icon: <MoneyCollectOutlined /> },
  { label: 'M-Pesa/Bank', value: 'mpesa_bank', icon: <BankOutlined /> }
];

const PAYMENT_METHOD_CONFIG = {
  cash: { color: '#52c41a', text: 'CASH' },
  mpesa: { color: '#1890ff', text: 'MPESA' },
  bank: { color: '#722ed1', text: 'BANK' },
  mpesa_bank: { color: '#1890ff', text: 'MPESA/BANK' },
  cash_mpesa_bank: { color: '#13c2c2', text: 'SPLIT' }
};

// =============================================
// DEVICE-AWARE CARD
// =============================================
const DeviceAwareCard = ({ children, title, extra, style, loading, ...props }) => {
  const screens = useBreakpoint();
  const { token } = useToken();

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: screens.xs ? 'wrap' : 'nowrap' }}>
          {typeof title === 'string' ? (
            <>
              <BarChartOutlined style={{ color: token.colorPrimary, fontSize: screens.xs ? '18px' : '22px' }} />
              <Text strong style={{ fontSize: screens.xs ? '16px' : '18px', flex: 1, minWidth: 0 }}>{title}</Text>
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
      bodyStyle={{ padding: screens.xs ? '16px' : '24px' }}
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
// TRANSACTION ITEM (mobile list)
// =============================================
const TransactionItem = ({ transaction, screens, colors, onView }) => {
  const { token } = useToken();
  const [expanded, setExpanded] = useState(false);
  const paymentConfig = PAYMENT_METHOD_CONFIG[transaction.paymentMethod] || PAYMENT_METHOD_CONFIG.cash;

  return (
    <div
      style={{
        marginBottom: '12px',
        padding: screens.xs ? '12px' : '16px',
        borderRadius: '10px',
        backgroundColor: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        cursor: 'pointer'
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <Flex vertical={screens.xs} gap={screens.xs ? 'small' : 'middle'} justify="space-between">
        <Flex vertical gap="small" style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" gap="small" wrap="wrap">
            <FileTextOutlined style={{ color: colors.primary, fontSize: '14px' }} />
            <Text strong style={{ fontSize: screens.xs ? '13px' : '14px', flex: 1, minWidth: 0 }}>
              {transaction.transactionNumber || `TXN-${transaction._id?.substring(0, 6)}`}
            </Text>
            <Tag color={paymentConfig.color} style={{ fontSize: '10px', margin: 0 }}>{paymentConfig.text}</Tag>
          </Flex>
          <Text style={{ fontSize: '11px', color: token.colorTextTertiary }}>
            <CalendarOutlined /> {dayjs(transaction.saleDate || transaction.createdAt).format('MMM D, YYYY h:mm A')}
          </Text>
          {expanded && transaction.items && (
            <div style={{ marginTop: '8px', padding: '8px', background: token.colorBgLayout, borderRadius: '6px' }}>
              {transaction.items.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: index < transaction.items.length - 1 ? `1px dashed ${token.colorBorder}` : 'none' }}>
                  <Text style={{ fontSize: '11px' }}>{item.productName || item.name} × {item.quantity}</Text>
                  <Text style={{ fontSize: '11px', fontWeight: 500 }}>KES {((item.price || 0) * (item.quantity || 1)).toLocaleString()}</Text>
                </div>
              ))}
            </div>
          )}
        </Flex>
        <Flex vertical align={screens.xs ? 'flex-start' : 'flex-end'} gap="small">
          <Text strong style={{ fontSize: screens.xs ? '18px' : '20px', color: colors.success }}>
            {CalculationUtils.formatCurrency(transaction.totalAmount || 0)}
          </Text>
          <Button type="primary" size="small" icon={<EyeOutlined />}
            onClick={(e) => { e.stopPropagation(); onView(transaction); }}
            style={{ borderRadius: '6px' }}>
            View
          </Button>
        </Flex>
      </Flex>
    </div>
  );
};

// =============================================
// MAIN COMPONENT
// =============================================
const TransactionsReport = () => {
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
    gold: '#fa8c16'
  };

  const [dashboardData, setDashboardData] = useState({
    financialStats: CalculationUtils.getDefaultStats(),
    recentTransactions: [],
    topProducts: [],
    shopPerformance: [],
    cashierPerformance: [],
    expenses: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');

  const [filters, setFilters] = useState({
    dateRange: null,
    shop: 'all',
    paymentMethod: '',
    timeRange: '30d'
  });

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [shops, setShops] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [dataTimestamp, setDataTimestamp] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(!isMobile);
  const [viewMode, setViewMode] = useState('grid');
  const [timeFilter, setTimeFilter] = useState('30d');
  const [customDateRange, setCustomDateRange] = useState(null);

  const searchInputRef = useRef(null);
  const fetchInFlightRef = useRef(false);
  const initialRangeSetRef = useRef(false);

  const layoutConfig = useMemo(() => ({
    isMobile,
    isTablet,
    isDesktop,
    padding: isMobile ? '12px' : isTablet ? '16px' : '24px',
    gap: isMobile ? '8px' : isTablet ? '12px' : '16px',
    fontSize: {
      title: isMobile ? '16px' : isTablet ? '18px' : '20px',
      subtitle: isMobile ? '12px' : isTablet ? '13px' : '14px',
      body: isMobile ? '12px' : isTablet ? '13px' : '14px'
    }
  }), [isMobile, isTablet, isDesktop]);

  // Stable date strings (primitives) for effect deps
  const startDateStr = filters?.dateRange?.[0] ? filters.dateRange[0].format('YYYY-MM-DD') : '';
  const endDateStr = filters?.dateRange?.[1] ? filters.dateRange[1].format('YYYY-MM-DD') : '';

  const calculateDateRange = useCallback((rangeType) => {
    const now = dayjs();
    let startDate;
    switch (rangeType) {
      case 'daily': startDate = now.startOf('day'); break;
      case '7d': startDate = now.subtract(7, 'days'); break;
      case '30d': startDate = now.subtract(30, 'days'); break;
      case 'yearly': startDate = now.startOf('year'); break;
      case 'all': return null;
      case 'custom': return null;
      default: startDate = now.subtract(30, 'days');
    }
    return [startDate, now];
  }, []);

  // =============================================
  // FETCH DATA
  // =============================================
  const fetchDashboardData = useCallback(async (customFilters = null) => {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;

    const activeFilters = customFilters || filters;

    try {
      setLoading(true);
      setError(null);

      let shopsData = [];
      try { shopsData = await shopAPI.getAll(); } catch { shopsData = []; }
      setShops(shopsData);

      const params = {};
      if (activeFilters.dateRange?.[0] && activeFilters.dateRange?.[1]) {
        params.startDate = activeFilters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = activeFilters.dateRange[1].format('YYYY-MM-DD');
      } else if (customDateRange && activeFilters.timeRange === 'custom') {
        params.startDate = customDateRange[0].format('YYYY-MM-DD');
        params.endDate = customDateRange[1].format('YYYY-MM-DD');
      }
      if (activeFilters.shop && activeFilters.shop !== 'all') {
        params.shopId = activeFilters.shop;
      }

      let comprehensiveData = null;
      try {
        comprehensiveData = await unifiedAPI.getCombinedTransactions(params);
      } catch {
        comprehensiveData = { salesWithProfit: [], financialStats: CalculationUtils.getDefaultStats() };
      }

      const processedData = processDashboardData(comprehensiveData, shopsData, activeFilters);
      setDashboardData(processedData);
      setDataTimestamp(new Date().toISOString());

    } catch (err) {
      console.error('💥 Transaction Report fetch failed:', err);
      setError(err.message || 'Failed to load transaction data');
    } finally {
      setLoading(false);
      fetchInFlightRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, customDateRange]);

  // =============================================
  // PROCESS DATA
  // =============================================
  const processDashboardData = (comprehensiveData, shops, activeFilters) => {
    const processedData = CalculationUtils.processComprehensiveData(
      comprehensiveData,
      activeFilters.shop === 'all' ? null : activeFilters.shop,
      { includePerformance: true, includeProducts: true }
    );

    const transactions = processedData.salesWithProfit || [];
    const financialStats = processedData.financialStats || CalculationUtils.getDefaultStats();
    const products = processedData.products || [];
    const expenses = processedData.expenses || [];
    const cashiers = processedData.cashiers || [];

    let filteredTransactions = transactions;
    if (activeFilters.paymentMethod) {
      filteredTransactions = filteredTransactions.filter(t => t.paymentMethod === activeFilters.paymentMethod);
    }
    if (activeFilters.dateRange?.[0] && activeFilters.dateRange?.[1]) {
      filteredTransactions = CalculationUtils.filterDataByDateRange(
        filteredTransactions, activeFilters.dateRange[0], activeFilters.dateRange[1], 'saleDate'
      );
    }

    const recentTransactions = filteredTransactions
      .sort((a, b) => new Date(b.saleDate || b.createdAt) - new Date(a.saleDate || a.createdAt));

    const lowStockProducts = products.filter(p =>
      CalculationUtils.safeNumber(p.currentStock) <= CalculationUtils.safeNumber(p.minStockLevel, 5)
    ).slice(0, 5);

    // ⭐ Sanitize before aggregation so populated objects don't collapse
    const safeTransactions = sanitizeForAggregation(filteredTransactions);

    const topProducts = CalculationUtils.calculateTopProducts(safeTransactions, 10);
    const shopPerformance = CalculationUtils.calculateShopPerformance(safeTransactions, shops);
    const cashierPerformance = CalculationUtils.calculateCashierPerformance(safeTransactions, cashiers);

    const enhancedFinancialStats = {
      ...financialStats,
      totalRevenue: financialStats.totalRevenue || 0,
      netProfit: financialStats.netProfit || 0,
      totalSales: financialStats.totalSales || safeTransactions.length,
      totalExpenses: financialStats.totalExpenses || expenses.reduce((s, e) => s + CalculationUtils.safeNumber(e.amount), 0),
      costOfGoodsSold: financialStats.costOfGoodsSold || safeTransactions.reduce((s, t) => {
        if (t.cost) return s + CalculationUtils.safeNumber(t.cost);
        return s + CalculationUtils.calculateCostFromItems(t);
      }, 0),
      grossProfit: financialStats.grossProfit || parseFloat((financialStats.totalRevenue - (financialStats.costOfGoodsSold || 0)).toFixed(2)),
      profitMargin: financialStats.profitMargin || CalculationUtils.calculateProfitMargin(financialStats.totalRevenue, financialStats.grossProfit),
      totalCash: financialStats.totalCash || safeTransactions.filter(t => t.paymentMethod === 'cash').reduce((s, t) => s + (t.totalAmount || 0), 0),
      totalMpesaBank: financialStats.totalMpesaBank || safeTransactions.filter(t => ['mpesa', 'bank', 'mpesa_bank'].includes(t.paymentMethod)).reduce((s, t) => s + (t.totalAmount || 0), 0)
    };

    return {
      financialStats: enhancedFinancialStats,
      recentTransactions,
      lowStockProducts,
      topProducts,
      shopPerformance,
      cashierPerformance,
      expenses
    };
  };

  // =============================================
  // INITIAL DATE RANGE — ONCE
  // =============================================
  useEffect(() => {
    if (initialRangeSetRef.current) return;
    initialRangeSetRef.current = true;
    const range = calculateDateRange('30d');
    if (range) {
      setFilters(prev => ({ ...prev, dateRange: range, timeRange: '30d' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =============================================
  // FETCH EFFECT — primitives only
  // =============================================
  useEffect(() => {
    if (timeFilter !== 'all' && !startDateStr && !endDateStr) return;
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.shop,
    filters.paymentMethod,
    timeFilter,
    startDateStr,
    endDateStr
  ]);

  // =============================================
  // HANDLERS
  // =============================================
  const handleTimeFilterChange = (value) => {
    setTimeFilter(value);
    if (value !== 'custom') {
      setCustomDateRange(null);
      const newRange = calculateDateRange(value);
      setFilters(prev => ({ ...prev, dateRange: newRange, timeRange: value }));
    } else {
      setFilters(prev => ({ ...prev, timeRange: 'custom' }));
    }
  };

  const handleCustomDateChange = (dates) => {
    setCustomDateRange(dates);
    if (dates) setFilters(prev => ({ ...prev, dateRange: dates, timeRange: 'custom' }));
  };

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const handleClearFilters = () => {
    setTimeFilter('30d');
    setCustomDateRange(null);
    setFilters({
      dateRange: calculateDateRange('30d'),
      shop: 'all',
      paymentMethod: '',
      timeRange: '30d'
    });
  };

  const handleManualRefresh = () => fetchDashboardData(filters);

  const handleViewTransaction = useCallback((transaction) => {
    setSelectedTransaction(transaction);
    setViewModalVisible(true);
  }, []);

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const exportData = {
        timestamp: dataTimestamp,
        filters,
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
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!dashboardData?.recentTransactions) return [];
    let filtered = dashboardData.recentTransactions;
    const searchLower = searchText.toLowerCase().trim();
    if (searchLower) {
      filtered = filtered.filter(transaction => {
        if (!transaction) return false;
        const fields = [
          transaction.cashierName,
          typeof transaction.shop === 'string' ? transaction.shop : (transaction.shop?.name || ''),
          transaction.paymentMethod,
          transaction.transactionNumber,
          transaction.customerName,
          ...(transaction.items?.map(i => i.productName) || [])
        ].filter(Boolean).map(f => f.toLowerCase());
        return fields.some(f => f.includes(searchLower));
      });
    }
    return filtered;
  }, [dashboardData, searchText]);

  const getShopNameForDisplay = () => {
    if (filters.shop === 'all') return 'All Shops';
    return shops.find(s => s._id === filters.shop)?.name || 'Selected Shop';
  };

  const formatFullNumber = (num) => {
    if (typeof num !== 'number') return '0';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  // =============================================
  // TABLE COLUMNS
  // =============================================
  const columns = useMemo(() => {
    const base = [
      {
        title: 'Transaction ID',
        dataIndex: '_id',
        key: 'transactionId',
        render: (id, record) => (
          <Tooltip title={id}>
            <Text code style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: 'bold' }}>
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
            <div style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: '500' }}>{dayjs(date).format('DD/MM/YYYY')}</div>
            <div style={{ fontSize: isMobile ? '9px' : '10px', color: '#666' }}>{dayjs(date).format('HH:mm')}</div>
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
        render: (name) => <Text ellipsis style={{ fontSize: isMobile ? '11px' : '13px' }}>{name || 'Walk-in'}</Text>,
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
        render: (name) => <Text ellipsis style={{ fontSize: isMobile ? '11px' : '13px' }}>{name || 'Unknown'}</Text>,
        width: 100,
        responsive: ['md', 'lg']
      },
      {
        title: 'Amount',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        render: (amount) => (
          <Text strong style={{ color: colors.primary, fontSize: isMobile ? '12px' : '14px', fontWeight: '600' }}>
            {CalculationUtils.formatCurrency(amount)}
          </Text>
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
          <Text strong style={{ color: CalculationUtils.getProfitColor(profit), fontSize: isMobile ? '12px' : '14px', fontWeight: '600' }}>
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
          <Text strong style={{ color: colors.success, fontSize: isMobile ? '11px' : '13px', fontWeight: '600' }}>
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
          <Tag color={PAYMENT_METHOD_CONFIG[record.paymentMethod]?.color || '#6b7280'}
            style={{ fontSize: isMobile ? '9px' : '11px', marginBottom: 2 }}>
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
          <Button type="primary" icon={<EyeOutlined />} onClick={() => handleViewTransaction(record)} size="small"
            style={{ padding: isMobile ? '2px 4px' : '4px 8px', background: colors.primary, border: 'none', borderRadius: '6px' }}>
            View
          </Button>
        )
      }
    ];
    if (isMobile) return base.filter(col => col.responsive?.includes('xs') || col.fixed);
    return base;
  }, [isMobile, colors, handleViewTransaction]);

  // =============================================
  // FINANCIAL OVERVIEW
  // =============================================
  const FinancialOverview = () => {
    const safeStats = dashboardData?.financialStats || CalculationUtils.getDefaultStats();
    const hasData = safeStats.totalSales > 0 || safeStats.totalRevenue > 0;

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

    const StatCard = ({ title, value, prefix = 'KES', description, colorIndex = 0 }) => {
      const c = statCardColors[colorIndex % statCardColors.length];
      return (
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <Card size="small" style={{
            background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px',
            textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            marginBottom: '12px', minHeight: isMobile ? '120px' : '140px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent'
          }} bodyStyle={{
            padding: isMobile ? '14px 10px' : '16px', flex: 1,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden'
          }}>
            <div style={{ marginBottom: isMobile ? '6px' : '8px' }}>
              <Text style={{
                color: c.title, fontSize: isMobile ? '13px' : '15px',
                fontWeight: '700', textTransform: 'uppercase',
                letterSpacing: '0.5px', display: 'block', lineHeight: '1.2'
              }}>{title}</Text>
            </div>
            <div style={{
              color: c.value, fontSize: isMobile ? '18px' : '24px',
              fontWeight: '700', lineHeight: '1.2', marginBottom: '4px'
            }}>{prefix} {formatFullNumber(value)}</div>
            {description && (
              <Text style={{ color: '#6b7280', fontSize: isMobile ? '9px' : '11px', opacity: 0.9, marginTop: '4px' }}>{description}</Text>
            )}
          </Card>
        </Col>
      );
    };

    return (
      <DeviceAwareCard title="Financial Overview"
        extra={<Tag color={colors.primary} style={{ fontSize: isMobile ? '11px' : '12px' }}>{getShopNameForDisplay()}</Tag>}
        loading={loading}>
        {!hasData && !loading && (
          <Alert message="No Transaction Data Available" type="warning" showIcon
            description={<div style={{ fontSize: isMobile ? '12px' : '14px' }}>
              <p>No transactions found for the selected filters.</p>
            </div>}
            style={{ marginBottom: 16, borderRadius: '12px' }} />
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
          <StatCard title="Profit Margin" value={safeStats.profitMargin} colorIndex={8} prefix="" description="Net profit margin" />
          <StatCard title="Avg Transaction" value={safeStats.totalSales > 0 ? safeStats.totalRevenue / safeStats.totalSales : 0} colorIndex={9} description="Average sale value" />
        </Row>
      </DeviceAwareCard>
    );
  };

  // =============================================
  // PAYMENT COMPOSITION
  // =============================================
  const PaymentComposition = () => {
    const s = dashboardData?.financialStats || CalculationUtils.getDefaultStats();
    const total = (s.totalCash || 0) + (s.totalMpesaBank || 0);
    const cashPct = total > 0 ? (s.totalCash / total) * 100 : 0;
    const digitalPct = total > 0 ? (s.totalMpesaBank / total) * 100 : 0;

    return (
      <DeviceAwareCard title="Payment Composition">
        <Row gutter={[layoutConfig.gap, layoutConfig.gap]}>
          <Col xs={24} md={12}>
            <Card style={{ background: `linear-gradient(135deg, ${colors.success}15, ${colors.success}08)`, borderRadius: '12px', border: `1px solid ${colors.success}20` }}
              bodyStyle={{ padding: '20px' }}>
              <Flex vertical gap="middle">
                <Flex justify="space-between" align="center">
                  <Flex align="center" gap="small">
                    <div style={{ background: `${colors.success}20`, borderRadius: '8px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MoneyCollectOutlined style={{ color: colors.success, fontSize: '20px' }} />
                    </div>
                    <Text strong style={{ fontSize: '16px' }}>Cash Payments</Text>
                  </Flex>
                  <Tag color="green" style={{ fontSize: '12px' }}>{cashPct.toFixed(1)}%</Tag>
                </Flex>
                <Text strong style={{ fontSize: isMobile ? '24px' : '28px', color: colors.success, textAlign: 'center' }}>
                  {CalculationUtils.formatCurrency(s.totalCash || 0)}
                </Text>
                <Progress percent={cashPct} strokeColor={colors.success} strokeWidth={8} showInfo={false} />
              </Flex>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card style={{ background: `linear-gradient(135deg, ${colors.primary}15, ${colors.primary}08)`, borderRadius: '12px', border: `1px solid ${colors.primary}20` }}
              bodyStyle={{ padding: '20px' }}>
              <Flex vertical gap="middle">
                <Flex justify="space-between" align="center">
                  <Flex align="center" gap="small">
                    <div style={{ background: `${colors.primary}20`, borderRadius: '8px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BankOutlined style={{ color: colors.primary, fontSize: '20px' }} />
                    </div>
                    <Text strong style={{ fontSize: '16px' }}>M-Pesa / Bank</Text>
                  </Flex>
                  <Tag color="blue" style={{ fontSize: '12px' }}>{digitalPct.toFixed(1)}%</Tag>
                </Flex>
                <Text strong style={{ fontSize: isMobile ? '24px' : '28px', color: colors.primary, textAlign: 'center' }}>
                  {CalculationUtils.formatCurrency(s.totalMpesaBank || 0)}
                </Text>
                <Progress percent={digitalPct} strokeColor={colors.primary} strokeWidth={8} showInfo={false} />
              </Flex>
            </Card>
          </Col>
        </Row>
      </DeviceAwareCard>
    );
  };

  // =============================================
  // CASHIER PERFORMANCE  ⭐ NOW CORRECT PER CASHIER
  // =============================================
  const CashierPerformance = () => (
    <DeviceAwareCard title="Cashier Performance"
      extra={<Badge count={dashboardData.cashierPerformance?.length || 0} showZero color={colors.primary} />}
      loading={loading}>
      {dashboardData.cashierPerformance?.length > 0 ? (
        <List
          dataSource={dashboardData.cashierPerformance}
          renderItem={(cashier, index) => (
            <List.Item style={{ padding: isMobile ? '12px 8px' : '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: '100%' }}>
                <Row gutter={[16, 16]} align="middle" style={{ marginBottom: isMobile ? 8 : 12 }}>
                  <Col flex="none">
                    <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? colors.primary : '#9ca3af'}>
                      <Avatar style={{ backgroundColor: index < 3 ? colors.primary : '#d1d5db', width: isMobile ? 36 : 40, height: isMobile ? 36 : 40 }}
                        icon={<UserOutlined />}>
                        {cashier.name?.charAt(0)?.toUpperCase() || 'C'}
                      </Avatar>
                    </Badge>
                  </Col>
                  <Col flex="auto">
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Row justify="space-between" align="middle">
                        <Text strong style={{ fontSize: isMobile ? '13px' : '15px', color: '#1f2937' }}>{cashier.name}</Text>
                        {index < 3 && <Tag color="#fbbf24" style={{ fontSize: '9px' }}>Top</Tag>}
                      </Row>
                      <Tag color={colors.primary} style={{ fontSize: isMobile ? '9px' : '10px', width: 'fit-content' }}>
                        {cashier.transactions} transactions
                      </Tag>
                    </Space>
                  </Col>
                </Row>
                <Row gutter={[12, 12]} style={{ marginTop: isMobile ? 8 : 12 }}>
                  <Col xs={12} sm={8}>
                    <div style={{ background: '#eff6ff', padding: isMobile ? '8px' : '10px', borderRadius: '8px', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: isMobile ? '9px' : '10px', display: 'block', marginBottom: 4 }}>Revenue</Text>
                      <Text strong style={{ color: colors.primary, fontSize: isMobile ? '14px' : '16px' }}>
                        {CalculationUtils.formatCurrency(cashier.revenue)}
                      </Text>
                    </div>
                  </Col>
                  <Col xs={12} sm={8}>
                    <div style={{ background: '#f0fdf4', padding: isMobile ? '8px' : '10px', borderRadius: '8px', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: isMobile ? '9px' : '10px', display: 'block', marginBottom: 4 }}>Profit</Text>
                      <Text strong style={{ color: CalculationUtils.getProfitColor(cashier.profit), fontSize: isMobile ? '14px' : '16px' }}>
                        {CalculationUtils.formatCurrency(cashier.profit)}
                      </Text>
                    </div>
                  </Col>
                  <Col xs={12} sm={8}>
                    <div style={{ background: '#fefce8', padding: isMobile ? '8px' : '10px', borderRadius: '8px', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: isMobile ? '9px' : '10px', display: 'block', marginBottom: 4 }}>Margin</Text>
                      <Text strong style={{ color: colors.success, fontSize: isMobile ? '14px' : '16px' }}>
                        {cashier.profitMargin?.toFixed(1) || '0.0'}%
                      </Text>
                    </div>
                  </Col>
                </Row>
              </div>
            </List.Item>
          )}
          pagination={{ pageSize: isMobile ? 3 : 5, size: isMobile ? 'small' : 'default', simple: isMobile }}
        />
      ) : (
        <Empty description="No cashier performance data available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </DeviceAwareCard>
  );

  // =============================================
  // SHOP PERFORMANCE
  // =============================================
  const ShopPerformance = () => (
    <DeviceAwareCard title="Shop Performance"
      extra={<Badge count={dashboardData.shopPerformance?.length || 0} showZero color={colors.primary} />}
      loading={loading}>
      {dashboardData.shopPerformance?.length > 0 ? (
        <List
          dataSource={dashboardData.shopPerformance}
          renderItem={(shop, index) => (
            <List.Item style={{ padding: isMobile ? '12px 8px' : '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: '100%' }}>
                <Row gutter={[16, 16]} align="middle" style={{ marginBottom: isMobile ? 8 : 12 }}>
                  <Col flex="none">
                    <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? colors.primary : '#9ca3af'}>
                      <Avatar style={{ backgroundColor: index < 3 ? colors.primary : '#d1d5db', width: isMobile ? 36 : 40, height: isMobile ? 36 : 40 }}
                        icon={<ShopOutlined />} />
                    </Badge>
                  </Col>
                  <Col flex="auto">
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Row justify="space-between" align="middle">
                        <Text strong style={{ fontSize: isMobile ? '13px' : '15px', color: '#1f2937' }}>{shop.name}</Text>
                        {index < 3 && <Tag color="#fbbf24" style={{ fontSize: '9px' }}>Top</Tag>}
                      </Row>
                      <Tag color={colors.primary} style={{ fontSize: isMobile ? '9px' : '10px', width: 'fit-content' }}>
                        {shop.transactions} transactions
                      </Tag>
                    </Space>
                  </Col>
                </Row>
                <Row gutter={[12, 12]} style={{ marginTop: isMobile ? 8 : 12 }}>
                  <Col xs={12} sm={8}>
                    <div style={{ background: '#eff6ff', padding: isMobile ? '8px' : '10px', borderRadius: '8px', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: isMobile ? '9px' : '10px', display: 'block', marginBottom: 4 }}>Revenue</Text>
                      <Text strong style={{ color: colors.primary, fontSize: isMobile ? '14px' : '16px' }}>
                        {CalculationUtils.formatCurrency(shop.revenue)}
                      </Text>
                    </div>
                  </Col>
                  <Col xs={12} sm={8}>
                    <div style={{ background: '#f0f9ff', padding: isMobile ? '8px' : '10px', borderRadius: '8px', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: isMobile ? '9px' : '10px', display: 'block', marginBottom: 4 }}>Transactions</Text>
                      <Text strong style={{ color: colors.cyan, fontSize: isMobile ? '14px' : '16px' }}>{shop.transactions}</Text>
                    </div>
                  </Col>
                  <Col xs={12} sm={8}>
                    <div style={{ background: '#fefce8', padding: isMobile ? '8px' : '10px', borderRadius: '8px', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: isMobile ? '9px' : '10px', display: 'block', marginBottom: 4 }}>Margin</Text>
                      <Text strong style={{ color: colors.success, fontSize: isMobile ? '14px' : '16px' }}>
                        {shop.profitMargin?.toFixed(1) || '0.0'}%
                      </Text>
                    </div>
                  </Col>
                </Row>
              </div>
            </List.Item>
          )}
          pagination={{ pageSize: isMobile ? 3 : 5, size: isMobile ? 'small' : 'default', simple: isMobile }}
        />
      ) : (
        <Empty description="No shop performance data available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </DeviceAwareCard>
  );

  // =============================================
  // PRODUCT PERFORMANCE
  // =============================================
  const ProductPerformance = () => (
    <DeviceAwareCard title="Top Performing Products"
      extra={<Badge count={dashboardData.topProducts?.length || 0} showZero color={colors.purple} />}
      loading={loading}>
      {dashboardData.topProducts?.length > 0 ? (
        <List
          dataSource={dashboardData.topProducts}
          renderItem={(product, index) => (
            <List.Item style={{ padding: isMobile ? '12px 8px' : '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: '100%' }}>
                <Row gutter={[16, 16]} align="middle" style={{ marginBottom: isMobile ? 8 : 12 }}>
                  <Col flex="none">
                    <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? colors.purple : '#9ca3af'}>
                      <Avatar style={{ backgroundColor: index < 3 ? colors.purple : '#d1d5db', width: isMobile ? 36 : 40, height: isMobile ? 36 : 40 }}
                        icon={<AppstoreOutlined />} />
                    </Badge>
                  </Col>
                  <Col flex="auto">
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Row justify="space-between" align="middle">
                        <Text strong style={{ fontSize: isMobile ? '13px' : '15px', color: '#1f2937' }}>{product.name}</Text>
                        <Tag color={colors.primary} style={{ fontSize: isMobile ? '9px' : '10px' }}>{product.totalSold} sold</Tag>
                      </Row>
                      {index < 3 && <Tag color="#fbbf24" style={{ fontSize: '9px', width: 'fit-content' }}>Top Seller</Tag>}
                    </Space>
                  </Col>
                </Row>
                <Row gutter={[12, 12]} style={{ marginTop: isMobile ? 8 : 12 }}>
                  <Col xs={12} sm={8}>
                    <div style={{ background: '#eff6ff', padding: isMobile ? '8px' : '10px', borderRadius: '8px', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: isMobile ? '9px' : '10px', display: 'block', marginBottom: 4 }}>Revenue</Text>
                      <Text strong style={{ color: colors.primary, fontSize: isMobile ? '14px' : '16px' }}>
                        {CalculationUtils.formatCurrency(product.totalRevenue)}
                      </Text>
                    </div>
                  </Col>
                  <Col xs={12} sm={8}>
                    <div style={{ background: '#f0fdf4', padding: isMobile ? '8px' : '10px', borderRadius: '8px', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: isMobile ? '9px' : '10px', display: 'block', marginBottom: 4 }}>Profit</Text>
                      <Text strong style={{ color: CalculationUtils.getProfitColor(product.totalProfit), fontSize: isMobile ? '14px' : '16px' }}>
                        {CalculationUtils.formatCurrency(product.totalProfit)}
                      </Text>
                    </div>
                  </Col>
                  <Col xs={12} sm={8}>
                    <div style={{ background: '#fefce8', padding: isMobile ? '8px' : '10px', borderRadius: '8px', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: isMobile ? '9px' : '10px', display: 'block', marginBottom: 4 }}>Margin</Text>
                      <Text strong style={{ color: colors.success, fontSize: isMobile ? '14px' : '16px' }}>
                        {product.profitMargin?.toFixed(1) || '0.0'}%
                      </Text>
                    </div>
                  </Col>
                </Row>
              </div>
            </List.Item>
          )}
          pagination={{ pageSize: isMobile ? 3 : 5, size: isMobile ? 'small' : 'default', simple: isMobile }}
        />
      ) : (
        <Empty description="No product performance data available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </DeviceAwareCard>
  );

  // =============================================
  // TRANSACTION DETAILS MODAL
  // =============================================
  const TransactionDetailsModal = ({ transaction, visible, onCancel }) => {
    if (!transaction) return null;
    const getShopName = () => {
      if (typeof transaction.shop === 'string') return transaction.shop;
      if (transaction.shop?.name) return transaction.shop.name;
      if (transaction.shopId) return shops.find(s => s._id === transaction.shopId)?.name || 'Unknown Shop';
      return 'Unknown Shop';
    };

    return (
      <Modal
        title={<Flex align="center" gap="small">
          <FileTextOutlined style={{ color: colors.primary }} />
          <Text strong style={{ fontSize: isMobile ? '14px' : '16px' }}>Transaction Details</Text>
          <Tag color={transaction.status === 'completed' ? colors.success : colors.warning}>
            {transaction.status?.toUpperCase() || 'COMPLETED'}
          </Tag>
        </Flex>}
        open={visible}
        onCancel={onCancel}
        footer={[<Button key="close" onClick={onCancel} type="primary" size={isMobile ? 'middle' : 'large'}>Close</Button>]}
        width={isMobile ? '100%' : 700}
        style={{ top: isMobile ? 0 : 50 }}
        bodyStyle={{ padding: isMobile ? '16px 12px' : '24px', maxHeight: isMobile ? 'calc(100vh - 120px)' : '60vh', overflowY: 'auto' }}
      >
        <Descriptions bordered column={isMobile ? 1 : 2} size="small"
          labelStyle={{ fontWeight: '600', background: '#f9fafb', fontSize: isMobile ? '12px' : '13px' }}
          contentStyle={{ background: '#ffffff', fontSize: isMobile ? '13px' : '14px' }}>
          <Descriptions.Item label="Transaction ID" span={isMobile ? 1 : 2}>
            <Text code style={{ fontSize: isMobile ? '11px' : '12px' }}>
              {transaction.transactionNumber || transaction._id}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Date & Time">{dayjs(transaction.saleDate).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="Customer">{transaction.customerName || 'Walk-in Customer'}</Descriptions.Item>
          <Descriptions.Item label="Shop">{getShopName()}</Descriptions.Item>
          <Descriptions.Item label="Cashier">{transaction.cashierName || 'Unknown Cashier'}</Descriptions.Item>
          <Descriptions.Item label="Payment Method">
            <Tag color={PAYMENT_METHOD_CONFIG[transaction.paymentMethod]?.color || colors.primary}>
              {transaction.paymentMethod?.toUpperCase() || 'CASH'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount">
            <Text strong style={{ color: colors.primary, fontSize: isMobile ? '16px' : '18px' }}>
              {CalculationUtils.formatCurrency(transaction.totalAmount)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Cost">
            <Text style={{ color: colors.warning, fontSize: isMobile ? '14px' : '16px' }}>
              {CalculationUtils.formatCurrency(transaction.cost || 0)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Profit">
            <Text strong style={{ color: CalculationUtils.getProfitColor(transaction.profit), fontSize: isMobile ? '14px' : '16px' }}>
              {CalculationUtils.formatCurrency(transaction.profit || 0)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Profit Margin">
            <Text strong style={{ color: colors.success, fontSize: isMobile ? '14px' : '16px' }}>
              {CalculationUtils.safeNumber(transaction.profitMargin, 0).toFixed(1)}%
            </Text>
          </Descriptions.Item>

          {transaction.items?.length > 0 && (
            <Descriptions.Item label="Items" span={isMobile ? 1 : 2}>
              <List size="small" dataSource={transaction.items}
                renderItem={(item) => (
                  <List.Item style={{ padding: isMobile ? '8px 4px' : '12px 0' }}>
                    <div style={{ width: '100%' }}>
                      <Text strong style={{ fontSize: isMobile ? '12px' : '13px' }}>
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
                      </Row>
                    </div>
                  </List.Item>
                )} />
            </Descriptions.Item>
          )}
        </Descriptions>
      </Modal>
    );
  };

  const renderOverviewTab = () => (
    <div>
      <FinancialOverview />
      <PaymentComposition />
      <Row gutter={[layoutConfig.gap, layoutConfig.gap]}>
        <Col xs={24} lg={12}><ShopPerformance /></Col>
        <Col xs={24} lg={12}><CashierPerformance /></Col>
      </Row>
      <ProductPerformance />
    </div>
  );

  // =============================================
  // RENDER
  // =============================================
  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout, overflow: 'hidden' }}>
      <Content style={{
        padding: layoutConfig.padding,
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%',
        paddingBottom: isMobile ? '96px' : layoutConfig.padding,
        minHeight: isMobile ? 'calc(100vh - 100px)' : '100vh'
      }}>
        <DeviceAwareCard
          title={<Flex vertical gap="small">
            <Flex align="center" gap="middle" wrap="wrap">
              <div style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.purple})`,
                borderRadius: '12px', padding: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <BarChartOutlined style={{ color: 'white', fontSize: isMobile ? '24px' : '28px' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Title level={isMobile ? 4 : 3} style={{ margin: 0, lineHeight: 1.2 }}>Transactions Report</Title>
                <Text type="secondary" style={{ fontSize: layoutConfig.fontSize.subtitle, display: 'block', marginTop: '4px' }}>
                  Comprehensive analysis of all transactions across your shops
                </Text>
              </div>
            </Flex>

            <Flex gap="middle" wrap="wrap" justify="space-between" style={{ marginTop: isMobile ? '12px' : '16px' }}>
              <Input
                ref={searchInputRef}
                placeholder="Search transactions..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: isMobile ? '100%' : 300, maxWidth: '100%', borderRadius: '8px' }}
                size={isMobile ? 'middle' : 'large'}
                allowClear
              />

              <Flex gap="small" wrap="wrap">
                <Button icon={<ReloadOutlined />} onClick={handleManualRefresh} disabled={loading}
                  size={isMobile ? 'middle' : 'large'} type="primary"
                  style={{ background: colors.primary, borderColor: colors.primary }}>
                  {!isMobile && 'Refresh'}
                </Button>
                <Button icon={<ExportOutlined />} onClick={handleExportData} loading={exportLoading}
                  size={isMobile ? 'middle' : 'large'}
                  style={{ color: colors.success, borderColor: colors.success }}>
                  {!isMobile && 'Export'}
                </Button>
                <Button icon={<FilterOutlined />} onClick={() => setFilterVisible(!filterVisible)}
                  size={isMobile ? 'middle' : 'large'} type={filterVisible ? 'primary' : 'default'}
                  style={filterVisible ? { background: colors.warning, borderColor: colors.warning } : {}}>
                  {!isMobile && (filterVisible ? 'Hide Filters' : 'Show Filters')}
                </Button>
              </Flex>
            </Flex>
          </Flex>}
          extra={null}
        />

        <Row style={{ marginBottom: 16 }} justify="space-between" align="middle" gutter={[8, 8]}>
          <Col xs={24} sm={12}>
            {dataTimestamp && (
              <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px', display: 'block' }}>
                Last updated: {new Date(dataTimestamp).toLocaleString()}
              </Text>
            )}
          </Col>
          <Col xs={24} sm={12}>
            {(filters.dateRange || filters.shop !== 'all' || filters.paymentMethod) && (
              <Space wrap style={{ justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px' }}>Active filters:</Text>
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

        {filterVisible && (
          <DeviceAwareCard title="Transaction Filters"
            extra={<Button size={isMobile ? 'small' : 'middle'} onClick={handleClearFilters}
              style={{ color: colors.error, borderColor: colors.error }}>Clear All</Button>}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12} md={6} lg={4}>
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ fontSize: isMobile ? '12px' : '13px' }}>Shop:</Text>
                  </div>
                  <Select value={filters.shop} onChange={(v) => handleFilterChange('shop', v)}
                    style={{ width: '100%' }} placeholder="Filter by shop" allowClear loading={loading}
                    size={isMobile ? 'small' : 'middle'} optionLabelProp="label">
                    <Option value="all" label="All Shops">All Shops</Option>
                    {shops.map(shop => (
                      <Option key={shop._id} value={shop._id} label={shop.name}>{shop.name}</Option>
                    ))}
                  </Select>
                </div>
              </Col>

              <Col xs={24} sm={12} md={6} lg={4}>
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ fontSize: isMobile ? '12px' : '13px' }}>Time Range:</Text>
                  </div>
                  <Select value={timeFilter} onChange={handleTimeFilterChange}
                    style={{ width: '100%' }} size={isMobile ? 'small' : 'middle'}>
                    {TIME_RANGE_OPTIONS.map(o => (
                      <Option key={o.value} value={o.value} label={o.label}>
                        <Space>{o.icon}{o.label}</Space>
                      </Option>
                    ))}
                  </Select>
                </div>
              </Col>

              <Col xs={24} sm={12} md={6} lg={4}>
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ fontSize: isMobile ? '12px' : '13px' }}>Payment Mode:</Text>
                  </div>
                  <Select value={filters.paymentMethod} onChange={(v) => handleFilterChange('paymentMethod', v)}
                    style={{ width: '100%' }} placeholder="Filter by payment mode" allowClear
                    size={isMobile ? 'small' : 'middle'}>
                    {PAYMENT_METHOD_OPTIONS.map(o => (
                      <Option key={o.value} value={o.value} label={o.label}>
                        <Space>{o.icon}{o.label}</Space>
                      </Option>
                    ))}
                  </Select>
                </div>
              </Col>

              {timeFilter === 'custom' && (
                <Col xs={24} sm={24} md={8} lg={6}>
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong style={{ fontSize: isMobile ? '12px' : '13px' }}>Custom Range:</Text>
                    </div>
                    <RangePicker onChange={handleCustomDateChange} value={customDateRange}
                      style={{ width: '100%' }} allowClear size={isMobile ? 'small' : 'middle'}
                      format="DD/MM/YYYY" />
                  </div>
                </Col>
              )}
            </Row>
          </DeviceAwareCard>
        )}

        {error && (
          <Alert message="Error Loading Data" description={error} type="error"
            style={{ marginBottom: 16, borderRadius: '12px', fontSize: isMobile ? '12px' : '14px' }}
            closable onClose={() => setError(null)} />
        )}

        {loading && !dashboardData.recentTransactions.length ? (
          <div style={{
            textAlign: 'center', padding: isMobile ? '30px 16px' : '50px',
            background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#6b7280', fontSize: isMobile ? '12px' : '14px' }}>
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
            size={isMobile ? 'small' : 'middle'}
            tabBarExtraContent={
              isMobile && (
                <Segmented
                  options={[
                    { label: <AppstoreOutlined />, value: 'grid' },
                    { label: <UnorderedListOutlined />, value: 'list' }
                  ]}
                  value={viewMode}
                  onChange={setViewMode}
                  size="small"
                />
              )
            }
          >
            <Tabs.TabPane
              tab={<span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: isMobile ? '4px 8px' : '8px 12px' }}>
                <PieChartOutlined style={{ fontSize: isMobile ? '12px' : '14px' }} />
                <span style={{ fontSize: isMobile ? '11px' : '13px' }}>Overview</span>
                <Badge count={dashboardData?.recentTransactions?.length || 0} overflowCount={999}
                  style={{ marginLeft: 4, fontSize: isMobile ? '9px' : '10px', background: colors.primary }} />
              </span>}
              key="overview"
            >
              {renderOverviewTab()}
            </Tabs.TabPane>

            <Tabs.TabPane
              tab={<span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: isMobile ? '4px 8px' : '8px 12px' }}>
                <TableOutlined style={{ fontSize: isMobile ? '12px' : '14px' }} />
                <span style={{ fontSize: isMobile ? '11px' : '13px' }}>Transactions</span>
                <Badge count={filteredTransactions.length} overflowCount={999}
                  style={{ marginLeft: 4, fontSize: isMobile ? '9px' : '10px', background: colors.primary }} />
              </span>}
              key="details"
            >
              <DeviceAwareCard
                title={`Transaction List (${filteredTransactions.length} of ${dashboardData?.recentTransactions?.length || 0})`}
                extra={filters.shop !== 'all' && <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '12px' }}>for {getShopNameForDisplay()}</Text>}
              >
                {isMobile && viewMode === 'list' ? (
                  <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto', padding: '4px' }}>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map(transaction => (
                        <TransactionItem key={transaction._id} transaction={transaction}
                          screens={screens} colors={colors} onView={handleViewTransaction} />
                      ))
                    ) : (
                      <Empty description="No transactions found" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '40px 0' }} />
                    )}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <Table
                      columns={columns}
                      dataSource={filteredTransactions}
                      rowKey={(record) => record._id || record.transactionNumber || Math.random()}
                      loading={loading}
                      pagination={{
                        pageSize: isMobile ? 10 : 20,
                        showSizeChanger: !isMobile,
                        showQuickJumper: !isMobile,
                        showTotal: !isMobile ? (total, range) => `${range[0]}-${range[1]} of ${total} transactions` : undefined,
                        size: isMobile ? 'small' : 'default',
                        simple: isMobile,
                        position: ['bottomCenter']
                      }}
                      scroll={{ x: isMobile ? 600 : 1200 }}
                      locale={{
                        emptyText: <Empty description="No transactions found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      }}
                      size={isMobile ? 'small' : 'middle'}
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

        {isMobile && (
          <FloatButton.Group trigger="click" type="primary" icon={<SettingOutlined />} tooltip="Device Settings"
            style={{ right: 16, bottom: 96 }}>
            <FloatButton icon={<MobileOutlined />} tooltip={`Mobile (${screens.width}×${screens.height})`} />
            <FloatButton icon={<ReloadOutlined />} onClick={handleManualRefresh} tooltip="Refresh Data" />
            <FloatButton.BackTop visibilityHeight={0} />
          </FloatButton.Group>
        )}
      </Content>
    </Layout>
  );
};

export default TransactionsReport;