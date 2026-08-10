// src/pages/Admin/CashierManagement.jsx - UPDATED WITH PASSWORD FIELD
import React, { 
  useState, 
  useEffect, 
  useMemo, 
  useCallback 
} from 'react';
import { 
  // Core components
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
  theme,
  Empty,
  Rate,
  Drawer,
  Dropdown,
  Popover,
  Avatar,
  Segmented,
  FloatButton,
  Flex,
  Layout,
  Breadcrumb,
  Switch,
  InputNumber,
  Popconfirm
} from 'antd';
import { 
  // Icons
  UserAddOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  BarChartOutlined,
  TeamOutlined,
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
  BankOutlined,
  BarcodeOutlined,
  DatabaseOutlined,
  MailOutlined,
  ReloadOutlined,
  StarOutlined,
  SearchOutlined,
  FilterOutlined,
  MoreOutlined,
  DashboardOutlined,
  TransactionOutlined,
  ProfileOutlined,
  SettingOutlined,
  ExportOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  AreaChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  MobileOutlined,
  TabletOutlined,
  DesktopOutlined,
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CrownOutlined,
  FireOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  GlobalOutlined,
  CloudSyncOutlined,
  CloseOutlined,
  LockOutlined,
  KeyOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { cashierAPI, unifiedAPI } from '../../services/api';
import { CalculationUtils } from '../../utils/calculationUtils';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';

dayjs.extend(advancedFormat);

// Destructure Ant Design components
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;
const { useToken } = theme;
const { Header, Content, Footer, Sider } = Layout;

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

// Password strength indicator component
const PasswordStrengthIndicator = ({ password }) => {
  const { token } = useToken();
  
  const calculateStrength = (pass) => {
    if (!pass) return 0;
    
    let strength = 0;
    
    // Length check
    if (pass.length >= 8) strength += 25;
    else if (pass.length >= 6) strength += 15;
    else if (pass.length >= 4) strength += 5;
    
    // Contains number
    if (/\d/.test(pass)) strength += 25;
    
    // Contains lowercase
    if (/[a-z]/.test(pass)) strength += 15;
    
    // Contains uppercase
    if (/[A-Z]/.test(pass)) strength += 15;
    
    // Contains special character
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) strength += 20;
    
    return Math.min(100, strength);
  };
  
  const strength = calculateStrength(password);
  
  const getStrengthColor = () => {
    if (strength < 30) return token.colorError;
    if (strength < 60) return token.colorWarning;
    if (strength < 80) return token.colorInfo;
    return token.colorSuccess;
  };
  
  const getStrengthText = () => {
    if (!password) return 'No password';
    if (strength < 30) return 'Weak';
    if (strength < 60) return 'Fair';
    if (strength < 80) return 'Good';
    return 'Strong';
  };
  
  if (!password) return null;
  
  return (
    <div style={{ marginTop: 8 }}>
      <Flex justify="space-between" align="center">
        <Text type="secondary" style={{ fontSize: 12 }}>Password Strength:</Text>
        <Text style={{ color: getStrengthColor(), fontSize: 12, fontWeight: 500 }}>
          {getStrengthText()} ({strength}%)
        </Text>
      </Flex>
      <Progress 
        percent={strength} 
        strokeColor={getStrengthColor()} 
        showInfo={false}
        size="small"
        style={{ marginTop: 4 }}
      />
      <ul style={{ 
        marginTop: 8, 
        paddingLeft: 20, 
        fontSize: 11, 
        color: token.colorTextSecondary 
      }}>
        <li style={{ color: password?.length >= 8 ? token.colorSuccess : token.colorTextSecondary }}>
          At least 8 characters
        </li>
        <li style={{ color: /\d/.test(password) ? token.colorSuccess : token.colorTextSecondary }}>
          Contains at least one number
        </li>
        <li style={{ color: /[a-z]/.test(password) && /[A-Z]/.test(password) ? token.colorSuccess : token.colorTextSecondary }}>
          Contains both uppercase and lowercase letters
        </li>
        <li style={{ color: /[!@#$%^&*(),.?":{}|<>]/.test(password) ? token.colorSuccess : token.colorTextSecondary }}>
          Contains at least one special character
        </li>
      </ul>
    </div>
  );
};

// =============================================
// AI-Enhanced Responsive Components
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
              <TeamOutlined style={{ 
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
  
  const formattedValue = typeof value === 'number' ? 
    value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 
    value;
  
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
    >
      <Spin spinning={loading}>
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
                fontSize: screens.xs ? '20px' : '24px',
                fontWeight: 700,
                lineHeight: 1.2
              }}>
                {formattedValue}
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
      </Spin>
    </Card>
  );
};

const AdaptiveTable = ({ columns, data, loading, ...props }) => {
  const screens = useBreakpoint();
  const { token } = useToken();
  
  const adaptiveColumns = useMemo(() => {
    if (!screens.md) {
      return columns.map(col => ({
        ...col,
        ellipsis: true,
        width: col.dataIndex === 'action' ? 80 : undefined,
        render: col.dataIndex === 'action' ? (_, record) => (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'view',
                  label: 'View Performance',
                  icon: <EyeOutlined />,
                  onClick: () => col.onView?.(record)
                },
                {
                  key: 'edit',
                  label: 'Edit Cashier',
                  icon: <EditOutlined />,
                  onClick: () => col.onEdit?.(record)
                },
                {
                  type: 'divider',
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => col.onDelete?.(record._id)
                }
              ]
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        ) : col.render
      }));
    }
    
    return columns;
  }, [columns, screens.md]);
  
  return (
    <div style={{ 
      borderRadius: '8px',
      overflow: 'hidden',
      border: `1px solid ${token.colorBorder}`,
      background: 'white'
    }}>
      <Table
        columns={adaptiveColumns}
        dataSource={data}
        loading={loading}
        pagination={{
          pageSize: screens.xs ? 5 : 10,
          size: screens.xs ? 'small' : 'default',
          showSizeChanger: !screens.xs,
          showQuickJumper: !screens.xs,
          simple: screens.xs,
          showTotal: (total) => `Total ${total} cashiers`
        }}
        scroll={{ x: true }}
        size={screens.xs ? 'small' : 'middle'}
        rowKey="_id"
        rowClassName={() => 'responsive-table-row'}
        style={{
          minHeight: '200px'
        }}
        {...props}
      />
    </div>
  );
};

