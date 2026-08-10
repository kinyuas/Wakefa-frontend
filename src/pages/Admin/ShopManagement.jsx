import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  message, 
  Card, 
  Spin, 
  Form, 
  Input,  // Keep only one Input import
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
  Drawer,
  Dropdown,
  Popover,
  Avatar,
  Segmented,
  FloatButton,
  Flex,
  Layout,
  Empty,
  Popconfirm  // Add Popconfirm if used in the component
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
  BankOutlined,
  BarcodeOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  FilterOutlined,
  SearchOutlined,
  MenuOutlined,
  MobileOutlined,
  TabletOutlined,
  DesktopOutlined,
  ExportOutlined,
  CloudDownloadOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  WalletOutlined,
  TeamOutlined,
  StockOutlined,
  CheckOutlined,
  CloseOutlined,
  CrownOutlined,
  FireOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  CompassOutlined,
  GlobalOutlined,
  HomeOutlined,
  ShopFilled
} from '@ant-design/icons';
import { shopAPI, unifiedAPI, productAPI } from '../../services/api';
import { CalculationUtils } from '../../utils/calculationUtils';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';

dayjs.extend(advancedFormat);

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;
const { useToken } = theme;
const { Header, Content, Footer } = Layout;
const { Search } = Input; // This line is correct - it extracts Search from Input

