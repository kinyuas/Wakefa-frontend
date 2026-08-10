// src/pages/Admin/ExpenseManagement.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Tag,
  Space,
  Button,
  Spin,
  Alert,
  Divider,
  Input,
  Modal,
  Form,
  InputNumber,
  Tooltip,
  FloatButton,
  message,
  Descriptions,
  Badge,
  Popconfirm,
  Dropdown,
  Drawer,
  Grid,
  Avatar,
  List,
  Progress,
  Select,
  DatePicker,
  Table,
  ConfigProvider,
  theme,
  Empty  // Added missing Empty component
} from 'antd';
import {
  // Core icons
  ShopOutlined,
  UserOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  LogoutOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  BarChartOutlined,
  TransactionOutlined,
  SearchOutlined,
  PlusOutlined,
  BarcodeOutlined,
  CalculatorOutlined,
  DeleteOutlined,
  ScanOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
  QrcodeOutlined,
  ClearOutlined,
  CreditCardOutlined,
  PhoneOutlined,
  CalendarOutlined,
  BankOutlined,
  MoneyCollectOutlined,
  HistoryOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  ShoppingOutlined,
  EyeOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  RiseOutlined,
  FallOutlined,
  StockOutlined,
  CloseOutlined,
  CameraOutlined,
  ShareAltOutlined,
  MobileOutlined,
  TabletOutlined,
  DesktopOutlined,
  MenuOutlined,
  SettingOutlined,
  DownloadOutlined,
  MessageOutlined,
  WhatsAppOutlined,
  MailOutlined,
  AppstoreOutlined,
  LayoutOutlined,
  CloudDownloadOutlined,
  ExportOutlined,
  PictureOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  CloudSyncOutlined,
  CheckOutlined,
  AuditOutlined,
  PartitionOutlined,
  LikeOutlined,
  StarOutlined,
  FireOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  TagOutlined,
  GiftOutlined,
  CrownOutlined,
  TrophyOutlined,
  CompassOutlined,
  GlobalOutlined,
  NotificationOutlined,
  SoundOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  HomeOutlined,
  PieChartOutlined,
  LineChartOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  ExclamationCircleOutlined,
  
  // Missing icons
  EditOutlined
} from '@ant-design/icons';
import { expenseAPI, shopAPI } from '../../services/api';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

// Extend dayjs with plugins
dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;
const { useToken } = theme;

// Enhanced Calculation Utilities
const ExpenseCalculationUtils = {
  safeNumber: (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  },

  formatCurrency: (amount) => {
    const value = ExpenseCalculationUtils.safeNumber(amount);
    return `KES ${value.toLocaleString('en-KE', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  },

  formatCompactCurrency: (amount) => {
    const value = ExpenseCalculationUtils.safeNumber(amount);
    if (value >= 1000000) {
      return `KES ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `KES ${(value / 1000).toFixed(1)}K`;
    }
    return ExpenseCalculationUtils.formatCurrency(value);
  },

  calculateStats: (expenses) => {
    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum, e) => sum + ExpenseCalculationUtils.safeNumber(e.amount), 0);
    const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;
    
    const today = dayjs().startOf('day');
    const todayExpenses = expenses.filter(e => dayjs(e.date).isSame(today, 'day'))
      .reduce((sum, e) => sum + ExpenseCalculationUtils.safeNumber(e.amount), 0);
    
    const highestExpense = expenses.length > 0 ? 
      Math.max(...expenses.map(e => ExpenseCalculationUtils.safeNumber(e.amount))) : 0;

    // Category analysis
    const byCategory = {};
    const byPayment = {};
    
    expenses.forEach(expense => {
      const category = expense.category || 'other';
      const payment = expense.paymentMethod || 'cash';
      const amount = ExpenseCalculationUtils.safeNumber(expense.amount);
      
      byCategory[category] = (byCategory[category] || 0) + amount;
      byPayment[payment] = (byPayment[payment] || 0) + amount;
    });

    return {
      totalExpenses,
      totalAmount,
      averageExpense,
      todayExpenses,
      highestExpense,
      byCategory,
      byPayment
    };
  },

  filterExpenses: (expenses, filters) => {
    return expenses.filter(expense => {
      const matchesSearch = !filters.searchText || 
        (expense.description?.toLowerCase().includes(filters.searchText.toLowerCase()) ||
         expense.category?.toLowerCase().includes(filters.searchText.toLowerCase()) ||
         expense.shopName?.toLowerCase().includes(filters.searchText.toLowerCase()));

      const matchesShop = !filters.shop || filters.shop === 'all' || 
        expense.shop === filters.shop;

      const matchesCategory = !filters.category || filters.category === 'all' || 
        expense.category === filters.category;

      const matchesPayment = !filters.paymentMethod || filters.paymentMethod === 'all' || 
        expense.paymentMethod === filters.paymentMethod;

      const matchesDate = !filters.dateRange || (
        dayjs(expense.date).isAfter(filters.dateRange[0]) && 
        dayjs(expense.date).isBefore(filters.dateRange[1])
      );

      return matchesSearch && matchesShop && matchesCategory && matchesPayment && matchesDate;
    });
  },

  generateAiInsights: (expenses, categories) => {
    const insights = [];
    const now = dayjs();
    const last30Days = now.subtract(30, 'day');
    
    // Calculate category trends
    const categoryTotals = {};
    const categoryCounts = {};
    
    expenses.forEach(expense => {
      const category = expense.category || 'other';
      const amount = ExpenseCalculationUtils.safeNumber(expense.amount);
      const date = dayjs(expense.date);
      
      if (date.isAfter(last30Days)) {
        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });

    // Generate insights
    Object.entries(categoryTotals).forEach(([category, total]) => {
      const avg = total / (categoryCounts[category] || 1);
      const categoryInfo = categories.find(c => c.value === category);
      
      if (categoryInfo && avg > (categoryInfo.avgAmount * 1.5)) {
        insights.push({
          type: 'warning',
          message: `${categoryInfo.label} expenses are 50% higher than average (KES ${avg.toLocaleString()})`,
          icon: '⚠️',
          action: 'Consider reviewing these expenses'
        });
      }
    });

    // Check for upcoming recurring expenses
    expenses.forEach(expense => {
      const category = expense.category || 'other';
      const categoryInfo = categories.find(c => c.value === category);
      
      if (categoryInfo && categoryInfo.aiPattern === 'monthly') {
        const expenseDate = dayjs(expense.date);
        const daysSince = now.diff(expenseDate, 'day');
        
        if (daysSince >= 28 && daysSince <= 35) {
          insights.push({
            type: 'info',
            message: `${categoryInfo.label} expense may be due soon`,
            icon: '📅',
            action: 'Check if payment is scheduled'
          });
        }
      }
    });

    return insights.slice(0, 5);
  },

  generatePredictiveSuggestions: (expenses) => {
    const suggestions = [];
    const now = dayjs();
    
    const monthlyExpenses = expenses.filter(e => 
      dayjs(e.date).isAfter(now.subtract(30, 'day'))
    );
    
    const totalMonthly = monthlyExpenses.reduce((sum, e) => sum + ExpenseCalculationUtils.safeNumber(e.amount), 0);
    const avgDaily = totalMonthly / 30;
    
    if (avgDaily > 0) {
      suggestions.push({
        title: 'Daily Average',
        value: ExpenseCalculationUtils.formatCurrency(Math.round(avgDaily)),
        description: 'Based on last 30 days',
        color: '#1890ff'
      });
    }

    // Predict next month
    const predictedTotal = totalMonthly * 1.1; // Assuming 10% increase
    suggestions.push({
      title: 'Next Month Prediction',
      value: ExpenseCalculationUtils.formatCurrency(Math.round(predictedTotal)),
      description: 'Based on current trends',
      color: '#722ed1'
    });

    return suggestions;
  }
};

