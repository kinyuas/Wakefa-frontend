// src/pages/Admin/CashierManagement.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  message,
  Space,
  Typography,
  Card,
  Alert,
  Tabs,
  Row,
  Col,
  Statistic,
  Tag,
  Progress,
  DatePicker,
  Select,
  Tooltip,
  Spin,
  Empty,
  Badge,
  Divider,
  List,
  Avatar,
  InputNumber,
  Descriptions,
  Rate
} from 'antd';
import { 
  UserAddOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  BarChartOutlined,
  TeamOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  CalculatorOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  ReloadOutlined,
  FilterOutlined,
  PhoneOutlined,
  MailOutlined,
  ShopOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StarOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { CalculationUtils } from '../../utils/calculationUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Color Scheme
const COLOR_SCHEME = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#fa8c16',
  error: '#f5222d',
  info: '#13c2c2',
  purple: '#722ed1',
  gold: '#faad14',
  
  gradients: {
    primary: 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)',
    success: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
    warning: 'linear-gradient(135deg, #fa8c16 0%, #ffa940 100%)',
    premium: 'linear-gradient(135deg, #faad14 0%, #fadb14 100%)'
  },
  
  background: {
    light: '#f8f9fa',
    card: '#ffffff'
  }
};

// Format currency helper
const formatCurrency = (amount) => {
  return CalculationUtils.formatCurrency(amount);
};