// AI-Enhanced Responsive Components
const DeviceAwareCard = ({ children, title, extra, style, ...props }) => {
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
              <ShopFilled style={{ 
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
      {...props}
    >
      {children}
    </Card>
  );
};

const ResponsiveStatCard = ({ title, value, prefix, suffix, icon, color, trend, children }) => {
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

const AdaptiveTable = ({ columns, data, loading, ...props }) => {
  const screens = useBreakpoint();
  const { token } = useToken();
  
  const adaptiveColumns = useMemo(() => {
    if (!screens.md) {
      return columns.map(col => ({
        ...col,
        ellipsis: true,
        width: col.dataIndex === 'action' ? 120 : undefined,
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
                  label: 'Edit Shop',
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
          >
            <Button type="text" icon={<MenuOutlined />} size="small" />
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
          showTotal: (total) => `Total ${total} shops`
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
        '&:hover': {
          borderColor: token.colorPrimary,
          boxShadow: `0 2px 8px ${token.colorPrimary}15`
        }
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ width: '100%' }}>
        <Flex vertical={screens.xs} gap={screens.xs ? 'small' : 'middle'} justify="space-between">
          <Flex vertical gap="small" style={{ flex: 1, minWidth: 0 }}>
            <Flex align="center" gap="small" wrap="wrap">
              <BarcodeOutlined style={{ color: colors.primary, fontSize: '14px' }} />
              <Text strong style={{ 
                fontSize: screens.xs ? '13px' : '14px',
                color: token.colorTextHeading,
                flex: 1,
                minWidth: 0
              }}>
                {transaction.items?.length || 0} items sold
              </Text>
              {transaction.paymentMethod === 'credit' && (
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
                  CREDIT
                </Tag>
              )}
            </Flex>
            
            <Flex align="center" gap="small" wrap="wrap">
              <CalendarOutlined style={{ fontSize: '11px', color: token.colorTextTertiary }} />
              <Text style={{ 
                fontSize: '11px', 
                color: token.colorTextTertiary,
              }}>
                {dayjs(transaction.saleDate || transaction.transactionDate).format('MMM D, YYYY h:mm A')}
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
              KES {transaction.totalAmount?.toLocaleString('en-KE', { minimumFractionDigits: 2 }) || '0.00'}
            </Text>
            <Tag 
              color={
                transaction.paymentMethod === 'cash' ? 'green' :
                transaction.paymentMethod === 'mpesa_bank' ? 'blue' :
                transaction.paymentMethod === 'credit' ? 'orange' : 'default'
              }
              style={{ 
                fontSize: '10px',
                margin: 0
              }}
            >
              {transaction.paymentMethod?.toUpperCase() || 'CASH'} Sale
            </Tag>
          </Flex>
        </Flex>
      </div>
    </div>
  );
};

// Shop Management Main Component
const ShopManagement = () => {
  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('shops');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [drawerVisible, setDrawerVisible] = useState(false);
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

  // Responsive table columns
  const columns = useMemo(() => [
    { 
      title: 'Shop', 
      dataIndex: 'name', 
      key: 'name',
      fixed: isMobile ? false : 'left',
      width: isMobile ? 120 : 200,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <Flex align="center" gap="small">
          <Avatar 
            size={isMobile ? 32 : 40}
            style={{ 
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.purple})`,
              flexShrink: 0
            }}
            icon={<ShopOutlined />}
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
              <EnvironmentOutlined style={{ fontSize: '10px' }} />
              {record.location}
            </Text>
          </div>
        </Flex>
      )
    },
    ...(isMobile ? [] : [
      { 
        title: 'Location', 
        dataIndex: 'location', 
        key: 'location', 
        width: 150,
        sorter: (a, b) => a.location.localeCompare(b.location),
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
        render: () => (
          <Badge 
            status="success" 
            text="Active"
            style={{ fontSize: '12px' }}
          />
        ) 
      },
      { 
        title: 'Last Activity', 
        key: 'activity', 
        width: 150,
        render: () => (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {dayjs().subtract(Math.floor(Math.random() * 30), 'day').format('MMM D')}
          </Text>
        )
      },
    ]),
    { 
      title: 'Action', 
      key: 'action',
      width: isMobile ? 80 : 200,
      fixed: isMobile ? 'right' : false,
      align: 'center',
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
                    onClick: () => handleViewShop(record)
                  },
                  {
                    key: 'edit',
                    label: 'Edit Shop',
                    icon: <EditOutlined />,
                    onClick: () => handleEditShop(record)
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'delete',
                    label: 'Delete',
                    icon: <DeleteOutlined />,
                    danger: true,
                    onClick: () => handleDeleteShop(record._id)
                  }
                ]
              }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button 
                type="text" 
                icon={<MenuOutlined />} 
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
                onClick={() => handleViewShop(record)} 
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
            <Tooltip title="Edit Shop">
              <Button 
                icon={<EditOutlined />} 
                onClick={() => handleEditShop(record)} 
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
            <Tooltip title="Delete Shop">
              <Button 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => handleDeleteShop(record._id)} 
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
  ], [isMobile, colors, token]);

  // Fetch functions
  const fetchShops = async () => {
    setLoading(true);
    try {
      const shopsData = await shopAPI.getAll();
      setShops(shopsData);
      setFilteredShops(shopsData);
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

  // Search and filter shops
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    if (!value.trim()) {
      setFilteredShops(shops);
      return;
    }
    
    const searchValue = value.toLowerCase();
    const filtered = shops.filter(shop => 
      shop.name.toLowerCase().includes(searchValue) ||
      shop.location.toLowerCase().includes(searchValue)
    );
    setFilteredShops(filtered);
  }, [shops]);

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
      await Promise.all([
        fetchShopProducts(shop._id),
        fetchShopPerformance(shop._id, timeFilter, customDateRange),
        fetchShopTransactions(shop._id, timeFilter, customDateRange)
      ]);
      
      if (isMobile) {
        setDrawerVisible(true);
      } else {
        setIsViewModalOpen(true);
      }
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
      icon: <ExclamationCircleOutlined />,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      className: isMobile ? 'mobile-confirm-modal' : '',
      width: isMobile ? '80%' : 520,
      onOk: async () => {
        try {
          setLoading(true);
          await shopAPI.delete(id);
          setShops(shops.filter(shop => shop._id !== id));
          setFilteredShops(filteredShops.filter(shop => shop._id !== id));
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
        setFilteredShops(filteredShops.map(s => s._id === editingShop._id ? response.data : s));
        message.success('Shop updated successfully');
      } else {
        response = await shopAPI.create(shopData);
        setShops([...shops, response.data]);
        setFilteredShops([...filteredShops, response.data]);
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
    const serverStats = shopPerformance;
    
    const totalRevenue = CalculationUtils.safeNumber(serverStats.totalRevenue) || 
                       CalculationUtils.calculateRevenue(transactions);
    
    const totalCOGS = CalculationUtils.safeNumber(serverStats.costOfGoodsSold) || 
                     CalculationUtils.calculateCOGS(transactions, products);
    
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit;
    
    const paymentComposition = serverStats.paymentComposition || 
                             CalculationUtils.calculatePaymentComposition(transactions);

    return {
      totalSales: transactions.length,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalItemsSold: transactions.reduce((sum, t) => 
        sum + CalculationUtils.safeNumber(t.itemsCount || (t.items ? t.items.length : 0)), 0),
      
      totalCOGS: parseFloat(totalCOGS.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      expenses: 0,
      
      paymentComposition: paymentComposition,
      totalCash: paymentComposition.cash,
      totalBankMpesa: paymentComposition.mpesa_bank,
      cashPercentage: paymentComposition.cashPercentage,
      bankMpesaPercentage: paymentComposition.mpesaBankPercentage,
      
      cashTransactions: transactions.filter(t => 
        t.paymentMethod === 'cash' || 
        (t.paymentSplit && t.paymentSplit.cash > 0)
      ).length,
      
      bankMpesaTransactions: transactions.filter(t => 
        ['mpesa', 'bank', 'mpesa_bank'].includes(t.paymentMethod) ||
        (t.paymentSplit && t.paymentSplit.mpesa_bank > 0)
      ).length,
      
      dataSource: serverStats.totalRevenue ? 'server' : 'local'
    };
  };

  // Responsive Shop Performance View
  const ShopPerformanceView = ({ shop }) => {
    const metrics = calculatePerformanceMetrics();
    const [activePerformanceTab, setActivePerformanceTab] = useState('overview');

    return (
      <div>
        {/* Time Filter Card */}
        <DeviceAwareCard
          title="Performance Filter"
          style={{ marginBottom: layoutConfig.gap }}
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
        </DeviceAwareCard>

        {/* Performance Stats Grid */}
        <Row gutter={[layoutConfig.gap, layoutConfig.gap]} style={{ marginBottom: layoutConfig.gap }}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <ResponsiveStatCard
              title="Total Sales"
              value={metrics.totalSales}
              icon={<ShoppingCartOutlined />}
              color={colors.purple}
              suffix="sales"
              trend={{ direction: 'up', value: 12.5 }}
            >
              <Progress 
                percent={75} 
                strokeColor={colors.purple}
                size="small" 
                showInfo={false}
              />
            </ResponsiveStatCard>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6}>
            <ResponsiveStatCard
              title="Total Revenue"
              value={metrics.totalRevenue}
              prefix="KES"
              icon={<DollarOutlined />}
              color={colors.primary}
              trend={{ direction: 'up', value: 8.3 }}
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
              title="Cost of Goods"
              value={metrics.totalCOGS}
              prefix="KES"
              icon={<CalculatorOutlined />}
              color={colors.warning}
              trend={{ direction: 'down', value: 3.2 }}
            >
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Using: CalculationUtils
              </Text>
            </ResponsiveStatCard>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6}>
            <ResponsiveStatCard
              title="Net Profit"
              value={metrics.netProfit}
              prefix="KES"
              icon={<RiseOutlined />}
              color={colors.success}
              trend={{ direction: 'up', value: 15.7 }}
            >
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Gross: {CalculationUtils.formatCurrency(metrics.grossProfit)}
              </Text>
            </ResponsiveStatCard>
          </Col>
        </Row>

        {/* Tabs Navigation - Enhanced for Mobile */}
        <div style={{ marginBottom: layoutConfig.gap }}>
          <Segmented
            value={activePerformanceTab}
            onChange={setActivePerformanceTab}
            options={[
              { label: <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChartOutlined /> {!isMobile && 'Overview'}
              </span>, value: 'overview' },
              { label: <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PieChartOutlined /> {!isMobile && 'Payments'}
              </span>, value: 'payments' },
              { label: <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingCartOutlined /> {!isMobile && 'Transactions'}
                <Badge count={transactions.length} size="small" style={{ marginLeft: '4px' }} />
              </span>, value: 'transactions' },
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
                        From {metrics.totalSales} sales
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
                      <Text style={{ fontWeight: '500', color: token.colorTextSecondary }}>Cost of Goods</Text>
                      <Text style={{ fontSize: '12px', color: token.colorTextTertiary }}>
                        For {metrics.totalItemsSold} items
                      </Text>
                    </Flex>
                    <Text strong style={{ 
                      color: colors.warning, 
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}>
                      {CalculationUtils.formatCurrency(metrics.totalCOGS)}
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
                      <Text style={{ fontWeight: '500', color: token.colorTextSecondary }}>Gross Profit</Text>
                      <Text style={{ fontSize: '12px', color: token.colorTextTertiary }}>
                        Revenue - COGS
                      </Text>
                    </Flex>
                    <Text strong style={{ 
                      color: colors.success, 
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}>
                      {CalculationUtils.formatCurrency(metrics.grossProfit)}
                    </Text>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    background: `${CalculationUtils.getProfitColor(metrics.netProfit)}08`,
                    borderRadius: '8px',
                    borderLeft: `4px solid ${CalculationUtils.getProfitColor(metrics.netProfit)}`
                  }}>
                    <Flex vertical gap="small">
                      <Text style={{ fontWeight: '500', color: token.colorTextSecondary }}>Net Profit</Text>
                      <Text style={{ fontSize: '12px', color: token.colorTextTertiary }}>
                        No expenses for shop view
                      </Text>
                    </Flex>
                    <Text strong style={{ 
                      color: CalculationUtils.getProfitColor(metrics.netProfit), 
                      fontSize: '20px', 
                      fontWeight: 'bold'
                    }}>
                      {CalculationUtils.formatCurrency(metrics.netProfit)}
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
                      fontSize: isMobile ? '28px' : '32px', 
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
                            {metrics.bankMpesaTransactions} transactions
                          </Text>
                        </div>
                      </Flex>
                      <Tag color="blue" style={{ fontSize: '12px', fontWeight: '500' }}>
                        {metrics.bankMpesaPercentage.toFixed(1)}%
                      </Tag>
                    </Flex>
                    
                    <Text strong style={{ 
                      fontSize: isMobile ? '28px' : '32px', 
                      color: colors.primary,
                      textAlign: 'center'
                    }}>
                      {CalculationUtils.formatCurrency(metrics.totalBankMpesa)}
                    </Text>
                    
                    <Progress 
                      percent={metrics.bankMpesaPercentage} 
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
            loading={transactionsLoading}
          >
            {transactions.length > 0 ? (
              <List 
                dataSource={transactions} 
                renderItem={t => <TransactionItem transaction={t} screens={screens} colors={colors} />}
                pagination={{ 
                  pageSize: isMobile ? 5 : 10,
                  size: isMobile ? 'small' : 'default',
                  showSizeChanger: !isMobile,
                  simple: isMobile,
                  style: { marginTop: 24 }
                }}
              />
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
                  onClick={() => fetchShopTransactions(shop._id, timeFilter, customDateRange)}
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

  // Mobile Drawer for Shop Performance
  const PerformanceDrawer = () => (
    <Drawer
      title={
        <Flex vertical gap="small">
          <Flex align="center" gap="small">
            <ShopOutlined style={{ color: colors.primary }} />
            <Text strong style={{ fontSize: '16px' }}>{viewingShop?.name}</Text>
          </Flex>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {viewingShop?.location}
          </Text>
        </Flex>
      }
      placement="right"
      onClose={() => setDrawerVisible(false)}
      open={drawerVisible}
      width={screens.width > 400 ? '90%' : '100%'}
      bodyStyle={{ 
        padding: '16px',
        paddingBottom: '80px' // Space for any bottom navigation
      }}
      extra={
        <Button 
          icon={<CloseOutlined />}
          onClick={() => setDrawerVisible(false)}
          type="text"
          size="small"
        />
      }
    >
      {viewingShop && <ShopPerformanceView shop={viewingShop} />}
    </Drawer>
  );

  // Main component return
  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Content style={{ 
        padding: layoutConfig.padding,
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%'
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
                  <ShopFilled style={{ 
                    color: 'white', 
                    fontSize: isMobile ? '24px' : '28px'
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Title level={isMobile ? 4 : 3} style={{ margin: 0, lineHeight: 1.2 }}>
                    Shop Management
                  </Title>
                  <Text type="secondary" style={{ 
                    fontSize: layoutConfig.fontSize.subtitle,
                    display: 'block',
                    marginTop: '4px'
                  }}>
                    Manage your shops and monitor performance metrics across all devices
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
                <Search
                  placeholder="Search shops by name or location..."
                  allowClear
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  onSearch={handleSearch}
                  style={{ 
                    width: isMobile ? '100%' : 300,
                    maxWidth: '100%'
                  }}
                  size={isMobile ? 'middle' : 'large'}
                  prefix={<SearchOutlined />}
                />
                
                <Flex gap="small" wrap="wrap">
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={fetchShops}
                    loading={loading}
                    size={isMobile ? 'middle' : 'large'}
                  >
                    {!isMobile && 'Refresh'}
                  </Button>
                  
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={handleAddShop}
                    size={isMobile ? 'middle' : 'large'}
                    style={{ 
                      background: `linear-gradient(45deg, ${colors.primary}, ${colors.success})`,
                      border: 'none'
                    }}
                  >
                    {!isMobile && 'Add New Shop'}
                  </Button>
                </Flex>
              </Flex>
            </Flex>
          }
          extra={null}
        />

        {/* Shops Table */}
        <Spin 
          spinning={loading} 
          tip={isMobile ? "Loading..." : "Loading shop data..."}
          size="large"
          style={{ minHeight: '200px' }}
        >
          <AdaptiveTable 
            columns={columns}
            dataSource={filteredShops}
            loading={loading}
            onRow={(record) => ({
              onClick: () => {
                if (isMobile) {
                  // On mobile, clicking row opens performance view
                  handleViewShop(record);
                }
              },
              style: { 
                cursor: isMobile ? 'pointer' : 'default',
                transition: 'all 0.2s ease'
              }
            })}
          />
        </Spin>

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
              <FloatButton.BackTop visibilityHeight={0} />
            </FloatButton.Group>
          </div>
        )}

        {/* Add/Edit Shop Modal */}
        <Modal
          title={
            <Flex align="center" gap="small">
              {editingShop ? (
                <>
                  <EditOutlined style={{ color: colors.primary }} />
                  <span>Edit Shop Details</span>
                </>
              ) : (
                <>
                  <PlusOutlined style={{ color: colors.success }} />
                  <span>Add New Shop</span>
                </>
              )}
            </Flex>
          }
          open={isModalOpen}
          onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
          footer={null}
          destroyOnClose
          width={isMobile ? '90%' : 520}
          centered
          style={{ borderRadius: '12px' }}
          bodyStyle={{ padding: isMobile ? '16px' : '24px' }}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item 
              label="Shop Name"
              name="name" 
              rules={[{ required: true, message: 'Please enter shop name' }]}
            >
              <Input 
                placeholder="Enter shop name" 
                size="large"
                prefix={<ShopOutlined />}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
            <Form.Item 
              label="Location"
              name="location" 
              rules={[{ required: true, message: 'Please enter location' }]}
            >
              <Input 
                placeholder="Enter location" 
                size="large"
                prefix={<EnvironmentOutlined />}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
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
                {editingShop ? 'Update Shop' : 'Add Shop'}
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
                    {viewingShop?.name}
                  </Text>
                  <Text type="secondary" style={{ 
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <EnvironmentOutlined />
                    {viewingShop?.location}
                  </Text>
                </Flex>
              </Flex>
            }
            open={isViewModalOpen}
            onCancel={() => setIsViewModalOpen(false)}
            footer={[
              <Button 
                key="close" 
                onClick={() => setIsViewModalOpen(false)}
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
            <Spin spinning={loading || productsLoading} size="large">
              {viewingShop && <ShopPerformanceView shop={viewingShop} />}
            </Spin>
          </Modal>
        )}

        {/* Mobile Performance Drawer */}
        <PerformanceDrawer />
      </Content>
    </Layout>
  );
};

export default ShopManagement;