const TransactionItem = ({ transaction, screens, colors }) => {
  const { token } = useToken();
  const [expanded, setExpanded] = useState(false);
  
  const isMobile = screens.xs;
  
  return (
    <div 
      style={{ 
        marginBottom: '12px', 
        padding: isMobile ? '12px' : '16px',
        borderRadius: '10px',
        backgroundColor: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: token.colorPrimary,
          boxShadow: `0 2px 8px ${token.colorPrimary}15`
        }
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <Flex vertical={isMobile} gap={isMobile ? 'small' : 'middle'} justify="space-between">
        <Flex vertical gap="small" style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" gap="small" wrap="wrap">
            <BarcodeOutlined style={{ color: colors.primary, fontSize: '14px' }} />
            <Text strong style={{ 
              fontSize: isMobile ? '13px' : '14px',
              color: token.colorTextHeading,
              flex: 1,
              minWidth: 0
            }}>
              {transaction.items?.length || 0} items sold
            </Text>
            {transaction.paymentMethod === 'cash_mpesa_bank' && (
              <Tag 
                color="orange" 
                style={{ 
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontWeight: '500',
                  fontSize: '10px',
                  margin: 0
                }}
              >
                Mixed Payment
              </Tag>
            )}
          </Flex>
          
          <Flex align="center" gap="small" wrap="wrap">
            <CalendarOutlined style={{ fontSize: '11px', color: token.colorTextTertiary }} />
            <Text style={{ 
              fontSize: '11px', 
              color: token.colorTextTertiary,
            }}>
              {dayjs(transaction.saleDate || transaction.transactionDate || transaction.createdAt).format('MMM D, YYYY h:mm A')}
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
        
        <Flex vertical align={isMobile ? "flex-start" : "flex-end"} gap="small">
          <Text strong style={{ 
            fontSize: isMobile ? '16px' : '18px', 
            color: colors.success,
            textAlign: isMobile ? 'left' : 'right'
          }}>
            KES {transaction.totalAmount?.toLocaleString('en-KE', { minimumFractionDigits: 2 }) || '0.00'}
          </Text>
          <Tag 
            color={
              transaction.paymentMethod === 'cash' ? 'green' :
              transaction.paymentMethod === 'mpesa_bank' ? 'blue' :
              transaction.paymentMethod === 'cash_mpesa_bank' ? 'orange' : 'default'
            }
            style={{ 
              fontSize: '10px',
              margin: 0
            }}
          >
            {transaction.paymentMethod?.toUpperCase().replace(/_/g, ' ') || 'CASH'} Sale
          </Tag>
          <Text type="secondary" style={{ fontSize: '10px', color: transaction.profit >= 0 ? colors.success : colors.error }}>
            Profit: KES {transaction.profit?.toFixed(2) || '0.00'}
          </Text>
        </Flex>
      </Flex>
    </div>
  );
};

// =============================================
// MAIN COMPONENT - CASHIER MANAGEMENT
// =============================================

const CashierManagement = () => {
  const [cashiers, setCashiers] = useState([]);
  const [filteredCashiers, setFilteredCashiers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingCashier, setEditingCashier] = useState(null);
  const [viewingCashier, setViewingCashier] = useState(null);
  const [cashierPerformance, setCashierPerformance] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('30d');
  const [customDateRange, setCustomDateRange] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [mobileView, setMobileView] = useState('list');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [exportLoading, setExportLoading] = useState(false);
  const [dataTimestamp, setDataTimestamp] = useState(null);
  const [shops, setShops] = useState([]);
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  
  const [form] = Form.useForm();
  
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
      payment: isMobile ? 24 : isTablet ? 24 : 12,
      details: isMobile ? 24 : isTablet ? 12 : 12,
    },
    
    // Padding and spacing
    padding: isMobile ? '16px' : isTablet ? '20px' : '24px',
    gap: isMobile ? '12px' : isTablet ? '16px' : '20px',
    
    // Font sizes
    fontSize: {
      title: isMobile ? '16px' : isTablet ? '18px' : '20px',
      subtitle: isMobile ? '12px' : isTablet ? '13px' : '14px',
      stat: isMobile ? '20px' : isTablet ? '24px' : '28px',
      body: isMobile ? '12px' : isTablet ? '13px' : '14px',
    }
  }), [isMobile, isTablet, isDesktop, screens]);

  // =============================================
  // DATE RANGE CALCULATION
  // =============================================

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
        return customDateRange;
      default:
        startDate = now.subtract(30, 'days');
    }

    return [startDate, now];
  }, [customDateRange]);

  // =============================================
  // DATA FETCHING FUNCTIONS
  // =============================================

  const fetchCashiers = async () => {
    setLoading(true);
    try {
      console.log('📋 Fetching cashiers list...');
      const cashiersData = await cashierAPI.getAll();
      console.log('✅ Cashiers fetched:', cashiersData.length, 'cashiers');
      setCashiers(cashiersData);
      setFilteredCashiers(cashiersData);
      
      // Fetch shops as well for context
      const shopsData = await cashierAPI.getShops?.() || [];
      setShops(shopsData);
      
    } catch (error) {
      console.error('❌ Error fetching cashiers:', error);
      message.error('Failed to fetch cashiers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCashierPerformance = async (cashierId, rangeType = timeFilter, dateRange = null) => {
    try {
      console.log('📊 Fetching cashier performance for ID:', cashierId, 'with range:', rangeType);
      
      const params = { 
        cashierId,
        dataType: 'withItems'
      };
      
      // Calculate date range based on filter type
      if (rangeType !== 'custom') {
        const calculatedRange = calculateDateRange(rangeType);
        if (calculatedRange && calculatedRange[0] && calculatedRange[1]) {
          params.startDate = calculatedRange[0].format('YYYY-MM-DD');
          params.endDate = calculatedRange[1].format('YYYY-MM-DD');
        }
      } else if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      console.log('📅 Performance date params:', params);
      
      const response = await unifiedAPI.getCombinedTransactions(params);
      console.log('✅ Performance response received');
      
      // Extract summary data
      const summary = response.summary || 
                     response.data?.summary || 
                     response.financialStats || 
                     {};
      
      const performanceData = {
        totalRevenue: summary.totalRevenue || 0,
        totalSales: summary.totalSales || summary.transactions || 0,
        totalProfit: summary.netProfit || summary.totalProfit || 0,
        profitMargin: summary.profitMargin || 0,
        totalCash: summary.totalCash || 0,
        totalMpesaBank: summary.totalMpesaBank || 0,
        totalItemsSold: summary.totalItemsSold || 0
      };
      
      console.log('✅ Processed performance data:', performanceData);
      setCashierPerformance(performanceData);
      setDataTimestamp(new Date().toISOString());
      
    } catch (error) {
      console.error('❌ Error fetching cashier performance:', error);
      message.error('Failed to fetch cashier performance data');
    }
  };

  const fetchCashierTransactions = async (cashierId, rangeType = timeFilter, dateRange = null) => {
    setTransactionsLoading(true);
    try {
      console.log('💳 Fetching cashier transactions for ID:', cashierId, 'with range:', rangeType);
      
      const params = { 
        cashierId,
        dataType: 'withItems'
      };
      
      // Calculate date range based on filter type
      if (rangeType !== 'custom') {
        const calculatedRange = calculateDateRange(rangeType);
        if (calculatedRange && calculatedRange[0] && calculatedRange[1]) {
          params.startDate = calculatedRange[0].format('YYYY-MM-DD');
          params.endDate = calculatedRange[1].format('YYYY-MM-DD');
        }
      } else if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      console.log('📅 Transaction date params:', params);
      
      const response = await unifiedAPI.getCombinedTransactions(params);
      console.log('✅ Transactions response received');
      
      const transactionsData = response.transactions || 
                              response.salesWithProfit || 
                              response.data?.transactions || 
                              response.data?.salesWithProfit || 
                              [];
      
      console.log('📊 Raw transactions count:', transactionsData.length);
      
      const processedTransactions = CalculationUtils.processComprehensiveData({
        transactions: transactionsData
      }, cashierId).salesWithProfit;
      
      console.log('✅ Processed transactions:', processedTransactions.length);
      setTransactions(processedTransactions);
      
    } catch (error) {
      console.error('❌ Error fetching cashier transactions:', error);
      message.error('Failed to fetch transactions');
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // =============================================
  // EFFECTS - AUTO-FETCH DATA WHEN FILTERS CHANGE
  // =============================================

  useEffect(() => { 
    console.log('🚀 Initializing Cashier Management');
    fetchCashiers(); 
  }, []);

  // Auto-fetch performance data when viewing cashier and filters change
  useEffect(() => {
    if (viewingCashier && timeFilter !== 'custom') {
      console.log('🔄 Auto-refreshing data for time filter change:', timeFilter);
      fetchCashierPerformance(viewingCashier._id, timeFilter);
      fetchCashierTransactions(viewingCashier._id, timeFilter);
    }
  }, [timeFilter, viewingCashier]);

  // Auto-fetch when custom date range changes
  useEffect(() => {
    if (viewingCashier && timeFilter === 'custom' && customDateRange) {
      console.log('🔄 Auto-refreshing data for custom date range');
      fetchCashierPerformance(viewingCashier._id, 'custom', customDateRange);
      fetchCashierTransactions(viewingCashier._id, 'custom', customDateRange);
    }
  }, [customDateRange, viewingCashier]);

  // =============================================
  // FILTER HANDLERS
  // =============================================

  const handleTimeFilterChange = (value) => {
    console.log('🕒 Time filter changed to:', value);
    setTimeFilter(value);
    if (value !== 'custom') {
      setCustomDateRange(null);
    }
  };

  const handleCustomDateChange = (dates) => {
    console.log('📅 Custom date range selected:', dates);
    setCustomDateRange(dates);
  };

  // Search and filter cashiers
  const handleSearch = useCallback((value) => {
    setSearchText(value);
    if (!value.trim()) {
      setFilteredCashiers(cashiers);
      return;
    }
    
    const searchValue = value.toLowerCase();
    const filtered = cashiers.filter(cashier => 
      cashier.name?.toLowerCase().includes(searchValue) ||
      cashier.email?.toLowerCase().includes(searchValue) ||
      (cashier.phone && cashier.phone.includes(searchValue))
    );
    setFilteredCashiers(filtered);
  }, [cashiers]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (viewingCashier) {
      setTransactionsLoading(true);
      try {
        await Promise.all([
          fetchCashierPerformance(viewingCashier._id, timeFilter, customDateRange),
          fetchCashierTransactions(viewingCashier._id, timeFilter, customDateRange)
        ]);
        message.success('Data refreshed successfully');
      } catch (error) {
        message.error('Failed to refresh data');
      } finally {
        setTransactionsLoading(false);
      }
    }
  };

  // =============================================
  // CRUD OPERATIONS WITH PASSWORD
  // =============================================

  const handleAddCashier = () => {
    form.resetFields();
    setEditingCashier(null);
    setPasswordValue('');
    setIsModalOpen(true);
  };

  const handleEditCashier = (cashier) => {
    console.log('✏️ Editing cashier:', cashier._id);
    setEditingCashier(cashier);
    setPasswordValue('');
    form.setFieldsValue({
      name: cashier.name,
      email: cashier.email,
      phone: cashier.phone,
      // Don't set password field for editing - leave blank
    });
    setIsModalOpen(true);
  };

  const handleViewCashier = async (cashier) => {
    console.log('👁️ Viewing cashier performance:', cashier._id);
    setViewingCashier(cashier);
    setTransactionsLoading(true);
    
    try {
      setCashierPerformance({});
      setTransactions([]);
      
      await Promise.all([
        fetchCashierPerformance(cashier._id, timeFilter, customDateRange),
        fetchCashierTransactions(cashier._id, timeFilter, customDateRange)
      ]);
      
      if (isMobile) {
        setDrawerVisible(true);
      } else {
        setIsViewModalOpen(true);
      }
      
      console.log('✅ Performance view opened for cashier:', cashier.name);
    } catch (error) {
      console.error('❌ Error loading cashier performance:', error);
      message.error('Failed to load cashier performance data');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleDeleteCashier = async (id) => {
    Modal.confirm({
      title: 'Delete Cashier',
      content: 'Are you sure you want to delete this cashier? This action cannot be undone.',
      icon: <ExclamationCircleOutlined />,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      className: isMobile ? 'mobile-confirm-modal' : '',
      width: isMobile ? '80%' : 520,
      onOk: async () => {
        try {
          setLoading(true);
          console.log('🗑️ Deleting cashier ID:', id);
          await cashierAPI.delete(id);
          setCashiers(cashiers.filter(cashier => cashier._id !== id));
          setFilteredCashiers(filteredCashiers.filter(cashier => cashier._id !== id));
          message.success('Cashier deleted successfully');
        } catch (error) {
          console.error('❌ Error deleting cashier:', error);
          message.error('Failed to delete cashier');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      if (!values.name?.trim() || !values.email?.trim()) {
        throw new Error('Cashier name and email are required');
      }

      const cashierData = { 
        name: values.name.trim(), 
        email: values.email.trim(),
        phone: values.phone?.trim() || ''
      };
      
      // Only include password if it's provided
      if (values.password && values.password.trim() !== '') {
        cashierData.password = values.password.trim();
      }
      
      console.log('💾 Saving cashier:', { ...cashierData, password: cashierData.password ? '[PROVIDED]' : '[NOT PROVIDED]' });
      
      let response;

      if (editingCashier) {
        response = await cashierAPI.update(editingCashier._id, cashierData);
        setCashiers(cashiers.map(c => c._id === editingCashier._id ? response.data : c));
        setFilteredCashiers(filteredCashiers.map(c => c._id === editingCashier._id ? response.data : c));
        message.success(cashierData.password ? 'Cashier updated with new password' : 'Cashier updated successfully');
      } else {
        // For new cashiers, password is required
        if (!values.password || values.password.trim() === '') {
          throw new Error('Password is required for new cashiers');
        }
        response = await cashierAPI.create(cashierData);
        setCashiers([...cashiers, response.data]);
        setFilteredCashiers([...filteredCashiers, response.data]);
        message.success('Cashier added successfully with password');
      }

      setIsModalOpen(false);
      form.resetFields();
      setPasswordValue('');
    } catch (error) {
      console.error('❌ Error saving cashier:', error);
      message.error(error.message || 'Failed to save cashier');
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // PERFORMANCE METRICS CALCULATION
  // =============================================

  const calculatePerformanceMetrics = () => {
    console.log('🧮 Calculating performance metrics from', transactions.length, 'transactions');
    
    if (transactions.length === 0 && Object.keys(cashierPerformance).length === 0) {
      console.log('⚠️ No data to calculate metrics');
      return {
        totalTransactions: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        profitMargin: 0,
        performanceScore: 0,
        totalItemsSold: 0,
        totalCash: 0,
        totalBankMpesa: 0,
        cashPercentage: 0,
        mpesaBankPercentage: 0,
        cashTransactions: 0,
        mpesaBankTransactions: 0,
        dataSource: 'none'
      };
    }

    // Use server stats if available, otherwise calculate from transactions
    const totalRevenue = cashierPerformance.totalRevenue || 
                       CalculationUtils.calculateRevenue(transactions);
    
    const totalCost = CalculationUtils.calculateCOGS(transactions);
    const totalProfit = cashierPerformance.totalProfit || (totalRevenue - totalCost);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Payment composition
    let totalCash = cashierPerformance.totalCash || 0;
    let totalBankMpesa = cashierPerformance.totalMpesaBank || 0;
    
    if (totalCash === 0 && totalBankMpesa === 0 && transactions.length > 0) {
      const paymentComposition = CalculationUtils.calculatePaymentComposition(transactions);
      totalCash = paymentComposition.cash;
      totalBankMpesa = paymentComposition.mpesa_bank;
    }
    
    const totalPayments = totalCash + totalBankMpesa;
    const cashPercentage = totalPayments > 0 ? (totalCash / totalPayments) * 100 : 0;
    const mpesaBankPercentage = totalPayments > 0 ? (totalBankMpesa / totalPayments) * 100 : 0;

    // Transaction counts
    const cashTransactions = transactions.filter(t => 
      t.paymentMethod === 'cash' || 
      (t.paymentSplit && t.paymentSplit.cash > 0)
    ).length;
    
    const mpesaBankTransactions = transactions.filter(t => 
      ['mpesa', 'bank', 'mpesa_bank', 'cash_mpesa_bank'].includes(t.paymentMethod) ||
      (t.paymentSplit && t.paymentSplit.mpesa_bank > 0)
    ).length;

    // Performance score calculation
    let performanceScore = 0;
    performanceScore += Math.min(40, (totalRevenue / 10000) * 40);
    performanceScore += Math.min(30, (transactions.length / 50) * 30);
    performanceScore += Math.min(15, profitMargin * 0.3);
    performanceScore += Math.min(15, (totalBankMpesa / (totalRevenue || 1)) * 15);
    performanceScore = Math.min(100, Math.round(performanceScore));

    const metrics = {
      totalTransactions: cashierPerformance.totalSales || transactions.length,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      profitMargin: parseFloat(profitMargin.toFixed(2)),
      performanceScore: performanceScore,
      totalItemsSold: cashierPerformance.totalItemsSold || 
                     transactions.reduce((sum, t) => 
                       sum + CalculationUtils.safeNumber(t.itemsCount || (t.items ? t.items.length : 0)), 0),
      
      totalCash: parseFloat(totalCash.toFixed(2)),
      totalBankMpesa: parseFloat(totalBankMpesa.toFixed(2)),
      cashPercentage: parseFloat(cashPercentage.toFixed(1)),
      mpesaBankPercentage: parseFloat(mpesaBankPercentage.toFixed(1)),
      cashTransactions: cashTransactions,
      mpesaBankTransactions: mpesaBankTransactions,
      
      dataSource: cashierPerformance.totalRevenue ? 'server' : 'local'
    };
    
    console.log('✅ Calculated metrics:', metrics);
    return metrics;
  };

  // =============================================
  // RESPONSIVE TABLE COLUMNS
  // =============================================

  const columns = useMemo(() => [
    { 
      title: 'Cashier', 
      dataIndex: 'name', 
      key: 'name',
      fixed: isMobile ? false : 'left',
      width: isMobile ? 120 : 180,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <Flex align="center" gap="small">
          <Avatar 
            size={isMobile ? 32 : 40}
            style={{ 
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.purple})`,
              flexShrink: 0
            }}
            icon={<UserOutlined />}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ 
              fontSize: isMobile ? '13px' : '14px',
              color: token.colorTextHeading,
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {text}
            </Text>
            <Text type="secondary" style={{ 
              fontSize: isMobile ? '11px' : '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <MailOutlined style={{ fontSize: '10px' }} />
              {record.email}
            </Text>
            {record.phone && (
              <Text type="secondary" style={{ 
                fontSize: isMobile ? '10px' : '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <PhoneOutlined style={{ fontSize: '10px' }} />
                {record.phone}
              </Text>
            )}
            {/* Show password status indicator */}
            <Tag 
              color={record.password ? 'green' : 'orange'} 
              size="small"
              style={{ 
                fontSize: '9px', 
                marginTop: '4px',
                padding: '0 4px'
              }}
              icon={record.password ? <SafetyCertificateOutlined /> : <WarningOutlined />}
            >
              {record.password ? 'Password Set' : 'No Password'}
            </Tag>
          </div>
        </Flex>
      )
    },
    ...(isMobile ? [] : [
      { 
        title: 'Contact', 
        dataIndex: 'email', 
        key: 'email', 
        width: 180,
        render: (text) => (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {text}
          </Text>
        )
      },
      { 
        title: 'Status', 
        key: 'status', 
        width: 100,
        align: 'center',
        render: (_, record) => (
          <Badge 
            status={record.status === 'active' ? 'success' : 'warning'}
            text={record.status === 'active' ? 'Active' : 'Inactive'}
            style={{ fontSize: '12px' }}
          />
        ) 
      },
      { 
        title: 'Password', 
        key: 'passwordStatus',
        width: 100,
        align: 'center',
        render: (_, record) => (
          <Tag 
            color={record.password ? 'green' : 'orange'}
            icon={record.password ? <SafetyCertificateOutlined /> : <WarningOutlined />}
            style={{ fontSize: '11px' }}
          >
            {record.password ? 'Set' : 'Not Set'}
          </Tag>
        )
      },
      { 
        title: 'Last Login', 
        dataIndex: 'lastLogin', 
        key: 'lastLogin',
        width: 120,
        render: (date) => (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {date ? dayjs(date).format('MMM D') : 'Never'}
          </Text>
        )
      },
    ]),
    { 
      title: 'Action', 
      key: 'action',
      width: isMobile ? 80 : 150,
      fixed: isMobile ? 'right' : false,
      align: 'center',
      onView: (record) => handleViewCashier(record),
      onEdit: (record) => handleEditCashier(record),
      onDelete: (id) => handleDeleteCashier(id),
      render: (_, record) => {
        if (isMobile) {
          return (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'view',
                    label: 'View Performance',
                    icon: <EyeOutlined />,
                    onClick: () => handleViewCashier(record)
                  },
                  {
                    key: 'edit',
                    label: 'Edit Cashier',
                    icon: <EditOutlined />,
                    onClick: () => handleEditCashier(record)
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'delete',
                    label: 'Delete',
                    icon: <DeleteOutlined />,
                    danger: true,
                    onClick: () => handleDeleteCashier(record._id)
                  }
                ]
              }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button 
                type="text" 
                icon={<MoreOutlined />} 
                size="small"
                style={{ padding: '4px' }}
              />
            </Dropdown>
          );
        }
        
        return (
          <Space size="small" wrap>
            <Tooltip title="View Performance">
              <Button 
                icon={<EyeOutlined />} 
                onClick={() => handleViewCashier(record)} 
                type="primary" 
                size="small"
                style={{ 
                  background: `linear-gradient(45deg, ${colors.primary}, ${colors.success})`,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  height: '28px'
                }}
              />
            </Tooltip>
            <Tooltip title="Edit Cashier">
              <Button 
                icon={<EditOutlined />} 
                onClick={() => handleEditCashier(record)} 
                size="small"
                style={{ 
                  background: `${colors.primary}10`,
                  borderColor: colors.primary,
                  color: colors.primary,
                  borderRadius: '6px',
                  padding: '4px 12px',
                  height: '28px'
                }}
              />
            </Tooltip>
            <Tooltip title="Delete Cashier">
              <Button 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => handleDeleteCashier(record._id)} 
                size="small"
                style={{ 
                  borderRadius: '6px',
                  padding: '4px 12px',
                  height: '28px'
                }}
              />
            </Tooltip>
          </Space>
        );
      }
    },
  ], [isMobile, colors, token, handleViewCashier, handleEditCashier, handleDeleteCashier]);

  // =============================================
  // PERFORMANCE VIEW COMPONENT
  // =============================================

  const CashierPerformanceView = ({ cashier }) => {
    const metrics = calculatePerformanceMetrics();
    const [activePerformanceTab, setActivePerformanceTab] = useState('overview');

    return (
      <div>
        {/* Time Filter Card */}
        <DeviceAwareCard
          title="Performance Filter"
          style={{ marginBottom: layoutConfig.gap }}
          extra={
            dataTimestamp && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Updated: {dayjs(dataTimestamp).format('HH:mm:ss')}
              </Text>
            )
          }
        >
          <Row gutter={[layoutConfig.gap, layoutConfig.gap]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Text strong style={{ fontSize: layoutConfig.fontSize.body }}>
                Filter by:
              </Text>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select 
                value={timeFilter} 
                onChange={handleTimeFilterChange} 
                style={{ width: '100%' }}
                size={isMobile ? 'small' : 'middle'}
                suffixIcon={<CalendarOutlined />}
                popupMatchSelectWidth={false}
              >
                {TIME_RANGE_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    <Space>
                      {option.icon}
                      {option.label}
                    </Space>
                  </Option>
                ))}
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
        </DeviceAwareCard>

        {/* Performance Stats Grid */}
        <Row gutter={[layoutConfig.gap, layoutConfig.gap]} style={{ marginBottom: layoutConfig.gap }}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <ResponsiveStatCard
              title="Total Transactions"
              value={metrics.totalTransactions}
              icon={<ShoppingCartOutlined />}
              color={colors.purple}
              suffix="sales"
              loading={transactionsLoading}
            >
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Items sold: <strong style={{ color: colors.purple }}>{metrics.totalItemsSold}</strong>
              </Text>
            </ResponsiveStatCard>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6}>
            <ResponsiveStatCard
              title="Total Revenue"
              value={metrics.totalRevenue}
              prefix="KES"
              icon={<DollarOutlined />}
              color={colors.primary}
              loading={transactionsLoading}
            >
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Source: <Tag color={metrics.dataSource === 'server' ? 'success' : 'warning'} size="small">
                  {metrics.dataSource}
                </Tag>
              </Text>
            </ResponsiveStatCard>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6}>
            <ResponsiveStatCard
              title="Total Profit"
              value={metrics.totalProfit}
              prefix="KES"
              icon={<RiseOutlined />}
              color={colors.success}
              loading={transactionsLoading}
            >
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Margin: <strong style={{ color: colors.success }}>
                  {metrics.profitMargin.toFixed(1)}%
                </strong>
              </Text>
            </ResponsiveStatCard>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6}>
            <ResponsiveStatCard
              title="Performance Score"
              value={metrics.performanceScore}
              suffix="/100"
              icon={<TrophyOutlined />}
              color={colors.warning}
              loading={transactionsLoading}
            >
              <Rate 
                disabled 
                value={Math.ceil(metrics.performanceScore / 20)} 
                character={<StarOutlined />}
                style={{ fontSize: '14px' }}
              />
            </ResponsiveStatCard>
          </Col>
        </Row>

        {/* Tabs Navigation */}
        <div style={{ marginBottom: layoutConfig.gap }}>
          <Segmented
            value={activePerformanceTab}
            onChange={setActivePerformanceTab}
            options={[
              { 
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BarChartOutlined /> 
                    {!isMobile && 'Overview'}
                  </span>
                ), 
                value: 'overview' 
              },
              { 
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PieChartOutlined /> 
                    {!isMobile && 'Payments'}
                  </span>
                ), 
                value: 'payments' 
              },
              { 
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TransactionOutlined /> 
                    {!isMobile && 'Transactions'}
                    <Badge count={transactions.length} size="small" style={{ marginLeft: '4px' }} />
                  </span>
                ), 
                value: 'transactions' 
              },
            ]}
            block={isMobile}
            size={isMobile ? 'small' : 'middle'}
            style={{ 
              background: token.colorBgContainer,
              padding: '4px',
              borderRadius: '8px'
            }}
          />
        </div>

        {/* Tab Content */}
        {activePerformanceTab === 'overview' && (
          <Row gutter={[layoutConfig.gap, layoutConfig.gap]}>
            <Col xs={24} md={12}>
              <DeviceAwareCard title="Revenue & Cost Analysis">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    background: `${colors.primary}08`,
                    borderRadius: '8px',
                    marginBottom: '8px',
                    borderLeft: `4px solid ${colors.primary}`
                  }}>
                    <Flex vertical gap="small">
                      <Text style={{ fontWeight: '500', color: token.colorTextSecondary }}>Total Revenue</Text>
                      <Text style={{ fontSize: '12px', color: token.colorTextTertiary }}>
                        From {metrics.totalTransactions} transactions
                      </Text>
                    </Flex>
                    <Text strong style={{ 
                      color: colors.primary, 
                      fontSize: '20px', 
                      fontWeight: 'bold'
                    }}>
                      {CalculationUtils.formatCurrency(metrics.totalRevenue)}
                    </Text>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    background: `${colors.warning}08`,
                    borderRadius: '8px',
                    borderLeft: `4px solid ${colors.warning}`
                  }}>
                    <Flex vertical gap="small">
                      <Text style={{ fontWeight: '500', color: token.colorTextSecondary }}>Total Cost</Text>
                      <Text style={{ fontSize: '12px', color: token.colorTextTertiary }}>
                        For {metrics.totalItemsSold} items
                      </Text>
                    </Flex>
                    <Text strong style={{ 
                      color: colors.warning, 
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}>
                      {CalculationUtils.formatCurrency(metrics.totalCost)}
                    </Text>
                  </div>
                </Space>
              </DeviceAwareCard>
            </Col>
            
            <Col xs={24} md={12}>
              <DeviceAwareCard title="Profit Analysis">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    background: `${colors.success}08`,
                    borderRadius: '8px',
                    marginBottom: '8px',
                    borderLeft: `4px solid ${colors.success}`
                  }}>
                    <Flex vertical gap="small">
                      <Text style={{ fontWeight: '500', color: token.colorTextSecondary }}>Total Profit</Text>
                      <Text style={{ fontSize: '12px', color: token.colorTextTertiary }}>
                        Revenue - Cost
                      </Text>
                    </Flex>
                    <Text strong style={{ 
                      color: colors.success, 
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}>
                      {CalculationUtils.formatCurrency(metrics.totalProfit)}
                    </Text>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    background: `${CalculationUtils.getProfitColor(metrics.profitMargin)}08`,
                    borderRadius: '8px',
                    borderLeft: `4px solid ${CalculationUtils.getProfitColor(metrics.profitMargin)}`
                  }}>
                    <Flex vertical gap="small">
                      <Text style={{ fontWeight: '500', color: token.colorTextSecondary }}>Profit Margin</Text>
                      <Text style={{ fontSize: '12px', color: token.colorTextTertiary }}>
                        Percentage of revenue
                      </Text>
                    </Flex>
                    <Text strong style={{ 
                      color: CalculationUtils.getProfitColor(metrics.profitMargin), 
                      fontSize: '20px', 
                      fontWeight: 'bold'
                    }}>
                      {metrics.profitMargin.toFixed(1)}%
                    </Text>
                  </div>
                </Space>
              </DeviceAwareCard>
            </Col>
          </Row>
        )}

        {activePerformanceTab === 'payments' && (
          <DeviceAwareCard title="Payment Composition">
            <Row gutter={[layoutConfig.gap, layoutConfig.gap]}>
              <Col xs={24} md={12}>
                <Card
                  style={{ 
                    height: '100%',
                    background: `linear-gradient(135deg, ${colors.purple}15, ${colors.purple}08)`,
                    borderRadius: '12px',
                    border: `1px solid ${colors.purple}20`,
                  }}
                  bodyStyle={{ padding: '20px' }}
                >
                  <Flex vertical gap="middle">
                    <Flex justify="space-between" align="center">
                      <Flex align="center" gap="small">
                        <div style={{
                          background: `${colors.purple}20`,
                          borderRadius: '8px',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <MoneyCollectOutlined style={{ color: colors.purple, fontSize: '20px' }} />
                        </div>
                        <div>
                          <Text strong style={{ fontSize: '16px', color: token.colorTextHeading }}>
                            Cash Payments
                          </Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {metrics.cashTransactions} transactions
                          </Text>
                        </div>
                      </Flex>
                      <Tag color="purple" style={{ fontSize: '12px', fontWeight: '500' }}>
                        {metrics.cashPercentage.toFixed(1)}%
                      </Tag>
                    </Flex>
                    
                    <Text strong style={{ 
                      fontSize: isMobile ? '24px' : '28px', 
                      color: colors.purple,
                      textAlign: 'center'
                    }}>
                      {CalculationUtils.formatCurrency(metrics.totalCash)}
                    </Text>
                    
                    <Progress 
                      percent={metrics.cashPercentage} 
                      strokeColor={colors.purple}
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
                            Bank/Mpesa Payments
                          </Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {metrics.mpesaBankTransactions} transactions
                          </Text>
                        </div>
                      </Flex>
                      <Tag color="blue" style={{ fontSize: '12px', fontWeight: '500' }}>
                        {metrics.mpesaBankPercentage.toFixed(1)}%
                      </Tag>
                    </Flex>
                    
                    <Text strong style={{ 
                      fontSize: isMobile ? '24px' : '28px', 
                      color: colors.primary,
                      textAlign: 'center'
                    }}>
                      {CalculationUtils.formatCurrency(metrics.totalBankMpesa)}
                    </Text>
                    
                    <Progress 
                      percent={metrics.mpesaBankPercentage} 
                      strokeColor={colors.primary}
                      strokeWidth={8}
                      showInfo={false}
                    />
                  </Flex>
                </Card>
              </Col>
            </Row>
          </DeviceAwareCard>
        )}

        {activePerformanceTab === 'transactions' && (
          <DeviceAwareCard 
            title={`Recent Transactions (${transactions.length})`}
            extra={
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleManualRefresh}
                size="small"
                loading={transactionsLoading}
              >
                Refresh
              </Button>
            }
            loading={transactionsLoading}
          >
            {transactions.length > 0 ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {transactions.map(t => (
                  <TransactionItem key={t._id} transaction={t} screens={screens} colors={colors} />
                ))}
              </div>
            ) : (
              <Empty
                description="No transactions found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ 
                  padding: '40px 0',
                  background: token.colorBgLayout,
                  borderRadius: '8px'
                }}
              >
                <Button 
                  type="primary" 
                  onClick={handleManualRefresh}
                  loading={transactionsLoading}
                >
                  Refresh Transactions
                </Button>
              </Empty>
            )}
          </DeviceAwareCard>
        )}
      </div>
    );
  };

  // =============================================
  // MOBILE DRAWER
  // =============================================

  const PerformanceDrawer = () => (
    <Drawer
      title={
        <Flex vertical gap="small">
          <Flex align="center" gap="small">
            <UserOutlined style={{ color: colors.primary }} />
            <Text strong style={{ fontSize: '16px' }}>{viewingCashier?.name}</Text>
          </Flex>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {viewingCashier?.email}
          </Text>
        </Flex>
      }
      placement="right"
      onClose={() => setDrawerVisible(false)}
      open={drawerVisible}
      width={screens.width > 400 ? '90%' : '100%'}
      bodyStyle={{ 
        padding: '16px',
        paddingBottom: '80px'
      }}
      extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />}
            onClick={handleManualRefresh}
            size="small"
            loading={transactionsLoading}
          />
          <Button 
            icon={<CloseOutlined />}
            onClick={() => setDrawerVisible(false)}
            type="text"
            size="small"
          />
        </Space>
      }
    >
      {viewingCashier && <CashierPerformanceView cashier={viewingCashier} />}
    </Drawer>
  );

  // =============================================
  // MOBILE NAVIGATION BAR
  // =============================================

  const MobileNavBar = () => {
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
          <Col span={8} style={{ textAlign: 'center' }}>
            <Button
              type={mobileView === 'list' ? 'primary' : 'text'}
              icon={<MenuOutlined />}
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
          <Col span={8} style={{ textAlign: 'center' }}>
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
          <Col span={8} style={{ textAlign: 'center' }}>
            <Button
              type="text"
              icon={<UserAddOutlined />}
              onClick={handleAddCashier}
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
              Add
            </Button>
          </Col>
        </Row>
      </Footer>
    );
  };

  // =============================================
  // MAIN COMPONENT RENDER
  // =============================================

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Content style={{ 
        padding: isMobile ? '16px' : '24px',
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%',
        paddingBottom: isMobile ? '80px' : '24px'
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
                  <TeamOutlined style={{ 
                    color: 'white', 
                    fontSize: isMobile ? '24px' : '28px'
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Title level={isMobile ? 4 : 3} style={{ margin: 0, lineHeight: 1.2 }}>
                    Cashier Management
                  </Title>
                  <Text type="secondary" style={{ 
                    fontSize: layoutConfig.fontSize.subtitle,
                    display: 'block',
                    marginTop: '4px'
                  }}>
                    Manage your cashiers and monitor performance metrics across all devices
                  </Text>
                </div>
              </Flex>
              
              {/* Search and Controls */}
              <Flex 
                gap="middle" 
                wrap="wrap" 
                justify="space-between" 
                style={{ marginTop: isMobile ? '12px' : '16px' }}
              >
                <Input
                  placeholder="Search cashiers by name, email or phone..."
                  allowClear
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{ 
                    width: isMobile ? '100%' : 300,
                    maxWidth: '100%',
                    borderRadius: '8px'
                  }}
                  size={isMobile ? 'middle' : 'large'}
                  prefix={<SearchOutlined />}
                  suffix={
                    <Tooltip title="Search cashiers">
                      <FilterOutlined style={{ color: token.colorTextSecondary }} />
                    </Tooltip>
                  }
                />
                
                <Flex gap="small" wrap="wrap">
                  <Select
                    placeholder="Status"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    style={{ 
                      width: isMobile ? '100%' : 120,
                      maxWidth: '100%'
                    }}
                    size={isMobile ? 'middle' : 'large'}
                  >
                    <Option value="all">All Status</Option>
                    <Option value="active">Active</Option>
                    <Option value="inactive">Inactive</Option>
                  </Select>
                  
                  <Tooltip title="Refresh Cashiers">
                    <Button 
                      icon={<ReloadOutlined spin={loading} />}
                      onClick={fetchCashiers}
                      loading={loading}
                      size={isMobile ? 'middle' : 'large'}
                      type="primary"
                      style={{ 
                        background: colors.primary, 
                        borderColor: colors.primary,
                        minWidth: isMobile ? '40px' : 'auto'
                      }}
                    >
                      {!isMobile && 'Refresh'}
                    </Button>
                  </Tooltip>
                  
                  <Button 
                    type="primary" 
                    icon={<UserAddOutlined />} 
                    onClick={handleAddCashier}
                    size={isMobile ? 'middle' : 'large'}
                    style={{ 
                      background: `linear-gradient(45deg, ${colors.primary}, ${colors.success})`,
                      border: 'none',
                      minWidth: isMobile ? '40px' : 'auto'
                    }}
                  >
                    {!isMobile && 'Add Cashier'}
                  </Button>
                </Flex>
              </Flex>
              
              {/* Stats Summary */}
              <Row gutter={[8, 8]} style={{ marginTop: '16px' }}>
                <Col xs={12} sm={6}>
                  <Card size="small" style={{ textAlign: 'center', borderRadius: '8px' }}>
                    <Statistic 
                      title={<Text style={{ fontSize: isMobile ? '11px' : '12px' }}>Total Cashiers</Text>}
                      value={cashiers.length} 
                      valueStyle={{ color: colors.primary, fontSize: isMobile ? '16px' : '20px' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" style={{ textAlign: 'center', borderRadius: '8px' }}>
                    <Statistic 
                      title={<Text style={{ fontSize: isMobile ? '11px' : '12px' }}>Active</Text>}
                      value={cashiers.filter(c => c.status === 'active').length} 
                      valueStyle={{ color: colors.success, fontSize: isMobile ? '16px' : '20px' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" style={{ textAlign: 'center', borderRadius: '8px' }}>
                    <Statistic 
                      title={<Text style={{ fontSize: isMobile ? '11px' : '12px' }}>Inactive</Text>}
                      value={cashiers.filter(c => c.status === 'inactive').length} 
                      valueStyle={{ color: colors.warning, fontSize: isMobile ? '16px' : '20px' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" style={{ textAlign: 'center', borderRadius: '8px' }}>
                    <Statistic 
                      title={<Text style={{ fontSize: isMobile ? '11px' : '12px' }}>Showing</Text>}
                      value={filteredCashiers.length} 
                      suffix={`/ ${cashiers.length}`}
                      valueStyle={{ color: colors.purple, fontSize: isMobile ? '16px' : '20px' }}
                    />
                  </Card>
                </Col>
              </Row>
            </Flex>
          }
          extra={null}
        />

        {/* Mobile Navigation */}
        {isMobile && <MobileNavBar />}

        {/* Content based on mobile view */}
        {!isMobile || mobileView === 'list' ? (
          <Spin 
            spinning={loading} 
            tip={isMobile ? "Loading..." : "Loading cashier data..."}
            size="large"
            style={{ minHeight: '200px' }}
          >
            <AdaptiveTable 
              columns={columns}
              dataSource={filteredCashiers}
              loading={loading}
              onRow={(record) => ({
                onClick: () => {
                  if (isMobile) {
                    handleViewCashier(record);
                  }
                },
                style: { 
                  cursor: isMobile ? 'pointer' : 'default',
                  transition: 'all 0.2s ease'
                }
              })}
              locale={{
                emptyText: (
                  <Empty
                    description="No cashiers found"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )
              }}
            />
          </Spin>
        ) : (
          <div style={{ padding: '16px' }}>
            <DeviceAwareCard title="Quick Stats">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="Total Cashiers"
                    value={cashiers.length}
                    valueStyle={{ color: colors.primary }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Active"
                    value={cashiers.filter(c => c.status === 'active').length}
                    valueStyle={{ color: colors.success }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Inactive"
                    value={cashiers.filter(c => c.status === 'inactive').length}
                    valueStyle={{ color: colors.warning }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Showing"
                    value={filteredCashiers.length}
                    suffix={`/ ${cashiers.length}`}
                    valueStyle={{ color: colors.purple }}
                  />
                </Col>
              </Row>
            </DeviceAwareCard>
            
            <DeviceAwareCard title="Recent Activity" style={{ marginTop: '16px' }}>
              <List
                dataSource={cashiers.slice(0, 5)}
                renderItem={(cashier) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={cashier.name}
                      description={
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {cashier.email}
                          </Text>
                          <div style={{ marginTop: '4px' }}>
                            <Tag color={cashier.status === 'active' ? 'success' : 'warning'} size="small">
                              {cashier.status}
                            </Tag>
                            {cashier.lastLogin && (
                              <Text type="secondary" style={{ fontSize: '11px', marginLeft: '8px' }}>
                                Last login: {dayjs(cashier.lastLogin).format('MMM D')}
                              </Text>
                            )}
                          </div>
                        </div>
                      }
                    />
                    <Button 
                      size="small" 
                      type="link"
                      onClick={() => handleViewCashier(cashier)}
                    >
                      View
                    </Button>
                  </List.Item>
                )}
              />
            </DeviceAwareCard>
          </div>
        )}

        {/* Device Status Indicator */}
        {isMobile && (
          <div style={{ 
            position: 'fixed', 
            bottom: '80px', 
            right: '16px',
            zIndex: 1000
          }}>
            <FloatButton.Group
              trigger="click"
              type="primary"
              icon={<SettingOutlined />}
              tooltip="Quick Actions"
            >
              <FloatButton 
                icon={<ReloadOutlined />}
                onClick={fetchCashiers}
                tooltip="Refresh List"
              />
              <FloatButton 
                icon={<FilterOutlined />}
                onClick={() => setMobileView(mobileView === 'list' ? 'stats' : 'list')}
                tooltip="Toggle View"
              />
              <FloatButton.BackTop visibilityHeight={0} tooltip="Back to Top" />
            </FloatButton.Group>
          </div>
        )}

        {/* Add/Edit Cashier Modal - UPDATED WITH PASSWORD FIELD */}
        <Modal
          title={
            <Flex align="center" gap="small">
              {editingCashier ? (
                <>
                  <EditOutlined style={{ color: colors.primary }} />
                  <span>Edit Cashier Details</span>
                </>
              ) : (
                <>
                  <UserAddOutlined style={{ color: colors.success }} />
                  <span>Add New Cashier</span>
                </>
              )}
            </Flex>
          }
          open={isModalOpen}
          onCancel={() => { 
            setIsModalOpen(false); 
            form.resetFields(); 
            setPasswordValue('');
          }}
          footer={null}
          destroyOnClose
          width={isMobile ? '90%' : 550}
          centered
          style={{ borderRadius: '12px' }}
          bodyStyle={{ padding: isMobile ? '16px' : '24px' }}
        >
          <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleSubmit}
            initialValues={{
              name: '',
              email: '',
              phone: '',
              password: ''
            }}
          >
            <Form.Item 
              label="Full Name"
              name="name" 
              rules={[{ required: true, message: 'Please enter cashier name' }]}
            >
              <Input 
                placeholder="Enter cashier name" 
                size="large"
                prefix={<UserOutlined />}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
            
            <Form.Item 
              label="Email"
              name="email" 
              rules={[
                { required: true, message: 'Please enter email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input 
                placeholder="Enter email address" 
                size="large"
                prefix={<MailOutlined />}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
            
            <Form.Item 
              label="Phone Number"
              name="phone"
            >
              <Input 
                placeholder="Enter phone number (optional)" 
                size="large"
                prefix={<PhoneOutlined />}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
            
            {/* Password Field - NEW */}
            <Form.Item 
              label={
                <Flex align="center" gap="small">
                  <LockOutlined />
                  <span>Password {!editingCashier && <Text type="danger">*</Text>}</span>
                  {editingCashier && (
                    <Tag color="orange" style={{ marginLeft: 8 }}>
                      Leave blank to keep current
                    </Tag>
                  )}
                </Flex>
              }
              name="password"
              rules={[
                { 
                  required: !editingCashier, 
                  message: 'Password is required for new cashiers' 
                },
                { 
                  min: 6, 
                  message: 'Password must be at least 6 characters' 
                }
              ]}
              validateTrigger="onBlur"
            >
              <Input.Password
                placeholder={editingCashier ? "Enter new password (optional)" : "Enter password"}
                size="large"
                prefix={<KeyOutlined />}
                iconRender={(visible) => visible ? <EyeOutlined /> : <EyeOutlined />}
                visibilityToggle={{ 
                  visible: showPassword, 
                  onVisibleChange: setShowPassword 
                }}
                onChange={(e) => setPasswordValue(e.target.value)}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
            
            {/* Password Strength Indicator */}
            {passwordValue && (
              <div style={{ marginBottom: 24 }}>
                <PasswordStrengthIndicator password={passwordValue} />
              </div>
            )}
            
            {/* Password Tips */}
            <Alert
              message="Password Requirements"
              description={
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                  <li>Minimum 6 characters</li>
                  <li>For better security, use a mix of letters, numbers, and special characters</li>
                  {editingCashier && <li>Leave blank to keep the current password unchanged</li>}
                </ul>
              }
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: 24, background: token.colorInfoBg, border: 'none' }}
            />
            
            <Form.Item style={{ marginTop: 32 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading} 
                block
                size="large"
                style={{ 
                  background: `linear-gradient(45deg, ${colors.primary}, ${colors.success})`,
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '500',
                  height: '48px',
                  fontSize: '16px',
                }}
              >
                {editingCashier ? (passwordValue ? 'Update Cashier with New Password' : 'Update Cashier') : 'Add Cashier with Password'}
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* Desktop Performance Modal */}
        {!isMobile && (
          <Modal
            title={
              <Flex align="center" gap="middle" style={{ paddingRight: 20 }}>
                <div style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.purple})`,
                  borderRadius: '10px',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <BarChartOutlined style={{ color: 'white', fontSize: '20px' }} />
                </div>
                <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ 
                    fontSize: '18px',
                    color: token.colorTextHeading,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {viewingCashier?.name}
                  </Text>
                  <Text type="secondary" style={{ 
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <MailOutlined />
                    {viewingCashier?.email}
                  </Text>
                </Flex>
              </Flex>
            }
            open={isViewModalOpen}
            onCancel={() => {
              console.log('❌ Closing performance view');
              setIsViewModalOpen(false);
              setCashierPerformance({});
              setTransactions([]);
            }}
            footer={[
              <Button 
                key="refresh" 
                icon={<ReloadOutlined />}
                onClick={handleManualRefresh}
                loading={transactionsLoading}
                style={{ borderRadius: '8px' }}
              >
                Refresh
              </Button>,
              <Button 
                key="close" 
                onClick={() => {
                  console.log('❌ Closing performance view');
                  setIsViewModalOpen(false);
                  setCashierPerformance({});
                  setTransactions([]);
                }}
                style={{ borderRadius: '8px' }}
                size="middle"
              >
                Close
              </Button>
            ]}
            width="90%"
            style={{ 
              top: 20,
              maxWidth: '1200px',
              borderRadius: '12px',
            }}
            bodyStyle={{ 
              padding: '24px',
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto',
            }}
          >
            <Spin spinning={transactionsLoading} size="large" tip="Loading performance data...">
              {viewingCashier && <CashierPerformanceView cashier={viewingCashier} />}
            </Spin>
          </Modal>
        )}

        {/* Mobile Performance Drawer */}
        <PerformanceDrawer />
      </Content>
    </Layout>
  );
};

export default CashierManagement;