// =============================================
// CONSTANTS AND CONFIGURATION
// =============================================

const CATEGORIES = [
  { 
    value: 'rent', 
    label: 'Rent', 
    color: '#ff6b6b', 
    gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)', 
    icon: '🏢',
    aiPattern: 'monthly',
    avgAmount: 50000
  },
  { 
    value: 'utilities', 
    label: 'Utilities', 
    color: '#4d96ff', 
    gradient: 'linear-gradient(135deg, #4d96ff 0%, #2779bd 100%)', 
    icon: '💡',
    aiPattern: 'monthly',
    avgAmount: 15000
  },
  { 
    value: 'salaries', 
    label: 'Salaries', 
    color: '#6bc77e', 
    gradient: 'linear-gradient(135deg, #6bc77e 0%, #38a169 100%)', 
    icon: '💰',
    aiPattern: 'monthly',
    avgAmount: 200000
  },
  { 
    value: 'supplies', 
    label: 'Supplies', 
    color: '#ffa94d', 
    gradient: 'linear-gradient(135deg, #ffa94d 0%, #f6993f 100%)', 
    icon: '📦',
    aiPattern: 'weekly',
    avgAmount: 5000
  },
  { 
    value: 'maintenance', 
    label: 'Maintenance', 
    color: '#9d4edd', 
    gradient: 'linear-gradient(135deg, #9d4edd 0%, #805ad5 100%)', 
    icon: '🔧',
    aiPattern: 'quarterly',
    avgAmount: 25000
  },
  { 
    value: 'marketing', 
    label: 'Marketing', 
    color: '#00c9c8', 
    gradient: 'linear-gradient(135deg, #00c9c8 0%, #00a3af 100%)', 
    icon: '📢',
    aiPattern: 'variable',
    avgAmount: 30000
  },
  { 
    value: 'transport', 
    label: 'Transport', 
    color: '#ff8a65', 
    gradient: 'linear-gradient(135deg, #ff8a65 0%, #ed8936 100%)', 
    icon: '🚚',
    aiPattern: 'daily',
    avgAmount: 2000
  },
  { 
    value: 'other', 
    label: 'Other', 
    color: '#95a5a6', 
    gradient: 'linear-gradient(135deg, #95a5a6 0%, #718096 100%)', 
    icon: '📝',
    aiPattern: 'variable',
    avgAmount: 10000
  }
];