// API Configuration
const createApiInstance = () => {
  const instance = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5002',
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        return Promise.reject(new Error('Cannot connect to server. Please check if the backend is running.'));
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Simplified Cashier Analytics Component
const SimplifiedCashierAnalytics = ({ cashier, transactions, loading }) => {
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);
  const [timeRange, setTimeRange] = useState('30d');

  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    const now = dayjs();
    let startDate;

    switch (value) {
      case 'today':
        startDate = now.startOf('day');
        break;
      case '7d':
        startDate = now.subtract(7, 'days');
        break;
      case '30d':
        startDate = now.subtract(30, 'days');
        break;
      case '90d':
        startDate = now.subtract(90, 'days');
        break;
      default:
        startDate = now.subtract(30, 'days');
    }

    setDateRange([startDate, now]);
  };

  // Calculate cashier stats
  const cashierStats = useMemo(() => {
    if (!cashier || !Array.isArray(transactions)) {
      return getDefaultCashierStats();
    }

    // Filter transactions by date range
    const filteredTransactions = transactions.filter(t => {
      if (!dateRange || dateRange.length !== 2) return true;
      
      const transactionDate = dayjs(t.saleDate || t.createdAt);
      const startDate = dateRange[0];
      const endDate = dateRange[1];
      
      return transactionDate.isAfter(startDate.subtract(1, 'day')) && 
             transactionDate.isBefore(endDate.add(1, 'day'));
    });

    if (filteredTransactions.length === 0) {
      return getDefaultCashierStats();
    }

    // Calculate basic metrics
    const totalRevenue = filteredTransactions.reduce((sum, t) => 
      sum + CalculationUtils.safeNumber(t.totalAmount), 0);
    
    const totalCost = filteredTransactions.reduce((sum, t) => 
      sum + CalculationUtils.safeNumber(t.cost || 0), 0);
    
    const totalProfit = totalRevenue - totalCost;
    const totalTransactions = filteredTransactions.length;
    const totalItemsSold = filteredTransactions.reduce((sum, t) => 
      sum + CalculationUtils.safeNumber(t.itemsCount || 0), 0);
    
    const profitMargin = CalculationUtils.calculateProfitMargin(totalRevenue, totalProfit);

    // Payment method breakdown
    const paymentMethods = {
      cash: 0,
      mpesa: 0,
      bank: 0,
      card: 0
    };

    filteredTransactions.forEach(t => {
      const amount = CalculationUtils.safeNumber(t.totalAmount);
      if (t.paymentMethod === 'cash') paymentMethods.cash += amount;
      else if (t.paymentMethod === 'mpesa') paymentMethods.mpesa += amount;
      else if (t.paymentMethod === 'bank') paymentMethods.bank += amount;
      else if (t.paymentMethod === 'card') paymentMethods.card += amount;
    });

    // Performance score
    const calculatePerformanceScore = () => {
      let score = 0;
      
      // Revenue contribution (40%)
      score += Math.min(40, (totalRevenue / 10000) * 40);
      
      // Transaction efficiency (30%)
      score += Math.min(30, (totalTransactions / 50) * 30);
      
      // Profitability (30%)
      score += Math.min(30, (Math.max(0, profitMargin) / 50) * 30);
      
      return Math.min(100, Math.round(score));
    };

    const performanceScore = calculatePerformanceScore();

    // Daily performance
    const dailyPerformance = {};
    filteredTransactions.forEach(t => {
      const date = dayjs(t.saleDate || t.createdAt).format('YYYY-MM-DD');
      if (!dailyPerformance[date]) {
        dailyPerformance[date] = {
          date,
          revenue: 0,
          transactions: 0,
          profit: 0
        };
      }
      dailyPerformance[date].revenue += CalculationUtils.safeNumber(t.totalAmount);
      dailyPerformance[date].transactions += 1;
      dailyPerformance[date].profit += CalculationUtils.safeNumber(t.profit || 0);
    });

    // Top products
    const productSales = {};
    filteredTransactions.forEach(t => {
      t.items?.forEach(item => {
        const productName = item.productName || 'Unknown Product';
        if (!productSales[productName]) {
          productSales[productName] = {
            name: productName,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[productName].quantity += CalculationUtils.safeNumber(item.quantity || 1);
        productSales[productName].revenue += CalculationUtils.safeNumber(item.totalPrice || 0);
      });
    });

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalTransactions,
      totalItemsSold,
      profitMargin,
      performanceScore,
      paymentMethods,
      dailyPerformance: Object.values(dailyPerformance).sort((a, b) => 
        dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
      ),
      topProducts: Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
    };
  }, [cashier, transactions, dateRange]);

  if (!cashier) {
    return (
      <Card style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Empty description="Select a cashier to view analytics" />
      </Card>
    );
  }

  return (
    <div style={{ backgroundColor: COLOR_SCHEME.background.light, padding: '16px' }}>
      {/* Header */}
      <Card
        style={{
          borderRadius: '12px',
          marginBottom: '24px',
          background: COLOR_SCHEME.gradients.primary,
          color: 'white'
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={16}>
            <Space align="center">
              <Avatar 
                size={64} 
                style={{ 
                  backgroundColor: 'white',
                  color: COLOR_SCHEME.primary,
                  fontSize: '24px',
                  fontWeight: 'bold',
                  border: '3px solid rgba(255,255,255,0.3)'
                }}
              >
                {cashier.name?.charAt(0)?.toUpperCase()}
              </Avatar>
              <div>
                <Title level={3} style={{ margin: 0, color: 'white' }}>{cashier.name}</Title>
                <Space wrap>
                  <Tag color="white" style={{ color: COLOR_SCHEME.primary, borderRadius: '12px' }}>
                    <MailOutlined /> {cashier.email}
                  </Tag>
                  {cashier.phone && (
                    <Tag color="white" style={{ color: COLOR_SCHEME.primary, borderRadius: '12px' }}>
                      <PhoneOutlined /> {cashier.phone}
                    </Tag>
                  )}
                </Space>
                <div style={{ marginTop: '8px' }}>
                  <Tag 
                    color={cashier.status === 'active' ? 'green' : 'red'} 
                    style={{ borderRadius: '12px', fontWeight: 'bold' }}
                  >
                    {cashier.status?.toUpperCase()}
                  </Tag>
                  {cashier.shopName && (
                    <Tag color="blue" style={{ borderRadius: '12px', fontWeight: 'bold' }}>
                      <ShopOutlined /> {cashier.shopName}
                    </Tag>
                  )}
                </div>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" style={{ width: '100%', textAlign: 'right' }}>
              <Text strong style={{ color: 'white' }}>Analysis Period:</Text>
              <Select 
                value={timeRange} 
                onChange={handleTimeRangeChange}
                style={{ width: '100%', borderRadius: '8px' }}
                size="middle"
              >
                <Option value="today">Today</Option>
                <Option value="7d">Last 7 Days</Option>
                <Option value="30d">Last 30 Days</Option>
                <Option value="90d">Last 90 Days</Option>
                <Option value="custom">Custom Range</Option>
              </Select>
              {timeRange === 'custom' && (
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  style={{ width: '100%', borderRadius: '8px' }}
                  size="middle"
                />
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card 
            style={{ 
              borderRadius: '12px',
              borderLeft: `6px solid ${COLOR_SCHEME.primary}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <Statistic
              title={<Text strong style={{ color: COLOR_SCHEME.primary }}>Total Revenue</Text>}
              value={cashierStats.totalRevenue}
              formatter={(value) => (
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {formatCurrency(value)}
                </span>
              )}
              prefix={<DollarOutlined style={{ color: COLOR_SCHEME.primary }} />}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <ShoppingCartOutlined /> {cashierStats.totalTransactions} transactions
              </Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card 
            style={{ 
              borderRadius: '12px',
              borderLeft: `6px solid ${COLOR_SCHEME.success}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <Statistic
              title={<Text strong style={{ color: COLOR_SCHEME.success }}>Total Profit</Text>}
              value={cashierStats.totalProfit}
              formatter={(value) => (
                <span style={{ 
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: cashierStats.totalProfit >= 0 ? COLOR_SCHEME.success : COLOR_SCHEME.error
                }}>
                  {formatCurrency(value)}
                </span>
              )}
              prefix={cashierStats.totalProfit >= 0 ? <RiseOutlined /> : <FallOutlined />}
            />
            <Progress 
              percent={Math.min(100, Math.max(0, cashierStats.profitMargin))}
              size="small"
              strokeColor={cashierStats.profitMargin >= 0 ? COLOR_SCHEME.success : COLOR_SCHEME.error}
              format={percent => `${(percent || 0).toFixed(1)}% Margin`}
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card 
            style={{ 
              borderRadius: '12px',
              borderLeft: `6px solid ${COLOR_SCHEME.gold}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <Statistic
              title={<Text strong style={{ color: COLOR_SCHEME.gold }}>Items Sold</Text>}
              value={cashierStats.totalItemsSold}
              formatter={(value) => (
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {value.toLocaleString()}
                </span>
              )}
              prefix={<ShoppingCartOutlined style={{ color: COLOR_SCHEME.gold }} />}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Avg: {cashierStats.totalTransactions > 0 ? 
                  Math.round(cashierStats.totalItemsSold / cashierStats.totalTransactions) : 0} items/transaction
              </Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card 
            style={{ 
              borderRadius: '12px',
              borderLeft: `6px solid ${COLOR_SCHEME.purple}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <Statistic
              title={<Text strong style={{ color: COLOR_SCHEME.purple }}>Performance Score</Text>}
              value={cashierStats.performanceScore}
              suffix="/100"
              formatter={(value) => (
                <span style={{ 
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: cashierStats.performanceScore >= 80 ? COLOR_SCHEME.success :
                         cashierStats.performanceScore >= 60 ? COLOR_SCHEME.gold :
                         COLOR_SCHEME.error
                }}>
                  {value}
                </span>
              )}
              prefix={<TrophyOutlined style={{ 
                color: cashierStats.performanceScore >= 80 ? COLOR_SCHEME.success :
                       cashierStats.performanceScore >= 60 ? COLOR_SCHEME.gold :
                       COLOR_SCHEME.error
              }} />}
            />
            <Rate 
              disabled 
              value={Math.ceil(cashierStats.performanceScore / 20)} 
              character={<StarOutlined />}
              style={{ fontSize: '16px', marginTop: '8px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Payment Method Breakdown */}
      <Card
        title={
          <Space>
            <DollarOutlined />
            <Text strong>Payment Method Breakdown</Text>
          </Space>
        }
        style={{ 
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Title level={4} style={{ color: COLOR_SCHEME.success, margin: 0 }}>
                {formatCurrency(cashierStats.paymentMethods?.cash || 0)}
              </Title>
              <Text type="secondary">Cash</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Title level={4} style={{ color: COLOR_SCHEME.primary, margin: 0 }}>
                {formatCurrency(cashierStats.paymentMethods?.mpesa || 0)}
              </Title>
              <Text type="secondary">M-Pesa</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Title level={4} style={{ color: COLOR_SCHEME.info, margin: 0 }}>
                {formatCurrency(cashierStats.paymentMethods?.bank || 0)}
              </Title>
              <Text type="secondary">Bank</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Title level={4} style={{ color: COLOR_SCHEME.purple, margin: 0 }}>
                {formatCurrency(cashierStats.paymentMethods?.card || 0)}
              </Title>
              <Text type="secondary">Card</Text>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Recent Transactions */}
      <Card
        title={
          <Space>
            <ShoppingCartOutlined />
            <Text strong>Recent Transactions</Text>
            <Badge count={transactions?.length || 0} />
          </Space>
        }
        style={{ 
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}
      >
        {transactions && transactions.length > 0 ? (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {transactions.slice(0, 10).map((transaction, index) => (
              <Card
                key={transaction._id}
                size="small"
                style={{ 
                  marginBottom: '8px',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${
                    transaction.profit >= 0 ? COLOR_SCHEME.success : COLOR_SCHEME.error
                  }`
                }}
              >
                <Row gutter={16} align="middle">
                  <Col xs={24} sm={8}>
                    <Text strong ellipsis>
                      {transaction.transactionNumber}
                    </Text>
                    <div>
                      <Tag color="blue" style={{ margin: '4px 0' }}>
                        {dayjs(transaction.saleDate || transaction.createdAt).format('DD MMM')}
                      </Tag>
                      <Tag color="orange" style={{ marginLeft: '4px' }}>
                        {transaction.paymentMethod?.toUpperCase() || 'CASH'}
                      </Tag>
                    </div>
                  </Col>
                  <Col xs={24} sm={16}>
                    <Row gutter={[8, 8]}>
                      <Col xs={12} sm={6}>
                        <div style={{ textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: '11px' }}>Amount</Text>
                          <br />
                          <Text strong style={{ color: COLOR_SCHEME.primary, fontSize: '14px' }}>
                            {formatCurrency(transaction.totalAmount)}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: '11px' }}>Profit</Text>
                          <br />
                          <Text strong style={{ 
                            color: transaction.profit >= 0 ? COLOR_SCHEME.success : COLOR_SCHEME.error,
                            fontSize: '14px'
                          }}>
                            {formatCurrency(transaction.profit || 0)}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: '11px' }}>Items</Text>
                          <br />
                          <Text strong style={{ fontSize: '14px' }}>
                            {transaction.itemsCount || 0}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: '11px' }}>Time</Text>
                          <br />
                          <Text style={{ fontSize: '12px' }}>
                            {dayjs(transaction.saleDate || transaction.createdAt).format('HH:mm')}
                          </Text>
                        </div>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        ) : (
          <Empty description="No recent transactions" />
        )}
      </Card>
    </div>
  );
};

const getDefaultCashierStats = () => ({
  totalRevenue: 0,
  totalCost: 0,
  totalProfit: 0,
  totalTransactions: 0,
  totalItemsSold: 0,
  profitMargin: 0,
  performanceScore: 0,
  paymentMethods: {
    cash: 0,
    mpesa: 0,
    bank: 0,
    card: 0
  },
  dailyPerformance: [],
  topProducts: []
});

// Main Cashier Management Component
const CashierManagement = () => {
  const [cashiers, setCashiers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingCashier, setEditingCashier] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const [loading, setLoading] = useState({
    table: false,
    form: false,
    analytics: false
  });
  const [activeTab, setActiveTab] = useState('cashiers');
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  
  const [form] = Form.useForm();
  const cashiersCache = useRef({
    data: [],
    lastFetch: null
  });

  // Fetch cashiers
  const fetchCashiers = useCallback(async (forceRefresh = false) => {
    try {
      const cacheValid = cashiersCache.current.lastFetch && 
                       (Date.now() - cashiersCache.current.lastFetch < 30000);
      
      if (cacheValid && !forceRefresh) {
        setCashiers(cashiersCache.current.data);
        return;
      }

      setLoading(prev => ({ ...prev, table: true }));
      setConnectionError(false);
      
      const api = createApiInstance();
      const response = await api.get('/api/cashiers');
      
      let cashiersData = [];
      if (response.data && Array.isArray(response.data.data)) {
        cashiersData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        cashiersData = response.data;
      } else if (Array.isArray(response.data)) {
        cashiersData = response.data;
      }
      
      cashiersCache.current = {
        data: cashiersData,
        lastFetch: Date.now()
      };
      
      setCashiers(cashiersData);
    } catch (error) {
      console.error('Fetch cashiers error:', error);
      
      if (cashiersCache.current.data.length > 0) {
        setCashiers(cashiersCache.current.data);
        message.warning('Using cached data - could not refresh from server');
      } else {
        handleApiError(error, 'Failed to fetch cashiers');
      }
    } finally {
      setLoading(prev => ({ ...prev, table: false }));
    }
  }, []);

  // Fetch cashier data for analytics
  const fetchCashierData = useCallback(async (cashierId) => {
    if (!cashierId) return;
    
    try {
      setLoading(prev => ({ ...prev, analytics: true }));
      
      const api = createApiInstance();
      const params = {
        cashierId,
        startDate: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
        endDate: dayjs().format('YYYY-MM-DD')
      };
      
      // Fetch transactions data
      const transactionsResponse = await api.get('/api/transactions/combined', { params });
      const transactionsData = transactionsResponse.data?.data?.salesWithProfit || [];
      
      // Filter transactions for this cashier
      const cashierTransactions = transactionsData.filter(t => 
        t.cashierId === cashierId || 
        t.cashierName?.toLowerCase().includes(cashiers.find(c => c._id === cashierId)?.name?.toLowerCase() || '')
      );
      
      setTransactions(cashierTransactions);
      
    } catch (error) {
      console.error('Error fetching cashier data:', error);
      message.warning('Could not load analytics data');
    } finally {
      setLoading(prev => ({ ...prev, analytics: false }));
    }
  }, [cashiers]);

  useEffect(() => {
    fetchCashiers();
  }, [fetchCashiers]);

  // Fetch analytics data when tab changes
  useEffect(() => {
    if (activeTab === 'performance' && selectedCashier) {
      fetchCashierData(selectedCashier._id);
    }
  }, [activeTab, selectedCashier, fetchCashierData]);

  const handleApiError = (error, defaultMessage) => {
    let errorMessage = defaultMessage;
    
    if (error.response) {
      errorMessage = error.response.data?.message || 
                   `Server error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'No response from server. Please check your connection.';
      setConnectionError(true);
    } else {
      errorMessage = error.message;
    }
    
    message.error(errorMessage);
  };

  const handleAddCashier = () => {
    if (connectionError) {
      message.error('Cannot connect to server. Please check if the backend is running.');
      return;
    }
    
    form.resetFields();
    setEditingCashier(null);
    setIsModalVisible(true);
  };

  const handleEditCashier = (cashier) => {
    form.setFieldsValue({
      name: cashier.name,
      email: cashier.email,
      phone: cashier.phone
    });
    setEditingCashier(cashier);
    setIsModalVisible(true);
  };

  const handleViewCashier = (cashier) => {
    setEditingCashier(cashier);
    setIsViewModalVisible(true);
  };

  const handleViewAnalytics = (cashier) => {
    setSelectedCashier(cashier);
    setActiveTab('performance');
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(prev => ({ ...prev, form: true }));
      
      const processedValues = {
        name: values.name.trim(),
        email: values.email.toLowerCase().trim(),
        phone: values.phone,
        ...(editingCashier ? {} : { password: values.password })
      };

      const api = createApiInstance();
      
      if (editingCashier) {
        const response = await api.put(`/api/cashiers/${editingCashier._id}`, processedValues);      
        if (response.data.success) {
          message.success('Cashier updated successfully');
          setIsModalVisible(false);
          fetchCashiers(true);
        } else {
          message.error(response.data.message || 'Failed to update cashier');
        }
      } else {
        const response = await api.post('/api/cashiers', processedValues);
        
        if (response.data.success) {
          message.success('Cashier added successfully');
          setIsModalVisible(false);
          fetchCashiers(true);
        } else {
          message.error(response.data.message || 'Failed to add cashier');
        }
      }
    } catch (error) {
      handleApiError(error, editingCashier ? 'Failed to update cashier' : 'Failed to add cashier');
    } finally {
      setLoading(prev => ({ ...prev, form: false }));
    }
  };

  const handleDeleteCashier = async (id) => {
    Modal.confirm({
      title: 'Delete Cashier',
      content: 'Are you sure you want to delete this cashier? This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      icon: <DeleteOutlined style={{ color: COLOR_SCHEME.error }} />,
      onOk: async () => {
        try {
          setLoading(prev => ({ ...prev, table: true }));
          const api = createApiInstance();
          await api.delete(`/api/cashiers/${id}`);
          message.success('Cashier deleted successfully');
          fetchCashiers(true);
        } catch (error) {
          handleApiError(error, 'Failed to delete cashier');
        } finally {
          setLoading(prev => ({ ...prev, table: false }));
        }
      }
    });
  };

  const retryConnection = () => {
    setConnectionError(false);
    fetchCashiers(true);
    if (activeTab === 'performance' && selectedCashier) {
      fetchCashierData(selectedCashier._id);
    }
  };

  // Filter cashiers
  const filteredCashiers = useMemo(() => {
    return cashiers.filter(cashier => {
      const matchesSearch = !searchText || 
        cashier.name.toLowerCase().includes(searchText.toLowerCase()) ||
        cashier.email.toLowerCase().includes(searchText.toLowerCase()) ||
        (cashier.phone && cashier.phone.includes(searchText));
      
      const matchesStatus = statusFilter === 'all' || cashier.status === statusFilter;
      
      const matchesShop = shopFilter === 'all' || cashier.shopName === shopFilter;
      
      return matchesSearch && matchesStatus && matchesShop;
    });
  }, [cashiers, searchText, statusFilter, shopFilter]);

  // Table columns
  const columns = [
    { 
      title: 'Cashier', 
      dataIndex: 'name', 
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, record) => (
        <Space align="center">
          <Avatar 
            size={36} 
            style={{ 
              backgroundColor: record.status === 'active' ? COLOR_SCHEME.primary : COLOR_SCHEME.error,
              fontWeight: 'bold'
            }}
          >
            {name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: '14px' }}>{name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
          </div>
        </Space>
      )
    },
    { 
      title: 'Contact', 
      dataIndex: 'phone', 
      key: 'phone',
      render: (phone) => (
        <Space>
          <PhoneOutlined style={{ color: COLOR_SCHEME.primary }} />
          <Text>{phone || 'N/A'}</Text>
        </Space>
      )
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => (
        <Tag 
          color={status === 'active' ? COLOR_SCHEME.success : COLOR_SCHEME.error}
          style={{ 
            borderRadius: '12px',
            fontWeight: 'bold',
            padding: '2px 12px'
          }}
        >
          {status === 'active' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
          {' '}{status?.toUpperCase()}
        </Tag>
      )
    },
    { 
      title: 'Shop', 
      dataIndex: 'shopName', 
      key: 'shopName',
      render: (shopName) => (
        <Tag 
          color="blue" 
          style={{ 
            borderRadius: '12px',
            padding: '2px 12px'
          }}
        >
          <ShopOutlined /> {shopName || 'Not Assigned'}
        </Tag>
      )
    },
    { 
      title: 'Last Login', 
      dataIndex: 'lastLogin', 
      key: 'lastLogin',
      render: (date) => (
        <div>
          <Text>{date ? dayjs(date).format('DD/MM/YYYY') : 'Never'}</Text>
          <br />
          {date && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {dayjs(date).format('HH:mm')}
            </Text>
          )}
        </div>
      ),
      sorter: (a, b) => new Date(a.lastLogin || 0) - new Date(b.lastLogin || 0)
    },
    { 
      title: 'Actions', 
      key: 'actions',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="View Analytics">
            <Button 
              type="primary" 
              size="small"
              icon={<BarChartOutlined />}
              onClick={() => handleViewAnalytics(record)}
              disabled={loading.table || connectionError}
              style={{ 
                backgroundColor: COLOR_SCHEME.gradients.primary,
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold'
              }}
            >
              Analytics
            </Button>
          </Tooltip>
          <Tooltip title="View Details">
            <Button 
              type="default" 
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewCashier(record)}
              disabled={loading.table || connectionError}
              style={{ borderRadius: '6px' }}
            >
              View
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              type="default" 
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditCashier(record)}
              disabled={loading.table || connectionError}
              style={{ borderRadius: '6px' }}
            >
              Edit
            </Button>
          </Tooltip>
          <Tooltip title="Delete">
            <Button 
              type="primary" 
              danger
              size="small"
              icon={<DeleteOutlined />} 
              onClick={() => handleDeleteCashier(record._id)}
              disabled={loading.table || connectionError}
              style={{ borderRadius: '6px' }}
            >
              Delete
            </Button>
          </Tooltip>
        </Space>
      )
    },
  ];

  return (
    <div className="management-content" style={{ 
      backgroundColor: COLOR_SCHEME.background.light,
      minHeight: '100vh',
      padding: '16px'
    }}>
      {/* Header */}
      <Card
        style={{
          marginBottom: '24px',
          borderRadius: '12px',
          background: COLOR_SCHEME.gradients.primary,
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space>
              <TeamOutlined style={{ fontSize: '32px' }} />
              <div>
                <Title level={2} style={{ margin: 0, color: 'white' }}>Cashier Management</Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Manage and monitor all cashier accounts and performance
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Space style={{ float: 'right', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Button 
                type="default" 
                icon={<ReloadOutlined />}
                onClick={() => fetchCashiers(true)}
                loading={loading.table}
                style={{ 
                  backgroundColor: 'white',
                  color: COLOR_SCHEME.primary,
                  fontWeight: 'bold',
                  borderRadius: '8px'
                }}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                icon={<UserAddOutlined />} 
                onClick={handleAddCashier}
                loading={loading.table}
                disabled={connectionError}
                style={{ 
                  backgroundColor: 'white',
                  color: COLOR_SCHEME.primary,
                  fontWeight: 'bold',
                  borderRadius: '8px'
                }}
              >
                Add Cashier
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
      
      {connectionError && (
        <Alert
          message="Connection Error"
          description="Cannot connect to the server. Please check if the backend is running."
          type="error"
          showIcon
          closable
          onClose={() => setConnectionError(false)}
          style={{ 
            marginBottom: '16px',
            borderRadius: '8px'
          }}
          action={
            <Button 
              size="small" 
              type="primary" 
              onClick={retryConnection}
              style={{ borderRadius: '6px' }}
            >
              Retry Connection
            </Button>
          }
        />
      )}
      
      {/* Tabs */}
      <Card
        style={{
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          type="card"
          style={{ padding: '16px' }}
        >
          <TabPane 
            tab={
              <Space>
                <TeamOutlined style={{ color: COLOR_SCHEME.primary }} />
                <Text strong>Cashier List</Text>
                <Badge 
                  count={cashiers.length} 
                  style={{ backgroundColor: COLOR_SCHEME.primary, fontWeight: 'bold' }} 
                />
              </Space>
            } 
            key="cashiers"
          >
            {/* Filters */}
            <Card
              style={{
                marginBottom: '16px',
                borderRadius: '8px',
                backgroundColor: '#fafafa'
              }}
            >
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={12} md={6}>
                  <Input
                    placeholder="Search by name, email, or phone..."
                    prefix={<UserOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    size="middle"
                    style={{ borderRadius: '8px' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <Select
                    placeholder="Status"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    style={{ width: '100%', borderRadius: '8px' }}
                    size="middle"
                  >
                    <Option value="all">All Status</Option>
                    <Option value="active">Active</Option>
                    <Option value="inactive">Inactive</Option>
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Select
                    placeholder="Shop"
                    value={shopFilter}
                    onChange={setShopFilter}
                    style={{ width: '100%', borderRadius: '8px' }}
                    size="middle"
                  >
                    <Option value="all">All Shops</Option>
                    {[...new Set(cashiers.map(c => c.shopName).filter(Boolean))].map(shop => (
                      <Option key={shop} value={shop}>{shop}</Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    Showing: {filteredCashiers.length} cashiers
                  </Text>
                </Col>
              </Row>
            </Card>

            {/* Table */}
            <Card style={{ borderRadius: '8px', overflow: 'hidden' }}>
              <Table 
                columns={columns} 
                dataSource={filteredCashiers} 
                rowKey="_id"
                pagination={{ 
                  pageSize: 10, 
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `Total ${total} cashiers`
                }}
                bordered={false}
                loading={loading.table}
                scroll={{ x: true }}
                locale={{
                  emptyText: connectionError ? 'Cannot connect to server' : 'No cashiers found'
                }}
              />
            </Card>
          </TabPane>

          <TabPane 
            tab={
              <Space>
                <BarChartOutlined style={{ color: COLOR_SCHEME.success }} />
                <Text strong>Performance Analytics</Text>
                {selectedCashier && (
                  <Tag color="blue" style={{ marginLeft: 8, borderRadius: '12px', fontWeight: 'bold' }}>
                    {selectedCashier.name}
                  </Tag>
                )}
              </Space>
            } 
            key="performance"
          >
            <Spin spinning={loading.analytics} size="large">
              {selectedCashier ? (
                <SimplifiedCashierAnalytics 
                  cashier={selectedCashier}
                  transactions={transactions}
                  loading={loading.analytics}
                />
              ) : (
                <Card style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '12px' }}>
                  <Empty 
                    description={
                      <div>
                        <Title level={4} style={{ color: COLOR_SCHEME.primary }}>
                          No Cashier Selected
                        </Title>
                        <Text type="secondary">
                          Please select a cashier from the list to view their performance analytics
                        </Text>
                      </div>
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    <Button 
                      type="primary" 
                      onClick={() => setActiveTab('cashiers')}
                      size="large"
                      style={{ borderRadius: '8px', fontWeight: 'bold', padding: '0 32px' }}
                    >
                      Select Cashier
                    </Button>
                  </Empty>
                </Card>
              )}
            </Spin>
          </TabPane>
        </Tabs>
      </Card>

      {/* Add/Edit Cashier Modal */}
      <Modal
        title={
          <Space>
            {editingCashier ? (
              <>
                <EditOutlined style={{ color: COLOR_SCHEME.primary }} />
                <Text strong style={{ color: COLOR_SCHEME.primary }}>Edit Cashier</Text>
              </>
            ) : (
              <>
                <UserAddOutlined style={{ color: COLOR_SCHEME.success }} />
                <Text strong style={{ color: COLOR_SCHEME.success }}>Add New Cashier</Text>
              </>
            )}
          </Space>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
        width={600}
        style={{ borderRadius: '12px' }}
      >
        <Form 
          form={form}
          onFinish={handleSubmit} 
          layout="vertical"
          style={{ padding: '8px' }}
        >
          <Form.Item 
            name="name" 
            label={<Text strong>Full Name</Text>}
            rules={[
              { required: true, message: 'Please input cashier name' },
              { min: 2, message: 'Minimum 2 characters' },
              { max: 50, message: 'Maximum 50 characters' }
            ]}
          >
            <Input 
              placeholder="Enter cashier name" 
              disabled={loading.form}
              size="large"
              prefix={<UserOutlined />}
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>
          
          <Form.Item 
            name="email" 
            label={<Text strong>Email Address</Text>}
            rules={[
              { required: true, message: 'Please input email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input 
              placeholder="Enter email" 
              disabled={loading.form || !!editingCashier}
              size="large"
              prefix={<MailOutlined />}
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>
          
          <Form.Item 
            name="phone" 
            label={<Text strong>Phone Number</Text>}
            rules={[
              { required: true, message: 'Please input phone number' },
              { pattern: /^[0-9+\-\s()]{10,}$/, message: 'Please enter a valid phone number' }
            ]}
          >
            <Input 
              placeholder="Enter phone number" 
              disabled={loading.form}
              size="large"
              prefix={<PhoneOutlined />}
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>
          
          {!editingCashier && (
            <Form.Item 
              name="password" 
              label={<Text strong>Password</Text>}
              rules={[
                { required: true, message: 'Please input password' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
            >
              <Input.Password 
                placeholder="Enter password" 
                disabled={loading.form}
                size="large"
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          )}
          
          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Button 
              onClick={() => setIsModalVisible(false)} 
              style={{ marginRight: 12, borderRadius: '8px', padding: '0 24px' }}
              disabled={loading.form}
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={loading.form}
              style={{ borderRadius: '8px', padding: '0 32px', fontWeight: 'bold' }}
            >
              {editingCashier ? 'Update Cashier' : 'Add Cashier'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* View Cashier Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: COLOR_SCHEME.primary }} />
            <Text strong style={{ color: COLOR_SCHEME.primary }}>Cashier Details</Text>
          </Space>
        }
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button 
            key="close" 
            onClick={() => setIsViewModalVisible(false)}
            style={{ borderRadius: '8px' }}
          >
            Close
          </Button>
        ]}
        width={500}
        style={{ borderRadius: '12px' }}
      >
        {editingCashier && (
          <div style={{ padding: '8px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Avatar 
                  size={80} 
                  style={{ 
                    backgroundColor: COLOR_SCHEME.primary,
                    color: 'white',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    marginBottom: 16,
                    border: '4px solid #f0f7ff'
                  }}
                >
                  {editingCashier.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Title level={3} style={{ margin: '8px 0' }}>{editingCashier.name}</Title>
                <Text type="secondary" style={{ fontSize: '14px' }}>{editingCashier.email}</Text>
              </div>
              
              <Divider style={{ margin: '8px 0' }} />
              
              <Descriptions column={1} size="middle" style={{ marginTop: 16 }}>
                <Descriptions.Item label={<Text strong>Phone Number</Text>}>
                  <Space>
                    <PhoneOutlined style={{ color: COLOR_SCHEME.primary }} />
                    <Text>{editingCashier.phone || 'Not provided'}</Text>
                  </Space>
                </Descriptions.Item>
                
                <Descriptions.Item label={<Text strong>Status</Text>}>
                  <Tag 
                    color={editingCashier.status === 'active' ? COLOR_SCHEME.success : COLOR_SCHEME.error}
                    style={{ borderRadius: '12px', fontWeight: 'bold', padding: '2px 12px' }}
                  >
                    {editingCashier.status?.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                
                <Descriptions.Item label={<Text strong>Assigned Shop</Text>}>
                  <Space>
                    <ShopOutlined style={{ color: COLOR_SCHEME.blue }} />
                    <Text>{editingCashier.shopName || 'Not assigned'}</Text>
                  </Space>
                </Descriptions.Item>
                
                {editingCashier.lastLogin && (
                  <Descriptions.Item label={<Text strong>Last Login</Text>}>
                    <Space>
                      <ClockCircleOutlined style={{ color: COLOR_SCHEME.gold }} />
                      <Text>{new Date(editingCashier.lastLogin).toLocaleString()}</Text>
                    </Space>
                  </Descriptions.Item>
                )}
                
                <Descriptions.Item label={<Text strong>Member Since</Text>}>
                  <Space>
                    <CalendarOutlined style={{ color: COLOR_SCHEME.success }} />
                    <Text>{new Date(editingCashier.createdAt).toLocaleDateString()}</Text>
                  </Space>
                </Descriptions.Item>
              </Descriptions>
              
              {editingCashier.shopName && (
                <div style={{ 
                  marginTop: 16, 
                  padding: 16, 
                  backgroundColor: '#f0f7ff',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <Text strong style={{ color: COLOR_SCHEME.primary }}>
                    Currently assigned to {editingCashier.shopName}
                  </Text>
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CashierManagement;