// src/pages/Admin/ShopManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  message, 
  Card, 
  Spin, 
  Form, 
  Input, 
  Space,
  Tag,
  Statistic,
  Row,
  Col,
  Tabs,
  Select,
  DatePicker,
  List,
  Divider,
  Tooltip,
  Badge,
  Progress,
  Alert,
  Typography,
  Grid,
  theme
} from 'antd';
import { 
  ShopOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  BarChartOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  WarningOutlined,
  MoneyCollectOutlined,
  CalculatorOutlined,
  RiseOutlined,
  FallOutlined,
  EnvironmentOutlined,
  TrophyOutlined,
  ArrowUpOutlined,
  PercentageOutlined,
  BarcodeOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { shopAPI, unifiedAPI, productAPI } from '../../services/api';
import { CalculationUtils } from '../../utils/calculationUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;
const { useToken } = theme;

// Transaction Item Component
const TransactionItem = ({ transaction, screens, colors }) => {
  return (
    <List.Item 
      style={{ 
        marginBottom: '12px', 
        padding: '16px',
        borderRadius: '10px',
        backgroundColor: '#fff',
        border: `1px solid #d9f7be`,
      }}
    >
      <div style={{ width: '100%' }}>
        <Row justify="space-between" align="middle" gutter={[8, 8]}>
          <Col xs={24} sm={16}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <BarcodeOutlined style={{ color: colors.primary, marginRight: 8, fontSize: '14px' }} />
              <Text strong style={{ 
                fontSize: screens.xs ? '14px' : '15px',
                color: '#262626'
              }}>
                {transaction.items?.length || 0} items sold
              </Text>
              {transaction.paymentMethod === 'credit' && (
                <Tag 
                  color="orange" 
                  style={{ 
                    marginLeft: 8,
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontWeight: '500',
                    fontSize: '10px',
                  }}
                >
                  {transaction.paymentMethod?.toUpperCase()}
                </Tag>
              )}
            </div>
            <div style={{ 
              fontSize: screens.xs ? '11px' : '12px', 
              color: '#666', 
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center'
            }}>
              <CalendarOutlined style={{ marginRight: 4, fontSize: '11px' }} />
              {dayjs(transaction.saleDate || transaction.transactionDate).format('MMM D, YYYY h:mm A')}
            </div>
            {transaction.items && (
              <div style={{ 
                fontSize: screens.xs ? '11px' : '12px', 
                color: '#888', 
                lineHeight: '1.4',
                backgroundColor: '#fafafa',
                padding: '6px 10px',
                borderRadius: '6px',
                marginTop: '6px'
              }}>
                Items: {transaction.items.slice(0, 2).map(item => `${item.productName || item.name} (${item.quantity})`).join(', ')}
                {transaction.items.length > 2 && (
                  <span style={{ color: colors.primary, fontWeight: '500', marginLeft: 4 }}>
                    +{transaction.items.length - 2} more
                  </span>
                )}
              </div>
            )}
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ textAlign: screens.xs ? 'left' : 'right' }}>
              <div style={{ 
                fontSize: screens.xs ? '18px' : '20px', 
                fontWeight: 'bold',
                color: colors.success,
              }}>
                KES {transaction.totalAmount?.toLocaleString('en-KE', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
              <div style={{ 
                fontSize: screens.xs ? '10px' : '11px', 
                color: '#999', 
                marginTop: 4,
                fontWeight: '500'
              }}>
                {transaction.paymentMethod?.toUpperCase() || 'CASH'} Sale
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </List.Item>
  );
};

// Shop Management Main Component
const ShopManagement = () => {
  const [shops, setShops] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [viewingShop, setViewingShop] = useState(null);
  const [shopPerformance, setShopPerformance] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('daily');
  const [customDateRange, setCustomDateRange] = useState(null);
  const [form] = Form.useForm();
  
  const screens = useBreakpoint();
  const { token } = useToken();

  const colors = {
    primary: '#1890ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    purple: '#722ed1',
    cyan: '#13c2c2',
    gold: '#fa8c16',
    lime: '#a0d911',
  };

  // Table columns definition
  const columns = [
    { 
      title: 'Shop Name', 
      dataIndex: 'name', 
      key: 'name', 
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ShopOutlined style={{ color: colors.primary, marginRight: 8, fontSize: '16px' }} />
          <span style={{ fontWeight: '600', color: '#262626' }}>{text}</span>
        </div>
      )
    },
    { 
      title: 'Location', 
      dataIndex: 'location', 
      key: 'location', 
      sorter: (a, b) => a.location.localeCompare(b.location),
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <EnvironmentOutlined style={{ color: colors.success, marginRight: 8, fontSize: '14px' }} />
          <span style={{ color: '#595959' }}>{text}</span>
        </div>
      )
    },
    { 
      title: 'Status', 
      key: 'status', 
      render: () => (
        <Tag 
          icon={<CheckCircleOutlined />} 
          color="success"
          style={{ 
            borderRadius: '20px', 
            padding: '2px 12px', 
            fontWeight: '500',
            fontSize: '12px',
          }}
        >
          Active
        </Tag>
      ) 
    },
    { 
      title: 'Action', 
      key: 'action',
      width: screens.xs ? 150 : 200,
      render: (_, record) => (
        <Space size="small" wrap style={{ width: screens.xs ? '100%' : 'auto' }}>
          <Button 
            icon={<EyeOutlined />} 
            onClick={() => handleViewShop(record)} 
            type="primary" 
            size="small"
            style={{ 
              background: 'linear-gradient(45deg, #1890ff, #52c41a)',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '500',
              fontSize: screens.xs ? '11px' : '12px',
              padding: screens.xs ? '4px 8px' : '4px 12px',
              height: 'auto',
              minHeight: '24px'
            }}
          >
            {screens.xs ? 'View' : 'Performance'}
          </Button>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => handleEditShop(record)} 
            size="small"
            style={{ 
              background: '#f0f8ff',
              borderColor: colors.primary,
              color: colors.primary,
              borderRadius: '6px',
              fontSize: screens.xs ? '11px' : '12px',
              padding: screens.xs ? '4px 8px' : '4px 12px',
              height: 'auto',
              minHeight: '24px'
            }}
          >
            {screens.xs ? '' : 'Edit'}
          </Button>
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteShop(record._id)} 
            size="small"
            style={{ 
              borderRadius: '6px',
              fontSize: screens.xs ? '11px' : '12px',
              padding: screens.xs ? '4px 8px' : '4px 12px',
              height: 'auto',
              minHeight: '24px'
            }}
          />
        </Space>
      )
    },
  ];

  // Fetch functions
  const fetchShops = async () => {
    setLoading(true);
    try {
      const shopsData = await shopAPI.getAll();
      setShops(shopsData);
    } catch (error) {
      message.error('Failed to fetch shops');
    } finally {
      setLoading(false);
    }
  };

  const fetchShopProducts = async (shopId) => {
    setProductsLoading(true);
    try {
      const response = await productAPI.getAll({ shopId });
      const productsData = Array.isArray(response?.data) ? response.data : response || [];
      setProducts(productsData);
      return productsData;
    } catch (error) {
      console.error('Error fetching shop products:', error);
      message.warning('Unable to fetch product data for cost calculation');
      return [];
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchShopPerformance = async (shopId, period = 'daily', dateRange = null) => {
    try {
      const params = { 
        shopId,
        period,
        dataType: 'withItems'
      };
      
      if (dateRange) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await unifiedAPI.getCombinedTransactions(params);
      const summary = response.data?.summary || response.summary || {};
      
      setShopPerformance({
        ...summary,
        totalRevenue: summary.totalRevenue || 0,
        totalSales: summary.totalSales || 0,
        grossProfit: summary.grossProfit || 0,
        netProfit: summary.netProfit || 0
      });
    } catch (error) {
      console.error('Error fetching shop performance:', error);
      message.error('Failed to fetch shop performance data');
    }
  };

  const fetchShopTransactions = async (shopId, period = 'daily', dateRange = null) => {
    setTransactionsLoading(true);
    try {
      const params = { 
        shopId, 
        dataType: 'withItems'
      };
      
      if (dateRange) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await unifiedAPI.getCombinedTransactions(params);
      const transactionsData = response.data?.salesWithProfit || 
                              response.data?.transactions || 
                              response.transactions || 
                              [];
      
      // Process transactions
      const processedTransactions = CalculationUtils.processComprehensiveData({
        transactions: transactionsData,
        products
      }, shopId).salesWithProfit;
      
      setTransactions(processedTransactions);
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      message.error('Failed to fetch transactions');
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Event handlers
  const handleTimeFilterChange = (value) => {
    setTimeFilter(value);
    if (value !== 'custom') {
      setCustomDateRange(null);
      if (viewingShop) {
        fetchShopPerformance(viewingShop._id, value);
        fetchShopTransactions(viewingShop._id, value);
      }
    }
  };

  const handleCustomDateChange = (dates) => {
    setCustomDateRange(dates);
    if (dates && viewingShop) {
      fetchShopPerformance(viewingShop._id, 'custom', dates);
      fetchShopTransactions(viewingShop._id, 'custom', dates);
    }
  };

  useEffect(() => { 
    fetchShops(); 
  }, []);

  const handleAddShop = () => {
    form.resetFields();
    setEditingShop(null);
    setIsModalOpen(true);
  };

  const handleEditShop = (shop) => {
    setEditingShop(shop);
    form.setFieldsValue({
      name: shop.name,
      location: shop.location,
    });
    setIsModalOpen(true);
  };

  const handleViewShop = async (shop) => {
    setViewingShop(shop);
    setLoading(true);
    
    try {
      // Fetch data in parallel
      await Promise.all([
        fetchShopProducts(shop._id),
        fetchShopPerformance(shop._id, timeFilter, customDateRange),
        fetchShopTransactions(shop._id, timeFilter, customDateRange)
      ]);
      
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error loading shop performance:', error);
      message.error('Failed to load shop performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShop = async (id) => {
    Modal.confirm({
      title: 'Delete Shop',
      content: 'Are you sure you want to delete this shop? This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setLoading(true);
          await shopAPI.delete(id);
          setShops(shops.filter(shop => shop._id !== id));
          message.success('Shop deleted successfully');
        } catch (error) {
          message.error('Failed to delete shop');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      if (!values.name?.trim() || !values.location?.trim()) {
        throw new Error('Shop name and location are required');
      }

      const shopData = { name: values.name.trim(), location: values.location.trim() };
      let response;

      if (editingShop) {
        response = await shopAPI.update(editingShop._id, shopData);
        setShops(shops.map(s => s._id === editingShop._id ? response.data : s));
        message.success('Shop updated successfully');
      } else {
        response = await shopAPI.create(shopData);
        setShops([...shops, response.data]);
        message.success('Shop added successfully');
      }

      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      message.error(error.message || 'Failed to save shop');
    } finally {
      setLoading(false);
    }
  };

  // Performance metrics calculation
  const calculatePerformanceMetrics = () => {
    // Use server-provided performance data as primary source
    const serverStats = shopPerformance;
    
    // Calculate metrics from server data with local fallback
    const totalRevenue = CalculationUtils.safeNumber(serverStats.totalRevenue) || 
                       CalculationUtils.calculateRevenue(transactions);
    
    const totalCOGS = CalculationUtils.safeNumber(serverStats.costOfGoodsSold) || 
                     CalculationUtils.calculateCOGS(transactions, products);
    
    const grossProfit = totalRevenue - totalCOGS;
    const expenses = CalculationUtils.safeNumber(serverStats.totalExpenses) || 0;
    const netProfit = grossProfit - expenses;

    return {
      // Sales metrics
      totalSales: transactions.length,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalItemsSold: transactions.reduce((sum, t) => 
        sum + CalculationUtils.safeNumber(t.itemsCount || (t.items ? t.items.length : 0)), 0),
      
      // Cost and profit metrics
      totalCOGS: parseFloat(totalCOGS.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      expenses: parseFloat(expenses.toFixed(2)),
      
      // Payment method breakdown
      cashTransactions: transactions.filter(t => t.paymentMethod === 'cash').length,
      mpesaTransactions: transactions.filter(t => t.paymentMethod === 'mpesa').length,
      bankTransactions: transactions.filter(t => t.paymentMethod === 'bank').length,
      
      // Data source info
      dataSource: serverStats.totalRevenue ? 'server' : 'local'
    };
  };

  // Shop Performance View Component
  const ShopPerformanceView = ({ shop }) => {
    const metrics = calculatePerformanceMetrics();
    const isMobile = screens.xs;

    return (
      <div>
        {/* Time Filter */}
        <Card 
          size="small" 
          style={{ 
            marginBottom: 16,
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #f0f0f0',
          }}
        >
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Text strong style={{ fontSize: screens.xs ? '13px' : '14px' }}>Filter by:</Text>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select 
                value={timeFilter} 
                onChange={handleTimeFilterChange} 
                style={{ width: '100%' }}
                size={isMobile ? 'small' : 'middle'}
                suffixIcon={<CalendarOutlined />}
              >
                <Option value="daily">📅 Daily</Option>
                <Option value="weekly">📆 Weekly</Option>
                <Option value="monthly">📊 Monthly</Option>
                <Option value="annually">📈 Annually</Option>
                <Option value="custom">🎯 Custom Range</Option>
              </Select>
            </Col>
            {timeFilter === 'custom' && (
              <Col xs={24} sm={24} md={12}>
                <RangePicker 
                  value={customDateRange} 
                  onChange={handleCustomDateChange} 
                  format="YYYY-MM-DD" 
                  style={{ width: '100%' }}
                  size={isMobile ? 'small' : 'middle'}
                  allowClear={false}
                />
              </Col>
            )}
          </Row>
        </Card>

        {/* Performance Metrics Grid */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {/* Sales Metrics */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card 
              style={{ 
                height: '100%',
                background: 'linear-gradient(135deg, #f6f8ff, #ffffff)',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(114, 46, 209, 0.1)',
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <Statistic 
                title={
                  <Text style={{ 
                    color: colors.purple, 
                    fontWeight: '600',
                    fontSize: screens.xs ? '13px' : '14px'
                  }}>
                    Total Sales
                  </Text>
                }
                value={metrics.totalSales}
                valueStyle={{ 
                  color: colors.purple,
                  fontSize: screens.xs ? '28px' : '32px',
                  fontWeight: 'bold',
                }}
                prefix={<ShoppingCartOutlined style={{ fontSize: screens.xs ? '18px' : '20px' }} />}
              />
              <div style={{ 
                marginTop: 12, 
                fontSize: screens.xs ? '11px' : '12px', 
                color: '#666',
              }}>
                Items sold: <strong style={{ color: colors.purple }}>{metrics.totalItemsSold}</strong>
              </div>
            </Card>
          </Col>

          {/* Revenue Metrics */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card 
              style={{ 
                height: '100%',
                background: 'linear-gradient(135deg, #e6f7ff, #ffffff)',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(24, 144, 255, 0.1)',
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <Statistic 
                title={
                  <Text style={{ 
                    color: colors.primary, 
                    fontWeight: '600',
                    fontSize: screens.xs ? '13px' : '14px'
                  }}>
                    Total Revenue
                  </Text>
                }
                value={metrics.totalRevenue}
                precision={2}
                prefix="KES"
                valueStyle={{ 
                  color: colors.primary,
                  fontSize: screens.xs ? '28px' : '32px',
                  fontWeight: 'bold',
                }}
                prefix={<DollarOutlined style={{ fontSize: screens.xs ? '18px' : '20px' }} />}
              />
              <div style={{ 
                marginTop: 12, 
                fontSize: screens.xs ? '11px' : '12px', 
                color: '#666',
              }}>
                Source: <strong style={{ color: metrics.dataSource === 'server' ? colors.success : colors.warning }}>
                  {metrics.dataSource}
                </strong>
              </div>
            </Card>
          </Col>

          {/* COGS Metrics */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card 
              style={{ 
                height: '100%',
                background: 'linear-gradient(135deg, #fff7e6, #ffffff)',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(250, 173, 20, 0.1)',
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <Statistic 
                title={
                  <Text style={{ 
                    color: colors.warning, 
                    fontWeight: '600',
                    fontSize: screens.xs ? '13px' : '14px'
                  }}>
                    Cost of Goods
                  </Text>
                }
                value={metrics.totalCOGS}
                precision={2}
                prefix="KES"
                valueStyle={{ 
                  color: colors.warning,
                  fontSize: screens.xs ? '28px' : '32px',
                  fontWeight: 'bold',
                }}
                prefix={<CalculatorOutlined style={{ fontSize: screens.xs ? '18px' : '20px' }} />}
              />
              <div style={{ 
                marginTop: 12, 
                fontSize: screens.xs ? '11px' : '12px', 
                color: '#666',
              }}>
                Products: <strong style={{ color: colors.warning }}>
                  {products.length}
                </strong>
              </div>
            </Card>
          </Col>

          {/* Net Profit Metrics */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card 
              style={{ 
                height: '100%',
                background: 'linear-gradient(135deg, #f6ffed, #ffffff)',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(82, 196, 26, 0.1)',
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <Statistic 
                title={
                  <Text style={{ 
                    color: colors.success, 
                    fontWeight: '600',
                    fontSize: screens.xs ? '13px' : '14px'
                  }}>
                    Net Profit
                  </Text>
                }
                value={metrics.netProfit}
                precision={2}
                prefix="KES"
                valueStyle={{ 
                  color: CalculationUtils.getProfitColor(metrics.netProfit),
                  fontSize: screens.xs ? '28px' : '32px',
                  fontWeight: 'bold',
                }}
                prefix={CalculationUtils.getProfitIcon(metrics.netProfit)}
              />
              <div style={{ 
                marginTop: 12, 
                fontSize: screens.xs ? '11px' : '12px', 
                color: '#666',
              }}>
                Gross: <strong style={{ color: colors.success }}>
                  {CalculationUtils.formatCurrency(metrics.grossProfit)}
                </strong>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Payment Method Summary Section */}
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <DollarOutlined style={{ 
                color: colors.primary, 
                marginRight: 12,
                background: '#e6f7ff',
                padding: '8px',
                borderRadius: '8px',
                fontSize: '18px'
              }} />
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#262626' }}>Payment Methods</div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Transaction breakdown by payment type</div>
              </div>
            </div>
          }
          style={{ 
            marginBottom: 24,
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={8} md={8}>
              <div style={{ 
                textAlign: 'center', 
                padding: '24px 16px',
                background: 'linear-gradient(135deg, #f6f8ff, #ffffff)',
                borderRadius: '12px',
                border: `2px solid ${colors.purple}33`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{ 
                  fontSize: screens.xs ? '14px' : '16px', 
                  color: colors.purple, 
                  marginBottom: 12,
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MoneyCollectOutlined style={{ marginRight: 8, fontSize: '18px' }} /> Cash
                </div>
                <div style={{ 
                  fontSize: screens.xs ? '32px' : '40px', 
                  fontWeight: 'bold',
                  color: colors.purple,
                  marginBottom: 8,
                }}>
                  {metrics.cashTransactions}
                </div>
                <Text type="secondary" style={{ fontSize: screens.xs ? '12px' : '13px' }}>
                  Cash transactions
                </Text>
              </div>
            </Col>
            
            <Col xs={24} sm={8} md={8}>
              <div style={{ 
                textAlign: 'center', 
                padding: '24px 16px',
                background: 'linear-gradient(135deg, #e6f7ff, #ffffff)',
                borderRadius: '12px',
                border: `2px solid ${colors.primary}33`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{ 
                  fontSize: screens.xs ? '14px' : '16px', 
                  color: colors.primary, 
                  marginBottom: 12,
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <PhoneOutlined style={{ marginRight: 8, fontSize: '18px' }} /> M-Pesa
                </div>
                <div style={{ 
                  fontSize: screens.xs ? '32px' : '40px', 
                  fontWeight: 'bold',
                  color: colors.primary,
                  marginBottom: 8,
                }}>
                  {metrics.mpesaTransactions}
                </div>
                <Text type="secondary" style={{ fontSize: screens.xs ? '12px' : '13px' }}>
                  M-Pesa transactions
                </Text>
              </div>
            </Col>
            
            <Col xs={24} sm={8} md={8}>
              <div style={{ 
                textAlign: 'center', 
                padding: '24px 16px',
                background: 'linear-gradient(135deg, #f0f8ff, #ffffff)',
                borderRadius: '12px',
                border: `2px solid ${colors.cyan}33`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{ 
                  fontSize: screens.xs ? '14px' : '16px', 
                  color: colors.cyan, 
                  marginBottom: 12,
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <DatabaseOutlined style={{ marginRight: 8, fontSize: '18px' }} /> Bank
                </div>
                <div style={{ 
                  fontSize: screens.xs ? '32px' : '40px', 
                  fontWeight: 'bold',
                  color: colors.cyan,
                  marginBottom: 8,
                }}>
                  {metrics.bankTransactions}
                </div>
                <Text type="secondary" style={{ fontSize: screens.xs ? '12px' : '13px' }}>
                  Bank transactions
                </Text>
              </div>
            </Col>
          </Row>
        </Card>

        <Tabs 
          defaultActiveKey="overview"
          type={isMobile ? "card" : "line"}
          size={isMobile ? "small" : "middle"}
          style={{ marginBottom: 24 }}
        >
          <Tabs.TabPane 
            tab={
              <span style={{ display: 'flex', alignItems: 'center', fontWeight: '500' }}>
                <BarChartOutlined style={{ fontSize: '16px' }} />
                {!isMobile && <span style={{ marginLeft: 8 }}>Financial Details</span>}
              </span>
            } 
            key="overview"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card 
                  title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <DollarOutlined style={{ color: colors.primary, marginRight: 8 }} />
                      <span>Revenue Analysis</span>
                    </div>
                  }
                  size="small"
                  style={{ 
                    borderRadius: '12px', 
                    height: '100%',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '16px',
                      background: '#fafafa',
                      borderRadius: '8px',
                      marginBottom: 8,
                      borderLeft: `4px solid ${colors.primary}`
                    }}>
                      <span style={{ fontWeight: '500', color: '#595959' }}>Total Revenue:</span>
                      <strong style={{ 
                        color: colors.primary, 
                        fontSize: '20px', 
                        fontWeight: 'bold'
                      }}>
                        {CalculationUtils.formatCurrency(metrics.totalRevenue)}
                      </strong>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '16px',
                      background: '#f0f8ff',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${colors.warning}`
                    }}>
                      <span style={{ fontWeight: '500', color: '#595959' }}>Expenses:</span>
                      <strong style={{ 
                        color: colors.warning, 
                        fontSize: '18px',
                        fontWeight: 'bold'
                      }}>
                        {CalculationUtils.formatCurrency(metrics.expenses)}
                      </strong>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card 
                  title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <CalculatorOutlined style={{ color: colors.success, marginRight: 8 }} />
                      <span>Profit Analysis</span>
                    </div>
                  }
                  size="small"
                  style={{ 
                    borderRadius: '12px', 
                    height: '100%',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '16px',
                      background: '#f6ffed',
                      borderRadius: '8px',
                      marginBottom: 8,
                      borderLeft: `4px solid ${colors.success}`
                    }}>
                      <span style={{ fontWeight: '500', color: '#595959' }}>Gross Profit:</span>
                      <strong style={{ 
                        color: colors.success, 
                        fontSize: '18px',
                        fontWeight: 'bold'
                      }}>
                        {CalculationUtils.formatCurrency(metrics.grossProfit)}
                      </strong>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '16px',
                      background: '#e6fffb',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${CalculationUtils.getProfitColor(metrics.netProfit)}`
                    }}>
                      <span style={{ fontWeight: '500', color: '#595959' }}>Net Profit:</span>
                      <strong style={{ 
                        color: CalculationUtils.getProfitColor(metrics.netProfit), 
                        fontSize: '20px', 
                        fontWeight: 'bold'
                      }}>
                        {CalculationUtils.formatCurrency(metrics.netProfit)}
                      </strong>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Tabs.TabPane>

          <Tabs.TabPane 
            tab={
              <span style={{ display: 'flex', alignItems: 'center', fontWeight: '500' }}>
                <ShoppingCartOutlined style={{ fontSize: '16px' }} />
                {!isMobile && <span style={{ marginLeft: 8 }}>Transactions</span>}
                {!isMobile && <Badge 
                  count={transactions.length} 
                  style={{ 
                    marginLeft: 8, 
                    backgroundColor: colors.primary,
                  }} 
                />}
              </span>
            } 
            key="transactions"
          >
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ShoppingCartOutlined style={{ color: colors.primary, marginRight: 8 }} />
                  <span>Recent Transactions ({transactions.length})</span>
                </div>
              }
              loading={transactionsLoading}
              style={{ 
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            >
              {transactions.length > 0 ? (
                <List 
                  dataSource={transactions} 
                  renderItem={t => <TransactionItem transaction={t} screens={screens} colors={colors} />}
                  pagination={{ 
                    pageSize: 10,
                    size: isMobile ? 'small' : 'default',
                    showSizeChanger: false,
                    simple: isMobile,
                    style: { marginTop: 24 }
                  }}
                />
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '48px 20px', 
                  color: '#bfbfbf',
                  background: '#fafafa',
                  borderRadius: '8px'
                }}>
                  <ShoppingCartOutlined style={{ 
                    fontSize: '64px', 
                    marginBottom: 16, 
                    opacity: 0.3,
                    color: colors.primary
                  }} />
                  <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: 8, color: '#8c8c8c' }}>
                    No transactions found
                  </div>
                  <div style={{ fontSize: '14px', color: '#bfbfbf' }}>
                    Transactions will appear here once sales are made
                  </div>
                </div>
              )}
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </div>
    );
  };

  // Main component return
  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ShopOutlined style={{ 
            color: colors.primary, 
            fontSize: '24px', 
            marginRight: 12,
            background: '#e6f7ff',
            padding: '10px',
            borderRadius: '10px',
          }} />
          <div>
            <div style={{ 
              fontSize: screens.xs ? '18px' : '20px', 
              fontWeight: 'bold', 
              color: '#262626',
              lineHeight: '1.2'
            }}>
              Shop Management
            </div>
            <div style={{ 
              fontSize: screens.xs ? '11px' : '12px', 
              color: '#8c8c8c', 
              marginTop: 2 
            }}>
              Manage your shops and monitor performance metrics
            </div>
          </div>
        </div>
      } 
      extra={
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddShop}
          size={screens.xs ? 'small' : 'middle'}
          style={{ 
            background: 'linear-gradient(45deg, #1890ff, #52c41a)',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            padding: screens.xs ? '4px 12px' : '8px 24px',
            height: 'auto',
          }}
        >
          {screens.xs ? 'Add Shop' : 'Add New Shop'}
        </Button>
      }
      style={{ 
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: 'none',
        overflow: 'hidden'
      }}
      headStyle={{ 
        padding: screens.xs ? '16px' : '24px',
        borderBottom: '1px solid #f0f0f0'
      }}
      bodyStyle={{ 
        padding: screens.xs ? '16px' : '24px',
        paddingTop: screens.xs ? '16px' : '20px'
      }}
    >
      <Spin 
        spinning={loading} 
        size="large"
        tip={screens.xs ? "Loading..." : "Loading shop data..."}
        style={{ minHeight: '200px' }}
      >
        <Table 
          columns={columns} 
          dataSource={shops} 
          rowKey="_id" 
          pagination={{ 
            pageSize: 10,
            size: screens.xs ? 'small' : 'default',
            showSizeChanger: true,
            simple: screens.xs,
            showTotal: (total) => `Total ${total} shops`
          }}
          scroll={{ x: true }}
          style={{ 
            marginTop: 8,
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        />
      </Spin>

      {/* Add/Edit Shop Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {editingShop ? (
              <>
                <EditOutlined style={{ 
                  color: colors.primary, 
                  marginRight: 12,
                  background: '#e6f7ff',
                  padding: '6px',
                  borderRadius: '6px',
                  fontSize: '18px'
                }} />
                <span style={{ fontSize: '18px', fontWeight: '600' }}>Edit Shop Details</span>
              </>
            ) : (
              <>
                <PlusOutlined style={{ 
                  color: colors.success, 
                  marginRight: 12,
                  background: '#f6ffed',
                  padding: '6px',
                  borderRadius: '6px',
                  fontSize: '18px'
                }} />
                <span style={{ fontSize: '18px', fontWeight: '600' }}>Add New Shop</span>
              </>
            )}
          </div>
        }
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        footer={null}
        destroyOnClose
        width={screens.xs ? '90%' : 520}
        centered
        style={{ borderRadius: '12px' }}
        bodyStyle={{ padding: screens.xs ? '16px' : '24px' }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item 
            label={<Text strong style={{ fontSize: '14px' }}>Shop Name</Text>}
            name="name" 
            rules={[{ required: true, message: 'Please enter shop name' }]}
          >
            <Input 
              placeholder="Enter shop name" 
              size="large"
              prefix={<ShopOutlined style={{ color: '#bfbfbf' }} />}
              style={{ 
                borderRadius: '8px',
                padding: '12px',
                fontSize: '16px'
              }}
            />
          </Form.Item>
          <Form.Item 
            label={<Text strong style={{ fontSize: '14px' }}>Location</Text>}
            name="location" 
            rules={[{ required: true, message: 'Please enter location' }]}
          >
            <Input 
              placeholder="Enter location" 
              size="large"
              prefix={<EnvironmentOutlined style={{ color: '#bfbfbf' }} />}
              style={{ 
                borderRadius: '8px',
                padding: '12px',
                fontSize: '16px'
              }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block
              size="large"
              style={{ 
                background: 'linear-gradient(45deg, #1890ff, #52c41a)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '500',
                height: '48px',
                fontSize: '16px',
              }}
            >
              {editingShop ? 'Update Shop' : 'Add Shop'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Performance View Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: screens.xs ? 0 : 20 }}>
            <BarChartOutlined style={{ 
              color: colors.primary, 
              fontSize: '22px', 
              marginRight: 12,
              background: '#e6f7ff',
              padding: '8px',
              borderRadius: '8px',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: screens.xs ? '16px' : '18px', 
                fontWeight: 'bold',
                color: '#262626',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {viewingShop?.name}
              </div>
              <div style={{ 
                fontSize: screens.xs ? '11px' : '12px', 
                color: '#8c8c8c',
                display: 'flex',
                alignItems: 'center',
                marginTop: 2
              }}>
                <EnvironmentOutlined style={{ marginRight: 4, fontSize: '11px' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {viewingShop?.location}
                </span>
              </div>
            </div>
          </div>
        }
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={[
          <Button 
            key="close" 
            onClick={() => setIsViewModalOpen(false)}
            style={{ 
              borderRadius: '8px',
              padding: '8px 24px',
              height: 'auto',
              fontWeight: '500'
            }}
            size={screens.xs ? 'small' : 'middle'}
          >
            Close
          </Button>
        ]}
        width={screens.xs ? '100%' : 1200}
        style={{ 
          top: screens.xs ? 0 : 20,
          maxWidth: screens.xs ? '100%' : 'calc(100vw - 40px)',
          borderRadius: screens.xs ? 0 : '12px',
          overflow: 'hidden'
        }}
        bodyStyle={{ 
          padding: screens.xs ? '16px' : '24px',
          maxHeight: screens.xs ? 'calc(100vh - 140px)' : 'calc(100vh - 200px)',
          overflowY: 'auto',
          paddingTop: screens.xs ? '16px' : '20px'
        }}
        maskStyle={screens.xs ? { background: 'rgba(0,0,0,0.9)' } : {}}
      >
        <Spin spinning={loading || productsLoading} size="large">
          {viewingShop && <ShopPerformanceView shop={viewingShop} />}
        </Spin>
      </Modal>
    </Card>
  );
};

export default ShopManagement;