const PAYMENT_METHODS = [
  { 
    value: 'cash', 
    label: 'Cash', 
    color: '#52c41a', 
    gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)', 
    icon: '💵'
  },
  { 
    value: 'mpesa', 
    label: 'M-Pesa/Bank', 
    color: '#1890ff', 
    gradient: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', 
    icon: '📱'
  }
];

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
              <DollarOutlined style={{ 
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

// =============================================
// MAIN COMPONENT
// =============================================

const ExpenseManagement = () => {
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
  
  // State management
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalAmount: 0,
    averageExpense: 0,
    todayExpenses: 0,
    highestExpense: 0,
    byCategory: {},
    byPayment: {}
  });
  
  // AI States
  const [aiInsights, setAiInsights] = useState([]);
  const [predictiveSuggestions, setPredictiveSuggestions] = useState([]);
  const [trendData, setTrendData] = useState([]);
  
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form] = Form.useForm();
  
  // Search and filter states
  const [searchText, setSearchText] = useState('');
  const [selectedShopFilter, setSelectedShopFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dateRange, setDateRange] = useState(null);
  
  // Mobile UI States
  const [mobileView, setMobileView] = useState('list');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [deviceType, setDeviceType] = useState('desktop');
  const [orientation, setOrientation] = useState('portrait');
  
  // Refs
  const receiptRef = useRef(null);
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

  // ========== DATA FETCHING ==========
  const fetchShops = useCallback(async () => {
    setShopLoading(true);
    try {
      const response = await shopAPI.getAll();
      const shopsData = response.data || response;
      
      if (shopsData && Array.isArray(shopsData)) {
        setShops(shopsData);
      } else {
        console.warn('Unexpected shops response format:', shopsData);
        setShops([]);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      message.warning('Failed to load shops');
      setShops([]);
    } finally {
      setShopLoading(false);
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await expenseAPI.getAll();
      const expensesData = response.data || response;
      
      if (expensesData && Array.isArray(expensesData)) {
        setExpenses(expensesData);
        
        // Calculate stats
        const calculatedStats = ExpenseCalculationUtils.calculateStats(expensesData);
        setStats(calculatedStats);
        
        // Generate AI insights
        setAiInsights(ExpenseCalculationUtils.generateAiInsights(expensesData, CATEGORIES));
        setPredictiveSuggestions(ExpenseCalculationUtils.generatePredictiveSuggestions(expensesData));
      } else {
        setError('Invalid expenses data format received from server');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setError('Failed to load expenses. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchShops();
  }, [fetchExpenses, fetchShops]);

  // Filter expenses based on current filters
  useEffect(() => {
    const filtered = ExpenseCalculationUtils.filterExpenses(expenses, {
      searchText,
      shop: selectedShopFilter,
      category: selectedCategoryFilter,
      paymentMethod: selectedPaymentFilter,
      dateRange
    });

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredExpenses(filtered);
  }, [expenses, searchText, selectedShopFilter, selectedCategoryFilter, selectedPaymentFilter, dateRange, sortOrder]);

  // ========== HANDLER FUNCTIONS ==========
  const handleAddExpense = useCallback(() => {
    form.resetFields();
    setEditingExpense(null);
    setIsModalVisible(true);
  }, [form]);

  const handleEditExpense = useCallback((expense) => {
    setEditingExpense(expense);
    form.setFieldsValue({
      ...expense,
      date: expense.date ? dayjs(expense.date) : null,
      shop: expense.shop || (shops.length > 0 ? shops[0]._id : '')
    });
    setIsModalVisible(true);
  }, [form, shops]);

  const handleDeleteExpense = useCallback(async (id) => {
    Modal.confirm({
      title: 'Delete Expense',
      content: 'Are you sure you want to delete this expense? This action cannot be undone.',
      icon: <ExclamationCircleOutlined />,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      width: isMobile ? '80%' : 400,
      centered: true,
      onOk: async () => {
        try {
          await expenseAPI.delete(id);
          const updatedExpenses = expenses.filter(expense => expense._id !== id);
          setExpenses(updatedExpenses);
          
          // Recalculate stats
          setStats(ExpenseCalculationUtils.calculateStats(updatedExpenses));
          setAiInsights(ExpenseCalculationUtils.generateAiInsights(updatedExpenses, CATEGORIES));
          setPredictiveSuggestions(ExpenseCalculationUtils.generatePredictiveSuggestions(updatedExpenses));
          
          message.success('Expense deleted successfully');
        } catch (error) {
          console.error('Error deleting expense:', error);
          message.error('Failed to delete expense');
        }
      }
    });
  }, [expenses, isMobile]);

  const handleRefresh = useCallback(() => {
    fetchExpenses();
    message.success('Data refreshed successfully');
  }, [fetchExpenses]);

  const handleSubmit = useCallback(async (values) => {
    setFormLoading(true);
    try {
      if (!values.shop) {
        message.error('Please select a shop for this expense.');
        return;
      }

      const selectedShop = shops.find(shop => shop._id === values.shop);
      if (!selectedShop) {
        message.error('Selected shop not found. Please refresh and try again.');
        return;
      }

      const currentUser = JSON.parse(localStorage.getItem('adminData') || localStorage.getItem('cashierData') || '{}');
      const recordedBy = currentUser.name || currentUser.email || 'System';

      const expenseData = {
        category: values.category,
        amount: parseFloat(values.amount),
        date: values.date ? values.date.toISOString() : new Date().toISOString(),
        paymentMethod: values.paymentMethod,
        description: values.description || `${values.category} expense`,
        recordedBy: recordedBy,
        shop: values.shop,
        shopId: selectedShop._id,
        shopName: selectedShop.name || selectedShop.shopName,
        status: 'completed',
        notes: values.notes || '',
        referenceNumber: `EXP-${Date.now().toString().slice(-6)}`,
        aiProcessed: true,
        processingTime: new Date().toISOString()
      };

      let result;
      if (editingExpense) {
        result = await expenseAPI.update(editingExpense._id, expenseData);
        const updatedExpenses = expenses.map(expense => 
          expense._id === editingExpense._id ? result.data || result : expense
        );
        setExpenses(updatedExpenses);
        message.success('Expense updated successfully');
      } else {
        result = await expenseAPI.create(expenseData);
        const newExpenses = [result.data || result, ...expenses];
        setExpenses(newExpenses);
        message.success('Expense added successfully');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error submitting expense:', error);
      message.error(error.message || 'Failed to save expense');
    } finally {
      setFormLoading(false);
    }
  }, [editingExpense, expenses, form, shops]);

  const handleSearch = useCallback((value) => {
    setSearchText(value);
  }, []);

  const handleShopFilterChange = useCallback((value) => {
    setSelectedShopFilter(value);
  }, []);

  const handleCategoryFilterChange = useCallback((value) => {
    setSelectedCategoryFilter(value);
  }, []);

  const handlePaymentFilterChange = useCallback((value) => {
    setSelectedPaymentFilter(value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setSelectedShopFilter('all');
    setSelectedCategoryFilter('all');
    setSelectedPaymentFilter('all');
    setDateRange(null);
    setSortOrder('desc');
    message.success('Filters cleared');
  }, []);

  const toggleSortOrder = useCallback(() => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newOrder);
    message.info(`Sorted by date: ${newOrder === 'desc' ? 'Newest first' : 'Oldest first'}`);
  }, [sortOrder]);

  // ========== EXPORT FUNCTIONS ==========
  const handleExport = async (type = 'pdf') => {
    try {
      if (type === 'pdf') {
        await exportToPDF();
      } else if (type === 'csv') {
        await exportToCSV();
      }
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export data');
    }
  };

  const exportToPDF = async () => {
    if (!receiptRef.current) {
      message.error('No data to export');
      return;
    }

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape');
      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`expenses-report-${dayjs().format('YYYY-MM-DD')}.pdf`);
      
      message.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      message.error('Failed to export PDF');
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Category', 'Amount', 'Shop', 'Payment Method', 'Description'];
    const data = filteredExpenses.map(expense => [
      dayjs(expense.date).format('DD/MM/YYYY'),
      expense.category,
      expense.amount,
      expense.shopName || 'Unknown',
      expense.paymentMethod,
      expense.description || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses-${dayjs().format('YYYY-MM-DD')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success('Data exported successfully');
  };

  // ========== HELPER FUNCTIONS ==========
  const getCategoryInfo = (category) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
  };

  const getPaymentMethodInfo = (method) => {
    return PAYMENT_METHODS.find(p => p.value === method) || PAYMENT_METHODS[0];
  };

  const formatCurrency = (amount) => {
    return ExpenseCalculationUtils.formatCurrency(amount);
  };

  const formatCompactCurrency = (amount) => {
    return ExpenseCalculationUtils.formatCompactCurrency(amount);
  };

  const formatDate = (date) => {
    return date ? dayjs(date).format('DD/MM/YYYY') : 'N/A';
  };

  const getShopName = (shopId) => {
    if (!shopId) return 'No Shop Assigned';
    
    const shop = shops.find(s => s._id === shopId);
    return shop?.name || shop?.shopName || 'Unknown Shop';
  };

  // ========== COMPONENTS ==========
  const shopOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Shops' },
      ...shops.map(shop => ({
        value: shop._id,
        label: shop.name || shop.shopName || `Shop ${shop._id}`
      }))
    ];
  }, [shops]);

  const categoryOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Categories' },
      ...CATEGORIES.map(cat => ({
        value: cat.value,
        label: (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 8, fontSize: '16px' }}>{cat.icon}</span>
            <span>{cat.label}</span>
          </span>
        )
      }))
    ];
  }, []);

  const paymentOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Payment Methods' },
      ...PAYMENT_METHODS.map(pm => ({
        value: pm.value,
        label: (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 8, fontSize: '16px' }}>{pm.icon}</span>
            <span>{pm.label}</span>
          </span>
        )
      }))
    ];
  }, []);

  // Table columns
  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: 'Date',
        dataIndex: 'date',
        key: 'date',
        render: (date) => (
          <Tag color={colors.primary} style={{ fontSize: isMobile ? '11px' : '12px' }}>
            {formatDate(date)}
          </Tag>
        ),
        sorter: (a, b) => new Date(a.date) - new Date(b.date),
        width: isMobile ? 90 : 120
      },
      {
        title: 'Category',
        dataIndex: 'category',
        key: 'category',
        render: (category) => {
          const catInfo = getCategoryInfo(category);
          return (
            <Tag 
              color={catInfo.color}
              style={{ 
                fontSize: isMobile ? '11px' : '12px',
                padding: isMobile ? '2px 8px' : '4px 12px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{catInfo.icon}</span>
              <span>{catInfo.label}</span>
            </Tag>
          );
        },
        width: isMobile ? 100 : 140
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        render: (amount) => (
          <Text strong style={{ 
            color: colors.error,
            fontSize: isMobile ? '13px' : '14px'
          }}>
            {formatCurrency(amount)}
          </Text>
        ),
        sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
        width: isMobile ? 100 : 140
      }
    ];

    if (!isMobile) {
      baseColumns.push(
        {
          title: 'Shop',
          dataIndex: 'shop',
          key: 'shop',
          render: (shopId) => (
            <Space>
              <ShopOutlined style={{ color: colors.primary }} />
              <Text>{getShopName(shopId)}</Text>
            </Space>
          ),
          width: 140
        },
        {
          title: 'Payment',
          dataIndex: 'paymentMethod',
          key: 'paymentMethod',
          render: (method) => {
            const pmInfo = getPaymentMethodInfo(method);
            return (
              <Tag color={pmInfo.color} style={{ fontSize: '12px' }}>
                {pmInfo.icon} {pmInfo.label}
              </Tag>
            );
          },
          width: 140
        }
      );
    }

    baseColumns.push({
      title: 'Actions',
      key: 'action',
      fixed: isMobile ? false : 'right',
      width: isMobile ? 80 : 110,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditExpense(record)}
              style={{ 
                background: colors.primary,
                borderColor: colors.primary
              }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteExpense(record._id)}
            />
          </Tooltip>
        </Space>
      )
    });

    return baseColumns;
  }, [isMobile, colors, handleEditExpense, handleDeleteExpense]);

  // Mobile Navigation Component
  const MobileNavBar = useCallback(() => {
    if (!isMobile) return null;
    
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
              type={mobileView === 'list' ? 'primary' : 'text'}
              icon={<AppstoreOutlined />}
              onClick={() => setMobileView('list')}
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
              List
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
              type={mobileView === 'insights' ? 'primary' : 'text'}
              icon={<EyeOutlined />}
              onClick={() => setMobileView('insights')}
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
              AI
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
  }, [isMobile, mobileView]);

  // Mobile Drawer Component
  const MobileDrawer = useCallback(() => (
    <Drawer
      title="Expense Management"
      placement="right"
      onClose={() => setDrawerVisible(false)}
      open={drawerVisible}
      width={280}
      bodyStyle={{ padding: '16px' }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
          icon={<PlusOutlined />}
          type="primary"
          block
          style={{ 
            height: '50px', 
            fontSize: '14px',
            marginBottom: '8px'
          }}
          onClick={() => {
            handleAddExpense();
            setDrawerVisible(false);
          }}
        >
          Add New Expense
        </Button>
        
        <Button 
          icon={<FilterOutlined />}
          block
          style={{ height: '50px', fontSize: '14px' }}
          onClick={() => {
            setFilterDrawerVisible(true);
            setDrawerVisible(false);
          }}
        >
          Advanced Filters
        </Button>
        
        <Button 
          icon={<DownloadOutlined />}
          block
          style={{ height: '50px', fontSize: '14px' }}
          onClick={() => {
            handleExport('csv');
            setDrawerVisible(false);
          }}
        >
          Export Data
        </Button>
        
        <Divider />
        
        <Button 
          icon={<ReloadOutlined />}
          block
          style={{ height: '50px', fontSize: '14px' }}
          onClick={() => {
            fetchExpenses();
            fetchShops();
            setDrawerVisible(false);
            message.success('Data refreshed');
          }}
        >
          Refresh Data
        </Button>
        
        <Divider />
        
        <Button 
          icon={<HomeOutlined />}
          block
          style={{ height: '50px', fontSize: '14px' }}
          onClick={() => {
            navigate('/admin/dashboard');
            setDrawerVisible(false);
          }}
        >
          Back to Dashboard
        </Button>
      </Space>
    </Drawer>
  ), [drawerVisible, handleAddExpense, fetchExpenses, fetchShops, navigate]);

  // Mobile Filter Drawer
  const MobileFilterDrawer = useCallback(() => (
    <Drawer
      title="Filter Expenses"
      placement="right"
      onClose={() => setFilterDrawerVisible(false)}
      open={filterDrawerVisible}
      width={300}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Select
          placeholder="Select Shop"
          value={selectedShopFilter}
          onChange={handleShopFilterChange}
          options={shopOptions}
          style={{ width: '100%' }}
          size="large"
        />
        
        <Select
          placeholder="Select Category"
          value={selectedCategoryFilter}
          onChange={handleCategoryFilterChange}
          options={categoryOptions}
          style={{ width: '100%' }}
          size="large"
        />
        
        <Select
          placeholder="Select Payment Method"
          value={selectedPaymentFilter}
          onChange={handlePaymentFilterChange}
          options={paymentOptions}
          style={{ width: '100%' }}
          size="large"
        />
        
        <RangePicker
          style={{ width: '100%' }}
          value={dateRange}
          onChange={setDateRange}
          size="large"
        />
        
        <Button
          icon={<SortAscendingOutlined />}
          onClick={toggleSortOrder}
          block
          size="large"
          type={sortOrder === 'desc' ? 'primary' : 'default'}
        >
          Sort: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
        </Button>
        
        <Button
          icon={<FilterOutlined />}
          onClick={handleClearFilters}
          block
          size="large"
          type="default"
        >
          Clear All Filters
        </Button>
      </Space>
    </Drawer>
  ), [filterDrawerVisible, selectedShopFilter, selectedCategoryFilter, selectedPaymentFilter, dateRange, sortOrder, shopOptions, categoryOptions, paymentOptions, handleShopFilterChange, handleCategoryFilterChange, handlePaymentFilterChange, toggleSortOrder, handleClearFilters]);

  // AI Insights Component
  const AIInsightsCard = useCallback(() => (
    <DeviceAwareCard
      title="AI Insights"
      extra={<Tag color="purple">Smart</Tag>}
    >
      {aiInsights.length > 0 ? (
        <List
          dataSource={aiInsights}
          renderItem={(insight) => (
            <List.Item>
              <Alert
                message={insight.message}
                description={insight.action}
                type={insight.type}
                showIcon
                icon={<span style={{ fontSize: '16px' }}>{insight.icon}</span>}
                style={{ width: '100%', borderRadius: '6px' }}
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="No insights yet. Add more expenses to generate AI insights." />
      )}
    </DeviceAwareCard>
  ), [aiInsights]);

  // Predictive Suggestions Component
  const PredictiveSuggestionsCard = useCallback(() => (
    <DeviceAwareCard
      title="Predictive Analytics"
      extra={<Tag color="blue">Forecast</Tag>}
    >
      {predictiveSuggestions.length > 0 ? (
        <Row gutter={[16, 16]}>
          {predictiveSuggestions.map((suggestion, index) => (
            <Col span={12} key={index}>
              <Card
                size="small"
                style={{ 
                  background: suggestion.color,
                  border: 'none',
                  borderRadius: '6px'
                }}
                bodyStyle={{ padding: '12px' }}
              >
                <Statistic
                  title={
                    <Text style={{ color: 'white', fontSize: '12px' }}>
                      {suggestion.title}
                    </Text>
                  }
                  value={suggestion.value}
                  valueStyle={{ 
                    color: 'white', 
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                />
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '10px' }}>
                  {suggestion.description}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="Add more data for predictions" />
      )}
    </DeviceAwareCard>
  ), [predictiveSuggestions]);

  // Category Breakdown Component
  const CategoryBreakdownCard = useCallback(() => (
    <DeviceAwareCard title="Category Breakdown">
      {Object.keys(stats.byCategory).length > 0 ? (
        <>
          {Object.entries(stats.byCategory).map(([category, amount]) => {
            const percentage = stats.totalAmount > 0 ? (amount / stats.totalAmount * 100) : 0;
            const categoryInfo = getCategoryInfo(category);
            
            return (
              <div key={category} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Space>
                    <span style={{ fontSize: '16px' }}>{categoryInfo.icon}</span>
                    <Text strong>{categoryInfo.label}</Text>
                  </Space>
                  <Text strong>{percentage.toFixed(1)}%</Text>
                </div>
                <Progress 
                  percent={percentage} 
                  strokeColor={categoryInfo.color}
                  strokeWidth={10}
                  showInfo={false}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Amount:</Text>
                  <Text strong>{formatCurrency(amount)}</Text>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <Empty description="No category data available" />
      )}
    </DeviceAwareCard>
  ), [stats.byCategory, stats.totalAmount]);

  // Payment Breakdown Component
  const PaymentBreakdownCard = useCallback(() => (
    <DeviceAwareCard title="Payment Distribution">
      {Object.keys(stats.byPayment).length > 0 ? (
        <>
          {Object.entries(stats.byPayment).map(([method, amount]) => {
            const percentage = stats.totalAmount > 0 ? (amount / stats.totalAmount * 100) : 0;
            const methodInfo = getPaymentMethodInfo(method);
            
            return (
              <div key={method} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Space>
                    <span style={{ fontSize: '16px' }}>{methodInfo.icon}</span>
                    <Text strong>{methodInfo.label}</Text>
                  </Space>
                  <Text strong>{percentage.toFixed(1)}%</Text>
                </div>
                <Progress 
                  percent={percentage} 
                  strokeColor={methodInfo.color}
                  strokeWidth={10}
                  showInfo={false}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Amount:</Text>
                  <Text strong>{formatCurrency(amount)}</Text>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <Empty description="No payment data available" />
      )}
    </DeviceAwareCard>
  ), [stats.byPayment, stats.totalAmount]);

  // Mobile Expense List
  const MobileExpenseList = useCallback(() => (
    <div style={{ padding: '8px' }}>
      {filteredExpenses.length === 0 ? (
        <Empty
          description="No expenses found"
          style={{ padding: '40px 0' }}
        />
      ) : (
        filteredExpenses.map((expense) => {
          const categoryInfo = getCategoryInfo(expense.category);
          return (
            <Card
              key={expense._id}
              style={{ 
                marginBottom: '8px',
                borderRadius: '8px',
                borderLeft: `4px solid ${categoryInfo.color}`
              }}
              bodyStyle={{ padding: '12px' }}
              hoverable
              onClick={() => handleEditExpense(expense)}
            >
              <Row gutter={8} align="middle">
                <Col span={16}>
                  <Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                    {categoryInfo.icon} {categoryInfo.label}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                    {getShopName(expense.shop)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {formatDate(expense.date)}
                  </Text>
                </Col>
                <Col span={8} style={{ textAlign: 'right' }}>
                  <Text strong style={{ color: colors.error, fontSize: '14px' }}>
                    {formatCurrency(expense.amount)}
                  </Text>
                  <Space size={2} style={{ marginTop: '8px', justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditExpense(expense);
                      }}
                      style={{ padding: '0 4px', height: '24px' }}
                    />
                    <Button
                      size="small"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteExpense(expense._id);
                      }}
                      style={{ padding: '0 4px', height: '24px' }}
                    />
                  </Space>
                </Col>
              </Row>
            </Card>
          );
        })
      )}
    </div>
  ), [filteredExpenses, handleEditExpense, handleDeleteExpense]);

  // ========== RENDER ==========
  if (loading && expenses.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #1a365d 0%, #2d3748 100%)'
      }}>
        <Spin size="large" style={{ color: 'white', marginBottom: 24 }} />
        <p style={{ color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
          Loading expenses...
        </p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
          Please wait while we fetch your data
        </p>
      </div>
    );
  }

  return (
    <Layout style={{ 
      minHeight: '100vh', 
      background: token.colorBgLayout,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Header style={{ 
        background: 'linear-gradient(135deg, #1a365d 0%, #2d3748 100%)',
        padding: isMobile ? '0 8px' : '0 16px',
        height: isMobile ? '56px' : '64px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <Row justify="space-between" align="middle" style={{ height: '100%' }}>
          <Col>
            <Space>
              {isMobile ? (
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate('/admin/dashboard')}
                  type="text"
                  style={{ color: 'white', padding: '4px' }}
                />
              ) : (
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate('/admin/dashboard')}
                  type="text"
                  style={{ color: 'white' }}
                >
                  Dashboard
                </Button>
              )}
              <Title 
                level={isMobile ? 5 : 4} 
                style={{ margin: 0, color: 'white' }}
              >
                <DollarOutlined style={{ marginRight: '8px' }} /> 
                Expense Management
              </Title>
            </Space>
          </Col>
          
          <Col>
            <Space>
              {!isMobile && (
                <>
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    loading={loading}
                    size="small"
                    style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                  >
                    Refresh
                  </Button>
                  <Button 
                    icon={<PlusOutlined />}
                    onClick={handleAddExpense}
                    disabled={shops.length === 0}
                    type="primary"
                    size="small"
                    style={{ borderRadius: '6px' }}
                  >
                    Add Expense
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Header>

      <Content style={{ 
        padding: layoutConfig.padding,
        marginBottom: isMobile ? '60px' : '0',
        minHeight: isMobile ? 'calc(100vh - 116px)' : 'calc(100vh - 64px)',
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Mobile Navigation */}
        {isMobile && <MobileNavBar />}
        {isMobile && <MobileDrawer />}
        {isMobile && <MobileFilterDrawer />}

        {/* Statistics Cards */}
        {(!isMobile || mobileView === 'stats') && (
          <Row gutter={[layoutConfig.gap, layoutConfig.gap]} style={{ marginBottom: layoutConfig.gap }}>
            <Col xs={24} sm={12} lg={6}>
              <ResponsiveStatCard
                title="Total Expenses"
                value={stats.totalExpenses}
                icon={<BarChartOutlined />}
                color={colors.error}
                suffix="expenses"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <ResponsiveStatCard
                title="Total Amount"
                value={formatCompactCurrency(stats.totalAmount)}
                prefix="KES"
                icon={<MoneyCollectOutlined />}
                color={colors.primary}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <ResponsiveStatCard
                title="Today's Expenses"
                value={formatCompactCurrency(stats.todayExpenses)}
                prefix="KES"
                icon={<CalendarOutlined />}
                color={colors.success}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <ResponsiveStatCard
                title="Highest Expense"
                value={formatCompactCurrency(stats.highestExpense)}
                prefix="KES"
                icon={<RiseOutlined />}
                color={colors.warning}
              />
            </Col>
          </Row>
        )}

        {/* AI Insights */}
        {(!isMobile || mobileView === 'insights') && (
          <Row gutter={[layoutConfig.gap, layoutConfig.gap]} style={{ marginBottom: layoutConfig.gap }}>
            <Col xs={24} lg={12}>
              <AIInsightsCard />
            </Col>
            <Col xs={24} lg={12}>
              <PredictiveSuggestionsCard />
            </Col>
          </Row>
        )}

        {/* Category and Payment Breakdown */}
        {!isMobile && mobileView === 'stats' && (
          <Row gutter={[layoutConfig.gap, layoutConfig.gap]} style={{ marginBottom: layoutConfig.gap }}>
            <Col xs={24} lg={12}>
              <CategoryBreakdownCard />
            </Col>
            <Col xs={24} lg={12}>
              <PaymentBreakdownCard />
            </Col>
          </Row>
        )}

        {/* Error Alert */}
        {error && (
          <Alert
            message="Error Loading Expenses"
            description={error}
            type="error"
            showIcon
            action={
              <Button 
                size="small" 
                onClick={fetchExpenses}
                style={{ 
                  background: colors.primary,
                  border: 'none',
                  color: 'white'
                }}
              >
                Retry
              </Button>
            }
            style={{ 
              marginBottom: layoutConfig.gap,
              borderRadius: '12px',
              border: 'none'
            }}
          />
        )}

        {/* Search and Filter Section */}
        {(!isMobile || mobileView === 'list') && (
          <DeviceAwareCard
            title="Search & Filter Expenses"
            extra={
              <Badge 
                count={filteredExpenses.length} 
                showZero 
                style={{ 
                  backgroundColor: colors.primary,
                  boxShadow: '0 0 0 2px #fff'
                }}
              />
            }
          >
            {isMobile ? (
              <>
                <Search
                  ref={searchInputRef}
                  placeholder="Search expenses..."
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                  allowClear
                  size="large"
                  style={{ marginBottom: layoutConfig.gap }}
                />
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setFilterDrawerVisible(true)}
                  block
                  size="large"
                >
                  Show Filters
                </Button>
              </>
            ) : (
              <>
                <Row gutter={[16, 16]} align="middle">
                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Input
                      placeholder="Search by description, category, shop..."
                      prefix={<SearchOutlined style={{ color: colors.primary }} />}
                      value={searchText}
                      onChange={(e) => handleSearch(e.target.value)}
                      allowClear
                      size="large"
                      style={{ borderRadius: '10px' }}
                    />
                  </Col>
                  <Col xs={12} sm={8} md={6} lg={4}>
                    <Select
                      placeholder="Shop"
                      value={selectedShopFilter}
                      onChange={handleShopFilterChange}
                      options={shopOptions}
                      style={{ width: '100%' }}
                      size="large"
                    />
                  </Col>
                  <Col xs={12} sm={8} md={6} lg={4}>
                    <Select
                      placeholder="Category"
                      value={selectedCategoryFilter}
                      onChange={handleCategoryFilterChange}
                      options={categoryOptions}
                      style={{ width: '100%' }}
                      size="large"
                    />
                  </Col>
                  <Col xs={12} sm={8} md={6} lg={4}>
                    <Select
                      placeholder="Payment"
                      value={selectedPaymentFilter}
                      onChange={handlePaymentFilterChange}
                      options={paymentOptions}
                      style={{ width: '100%' }}
                      size="large"
                    />
                  </Col>
                  <Col xs={12} sm={6} md={4} lg={3}>
                    <Button 
                      icon={<SortAscendingOutlined />}
                      onClick={toggleSortOrder}
                      style={{ width: '100%' }}
                      size="large"
                      type={sortOrder === 'desc' ? 'primary' : 'default'}
                    >
                      {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                    </Button>
                  </Col>
                  <Col xs={12} sm={6} md={4} lg={3}>
                    <Button 
                      icon={<FilterOutlined />}
                      onClick={handleClearFilters}
                      style={{ width: '100%' }}
                      size="large"
                      type="default"
                    >
                      Clear
                    </Button>
                  </Col>
                </Row>
                
                <Divider style={{ margin: '20px 0' }} />
                
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text style={{ fontSize: '15px', fontWeight: '500' }}>
                      <span style={{ color: colors.primary, fontWeight: '700', fontSize: '16px' }}>
                        {filteredExpenses.length}
                      </span>
                      {' '}expenses found
                      {searchText && (
                        <span style={{ marginLeft: '8px', color: colors.warning }}>
                          matching "<strong>{searchText}</strong>"
                        </span>
                      )}
                    </Text>
                  </Col>
                  <Col>
                    <Space>
                      <Button 
                        icon={<ReloadOutlined />}
                        onClick={handleRefresh}
                        loading={loading}
                        size="large"
                        style={{ 
                          borderColor: colors.primary,
                          color: colors.primary,
                          borderRadius: '10px'
                        }}
                      >
                        Refresh
                      </Button>
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: 'pdf',
                              label: 'Export as PDF',
                              icon: <FilePdfOutlined />,
                              onClick: () => handleExport('pdf')
                            },
                            {
                              key: 'csv',
                              label: 'Export as CSV',
                              icon: <FileTextOutlined />,
                              onClick: () => handleExport('csv')
                            }
                          ]
                        }}
                        trigger={['click']}
                      >
                        <Button 
                          icon={<DownloadOutlined />}
                          size="large"
                          style={{ 
                            background: colors.success,
                            borderColor: colors.success,
                            color: 'white'
                          }}
                        >
                          Export
                        </Button>
                      </Dropdown>
                    </Space>
                  </Col>
                </Row>
              </>
            )}
          </DeviceAwareCard>
        )}

        {/* Expenses Table/List */}
        {(!isMobile || mobileView === 'list') && (
          <DeviceAwareCard
            title={`Expense List (${filteredExpenses.length})`}
            extra={
              shops.length === 0 && !shopLoading && (
                <Alert
                  message="No Shops Available"
                  description={
                    <span>
                      Create shops first before adding expenses.{' '}
                      <a href="#" onClick={(e) => {
                        e.preventDefault();
                        navigate('/admin/shops');
                      }} style={{ fontWeight: '600' }}>
                        Go to Shops
                      </a>
                    </span>
                  }
                  type="warning"
                  showIcon
                  style={{ borderRadius: '12px', border: 'none' }}
                />
              )
            }
          >
            {isMobile ? (
              <MobileExpenseList />
            ) : (
              <>
                {filteredExpenses.length === 0 && !loading ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px',
                    backgroundColor: '#fafafa',
                    borderRadius: '16px'
                  }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.6 }}>
                      💸
                    </div>
                    <h3 style={{ color: colors.dark, marginBottom: '12px', fontSize: '20px', fontWeight: '700' }}>
                      {searchText || selectedShopFilter !== 'all' 
                        ? 'No Matching Expenses Found'
                        : 'No Expenses Yet'}
                    </h3>
                    <p style={{ color: colors.warning, marginBottom: '32px', fontSize: '15px' }}>
                      {searchText || selectedShopFilter !== 'all' 
                        ? 'Try adjusting your search terms or filters'
                        : 'Start tracking your business expenses'}
                    </p>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />} 
                      onClick={handleAddExpense}
                      disabled={shops.length === 0}
                      size="large"
                      style={{ 
                        background: colors.primary,
                        borderColor: colors.primary,
                        padding: '12px 32px',
                        fontSize: '16px',
                        height: 'auto'
                      }}
                    >
                      Add Your First Expense
                    </Button>
                  </div>
                ) : (
                  <div style={{ 
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch'
                  }}>
                    <Table 
                      columns={columns} 
                      dataSource={filteredExpenses} 
                      rowKey="_id"
                      loading={loading}
                      pagination={{ 
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => 
                          `${range[0]}-${range[1]} of ${total} expenses`,
                        size: 'small',
                        position: ['bottomCenter']
                      }}
                      scroll={{ x: 'max-content' }}
                      size="middle"
                      rowClassName={() => 'expense-table-row'}
                      onRow={(record) => ({
                        onClick: () => handleEditExpense(record),
                        style: { cursor: 'pointer' }
                      })}
                    />
                  </div>
                )}
              </>
            )}
          </DeviceAwareCard>
        )}

        {/* Mobile Add Expense Button */}
        {isMobile && (
          <FloatButton
            icon={<PlusOutlined />}
            type="primary"
            style={{ 
              right: 24,
              bottom: 80,
              width: 56,
              height: 56
            }}
            onClick={handleAddExpense}
            disabled={shops.length === 0}
            tooltip="Add Expense"
          />
        )}
      </Content>

      {/* Add/Edit Expense Modal */}
      <Modal
        title={
          <Space>
            <DollarOutlined style={{ color: colors.primary }} />
            <Text strong style={{ fontSize: isMobile ? '16px' : '18px' }}>
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </Text>
          </Space>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={isMobile ? '95%' : 500}
        maskClosable={false}
        style={{ top: isMobile ? 10 : 20 }}
        bodyStyle={{
          maxHeight: isMobile ? '70vh' : '80vh',
          overflowY: 'auto',
          padding: isMobile ? '16px' : '24px'
        }}
      >
        <Form 
          form={form} 
          onFinish={handleSubmit} 
          layout="vertical"
          initialValues={{ 
            amount: 0,
            paymentMethod: 'cash',
            category: 'other',
            date: dayjs(),
            shop: shops.length > 0 ? shops[0]._id : ''
          }}
          size={isMobile ? 'middle' : 'large'}
        >
          <Row gutter={isMobile ? 8 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item 
                name="date" 
                label={
                  <Space>
                    <CalendarOutlined style={{ color: colors.primary }} />
                    <Text strong>Date</Text>
                  </Space>
                } 
                rules={[{ required: true, message: 'Please select a date' }]}
              >
                <DatePicker 
                  style={{ width: '100%' }} 
                  format="YYYY-MM-DD"
                  placeholder="Select date"
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item 
                name="shop" 
                label={
                  <Space>
                    <ShopOutlined style={{ color: colors.primary }} />
                    <Text strong>Shop</Text>
                  </Space>
                } 
                rules={[{ required: true, message: 'Please select a shop' }]}
              >
                <Select 
                  placeholder="Select shop"
                  loading={shopLoading}
                  disabled={shops.length === 0}
                >
                  {shops.map(shop => (
                    <Option key={shop._id} value={shop._id}>
                      {shop.name || shop.shopName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={isMobile ? 8 : 16}>
            <Col xs={24} sm={12}>
              <Form.Item 
                name="category" 
                label={
                  <Space>
                    <PieChartOutlined style={{ color: colors.primary }} />
                    <Text strong>Category</Text>
                  </Space>
                } 
                rules={[{ required: true, message: 'Please select a category' }]}
              >
                <Select placeholder="Select category">
                  {CATEGORIES.map(cat => (
                    <Option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item 
                name="paymentMethod" 
                label={
                  <Space>
                    <CreditCardOutlined style={{ color: colors.primary }} />
                    <Text strong>Payment Method</Text>
                  </Space>
                } 
                rules={[{ required: true, message: 'Please select payment method' }]}
              >
                <Select placeholder="Select payment method">
                  {PAYMENT_METHODS.map(pm => (
                    <Option key={pm.value} value={pm.value}>
                      {pm.icon} {pm.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item 
            name="amount" 
            label={
              <Space>
                <MoneyCollectOutlined style={{ color: colors.error }} />
                <Text strong>Amount (KES)</Text>
              </Space>
            } 
            rules={[
              { required: true, message: 'Please enter amount' },
              { 
                type: 'number',
                min: 0.01,
                transform: value => parseFloat(value),
                message: 'Amount must be greater than 0' 
              }
            ]}
          >
            <InputNumber 
              style={{ width: '100%' }}
              min={0.01}
              step={0.01}
              precision={2}
              placeholder="0.00"
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item 
            name="description" 
            label={<Text strong>Description</Text>}
          >
            <Input.TextArea 
              placeholder="Enter expense description (optional)"
              rows={3}
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item 
            name="notes" 
            label={<Text strong>Additional Notes</Text>}
          >
            <Input.TextArea 
              placeholder="Additional notes (optional)"
              rows={2}
              maxLength={100}
              showCount
            />
          </Form.Item>

          <div style={{ 
            textAlign: 'right',
            padding: '16px 0',
            borderTop: `1px solid ${token.colorBorder}`,
            marginTop: '24px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <Button 
              onClick={() => {
                setIsModalVisible(false);
                form.resetFields();
              }} 
              disabled={formLoading}
              size={isMobile ? 'middle' : 'large'}
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={formLoading}
              disabled={shops.length === 0}
              size={isMobile ? 'middle' : 'large'}
              style={{ 
                background: colors.primary,
                borderColor: colors.primary,
                minWidth: isMobile ? '120px' : '140px'
              }}
            >
              {editingExpense ? 'Update' : 'Add Expense'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Hidden receipt ref for PDF export */}
      <div ref={receiptRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div style={{ padding: '20px', background: 'white', width: '800px' }}>
          <h2>Expenses Report</h2>
          <p>Generated on: {dayjs().format('DD/MM/YYYY HH:mm')}</p>
          <Table 
            dataSource={filteredExpenses} 
            columns={columns} 
            pagination={false} 
            size="small"
          />
        </div>
      </div>
    </Layout>
  );
};

export default ExpenseManagement;