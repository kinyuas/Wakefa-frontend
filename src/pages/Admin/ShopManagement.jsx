// src/pages/Admin/ShopManagement.jsx
// Shop management + per-shop performance view.
// - Recomputes COGS from transactions (item-level fallback → products[] lookup)
// - Converts period keyword → real startDate/endDate (backend ignores `period`)
// - Responsive across mobile / tablet / desktop
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table, Button, Modal, message, Card, Spin, Form, Input, Space, Tag,
  Row, Col, Select, DatePicker, List, Tooltip, Badge, Progress,
  Alert, Typography, Grid, theme, Drawer, Dropdown, Avatar, Segmented,
  FloatButton, Flex, Layout, Empty
} from 'antd';
import {
  ShopOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  BarChartOutlined, DollarOutlined, ShoppingCartOutlined, CalendarOutlined,
  ExclamationCircleOutlined, EnvironmentOutlined,
  RiseOutlined, FallOutlined, CalculatorOutlined,
  BarcodeOutlined, ReloadOutlined,
  SearchOutlined, MenuOutlined, MobileOutlined, SettingOutlined,
  PieChartOutlined, CloseOutlined, ShopFilled
} from '@ant-design/icons';
import { shopAPI, unifiedAPI, productAPI } from '../../services/api';
import { CalculationUtils } from '../../utils/calculationUtils';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';

dayjs.extend(advancedFormat);

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;
const { useToken } = theme;
const { Content } = Layout;
const { Search } = Input;

// =============================================
// SAFE HELPER: Normalize a shop object
// =============================================
const normalizeShop = (s) => {
  if (!s || typeof s !== 'object') return null;
  return {
    _id: s._id || s.id || Math.random().toString(36),
    name: String(s.name || 'Unnamed Shop'),
    location: String(s.location || 'Unknown Location'),
    status: s.status || 'active',
    createdAt: s.createdAt || null,
    ...s
  };
};

// =============================================
// PERIOD → DATE RANGE CONVERTER
// The backend only understands startDate/endDate — not a `period` keyword.
// This maps every UI filter option to real ISO dates.
// =============================================
const periodToDateRange = (period, customRange = null) => {
  // Custom range has absolute priority
  if (period === 'custom' && customRange?.[0] && customRange?.[1]) {
    return [customRange[0], customRange[1]];
  }

  const now = dayjs();
  const end = now.endOf('day');

  switch (period) {
    case 'daily':
      return [now.startOf('day'), end];
    case 'weekly':
      return [now.subtract(7, 'days').startOf('day'), end];
    case 'monthly':
      return [now.subtract(30, 'days').startOf('day'), end];
    case 'annually':
      return [now.subtract(365, 'days').startOf('day'), end];
    case 'all':
      return null;                 // no date filter — backend returns everything
    default:
      return [now.subtract(30, 'days').startOf('day'), end];
  }
};

// =============================================
// RESPONSIVE CARD (device-aware)
// =============================================
const DeviceAwareCard = ({ children, title, extra, style, ...props }) => {
  const screens = useBreakpoint();
  const { token } = useToken();

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: screens.xs ? 'wrap' : 'nowrap' }}>
          {typeof title === 'string' ? (
            <>
              <ShopFilled style={{ color: token.colorPrimary, fontSize: screens.xs ? '18px' : '22px' }} />
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
        borderBottom: `1px solid ${token.colorBorder}`
      }}
      bodyStyle={{ padding: screens.xs ? '16px' : '24px' }}
      {...props}
    >
      {children}
    </Card>
  );
};

// =============================================
// RESPONSIVE STAT CARD
// =============================================
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{
              background: `${color}15`,
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {icon ? React.cloneElement(icon, { style: { color, fontSize: getIconSize() } }) : null}
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
            {prefix && <Text style={{ color: token.colorTextTertiary, fontSize: screens.xs ? '12px' : '14px' }}>{prefix}</Text>}
            <Text strong style={{
              color,
              fontSize: screens.xs ? '22px' : '28px',
              fontWeight: 700,
              lineHeight: 1.2
            }}>
              {typeof value === 'number' ? value.toLocaleString() : (value ?? '0')}
            </Text>
            {suffix && <Text style={{ color: token.colorTextTertiary, fontSize: screens.xs ? '12px' : '14px' }}>{suffix}</Text>}
          </div>
          {trend && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              {trend.direction === 'up'
                ? <RiseOutlined style={{ color: token.colorSuccess, fontSize: '12px' }} />
                : <FallOutlined style={{ color: token.colorError, fontSize: '12px' }} />}
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
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorder}` }}>
          {children}
        </div>
      )}
    </Card>
  );
};

// =============================================
// TRANSACTION ITEM (per-shop view)
// =============================================
const TransactionItem = ({ transaction, screens, colors }) => {
  const { token } = useToken();
  const [expanded, setExpanded] = useState(false);
  const tx = transaction || {};
  const items = Array.isArray(tx.items) ? tx.items : [];
  const dateValue = tx.saleDate || tx.transactionDate || tx.createdAt;

  return (
    <div
      style={{
        marginBottom: '12px',
        padding: screens?.xs ? '12px' : '16px',
        borderRadius: '10px',
        backgroundColor: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        cursor: 'pointer',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <Flex vertical={screens?.xs} gap={screens?.xs ? 'small' : 'middle'} justify="space-between">
        <Flex vertical gap="small" style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" gap="small" wrap="wrap">
            <BarcodeOutlined style={{ color: colors?.primary, fontSize: '14px' }} />
            <Text strong style={{ fontSize: screens?.xs ? '13px' : '14px', flex: 1, minWidth: 0 }}>
              {items.length} items sold
            </Text>
          </Flex>
          <Flex align="center" gap="small" wrap="wrap">
            <CalendarOutlined style={{ fontSize: '11px', color: token.colorTextTertiary }} />
            <Text style={{ fontSize: '11px', color: token.colorTextTertiary }}>
              {dateValue ? dayjs(dateValue).format('MMM D, YYYY h:mm A') : 'No date'}
            </Text>
          </Flex>
          {expanded && items.length > 0 && (
            <div style={{ marginTop: '8px', padding: '8px', background: token.colorBgLayout, borderRadius: '6px' }}>
              {items.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <Text style={{ fontSize: '11px' }}>
                    {(item?.productName || item?.name || 'Item')} × {item?.quantity || 1}
                  </Text>
                  <Text style={{ fontSize: '11px', fontWeight: 500 }}>
                    KES {((item?.price || 0) * (item?.quantity || 1)).toLocaleString()}
                  </Text>
                </div>
              ))}
            </div>
          )}
        </Flex>
        <Flex vertical align={screens?.xs ? 'flex-start' : 'flex-end'} gap="small">
          <Text strong style={{ fontSize: screens?.xs ? '18px' : '20px', color: colors?.success }}>
            KES {(tx.totalAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </Text>
          <Tag
            color={tx.paymentMethod === 'cash' ? 'green' : tx.paymentMethod === 'mpesa_bank' ? 'blue' : 'default'}
            style={{ fontSize: '10px', margin: 0 }}
          >
            {(tx.paymentMethod || 'CASH').toUpperCase()} Sale
          </Tag>
        </Flex>
      </Flex>
    </div>
  );
};

// =============================================
// MAIN COMPONENT
// =============================================
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
  const [timeFilter, setTimeFilter] = useState('monthly');
  const [customDateRange, setCustomDateRange] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  const screens = useBreakpoint();
  const { token } = useToken();
  const isMobile = screens?.xs;
  const isTablet = screens?.sm && !screens?.lg;
  const isDesktop = screens?.lg;

  const colors = {
    primary: token.colorPrimary,
    success: token.colorSuccess,
    warning: token.colorWarning,
    error: token.colorError,
    purple: '#722ed1',
    cyan: '#13c2c2',
    gold: '#fa8c16',
  };

  const layoutConfig = useMemo(() => ({
    isMobile,
    isTablet,
    isDesktop,
    padding: isMobile ? '16px' : isTablet ? '20px' : '24px',
    gap: isMobile ? '12px' : isTablet ? '16px' : '20px',
    fontSize: {
      title: isMobile ? '16px' : isTablet ? '18px' : '20px',
      subtitle: isMobile ? '12px' : isTablet ? '13px' : '14px',
      body: isMobile ? '12px' : isTablet ? '13px' : '14px',
    }
  }), [isMobile, isTablet, isDesktop]);

  // =============================================
  // FILTERED SHOPS
  // =============================================
  const filteredShops = useMemo(() => {
    if (!searchTerm.trim()) return shops;
    const q = searchTerm.toLowerCase();
    return shops.filter(shop =>
      (shop?.name || '').toLowerCase().includes(q) ||
      (shop?.location || '').toLowerCase().includes(q)
    );
  }, [shops, searchTerm]);

  // =============================================
  // HANDLERS
  // =============================================
  const handleAddShop = useCallback(() => {
    form.resetFields();
    setEditingShop(null);
    setIsModalOpen(true);
  }, [form]);

  const handleEditShop = useCallback((shop) => {
    if (!shop) return;
    setEditingShop(shop);
    form.setFieldsValue({
      name: shop?.name || '',
      location: shop?.location || '',
    });
    setIsModalOpen(true);
  }, [form]);

  const handleViewShop = useCallback(async (shop) => {
    if (!shop) return;
    setViewingShop(shop);
    setLoading(true);
    try {
      await Promise.all([
        fetchShopProducts(shop._id),
        fetchShopPerformance(shop._id, timeFilter, customDateRange),
        fetchShopTransactions(shop._id, timeFilter, customDateRange)
      ]);
      if (isMobile) setDrawerVisible(true);
      else setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error loading shop performance:', error);
      message.error('Failed to load shop performance data');
    } finally {
      setLoading(false);
    }
  }, [isMobile, timeFilter, customDateRange]);

  const handleDeleteShop = useCallback((id) => {
    if (!id) return;
    Modal.confirm({
      title: 'Delete Shop',
      content: 'Are you sure you want to delete this shop? This action cannot be undone.',
      icon: <ExclamationCircleOutlined />,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      width: isMobile ? '80%' : 520,
      onOk: async () => {
        try {
          setLoading(true);
          await shopAPI.delete(id);
          setShops(prev => prev.filter(shop => shop._id !== id));
          message.success('Shop deleted successfully');
        } catch (error) {
          message.error('Failed to delete shop');
        } finally {
          setLoading(false);
        }
      },
    });
  }, [isMobile]);

  // =============================================
  // COLUMNS
  // =============================================
  const columns = useMemo(() => {
    const base = [
      {
        title: 'Shop',
        dataIndex: 'name',
        key: 'name',
        fixed: isMobile ? false : 'left',
        width: isMobile ? 140 : 220,
        sorter: (a, b) => (a?.name || '').localeCompare(b?.name || ''),
        render: (text, record) => {
          if (!record) return null;
          return (
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
                <Text
                  strong
                  style={{
                    fontSize: isMobile ? '13px' : '14px',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {text || 'Unnamed Shop'}
                </Text>
                <Text
                  type="secondary"
                  style={{
                    fontSize: isMobile ? '11px' : '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <EnvironmentOutlined style={{ fontSize: '10px' }} />
                  {record.location || 'Unknown Location'}
                </Text>
              </div>
            </Flex>
          );
        }
      },
    ];

    if (!isMobile) {
      base.push(
        {
          title: 'Location',
          dataIndex: 'location',
          key: 'location',
          width: 180,
          sorter: (a, b) => (a?.location || '').localeCompare(b?.location || ''),
          render: (text) => (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {text || 'Unknown Location'}
            </Text>
          )
        },
        {
          title: 'Status',
          key: 'status',
          width: 100,
          align: 'center',
          render: () => <Badge status="success" text="Active" style={{ fontSize: '12px' }} />
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
        }
      );
    }

    base.push({
      title: 'Action',
      key: 'action',
      width: isMobile ? 80 : 200,
      fixed: isMobile ? 'right' : false,
      align: 'center',
      render: (_, record) => {
        if (!record || !record._id) return null;
        if (isMobile) {
          return (
            <Dropdown
              menu={{
                items: [
                  { key: 'view', label: 'View Performance', icon: <EyeOutlined />, onClick: () => handleViewShop(record) },
                  { key: 'edit', label: 'Edit Shop', icon: <EditOutlined />, onClick: () => handleEditShop(record) },
                  { type: 'divider' },
                  { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDeleteShop(record._id) }
                ]
              }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button type="text" icon={<MenuOutlined />} size="small" style={{ padding: '4px' }} />
            </Dropdown>
          );
        }
        return (
          <Space size="small">
            <Tooltip title="View Performance">
              <Button icon={<EyeOutlined />} onClick={() => handleViewShop(record)} type="primary" size="small" />
            </Tooltip>
            <Tooltip title="Edit Shop">
              <Button icon={<EditOutlined />} onClick={() => handleEditShop(record)} size="small" />
            </Tooltip>
            <Tooltip title="Delete Shop">
              <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteShop(record._id)} size="small" />
            </Tooltip>
          </Space>
        );
      }
    });

    return base;
  }, [isMobile, colors, handleViewShop, handleEditShop, handleDeleteShop]);

  // =============================================
  // FETCH FUNCTIONS
  // =============================================
  const fetchShops = useCallback(async () => {
    setLoading(true);
    try {
      const response = await shopAPI.getAll();
      const raw = Array.isArray(response) ? response : (response?.data || response?.shops || []);
      const shopsData = raw.map(normalizeShop).filter(Boolean);
      setShops(shopsData);
    } catch (error) {
      console.error('Error fetching shops:', error);
      message.error('Failed to fetch shops');
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchShopProducts = useCallback(async (shopId) => {
    if (!shopId) return [];
    setProductsLoading(true);
    try {
      const response = await productAPI.getAll({ shopId });
      const productsData = Array.isArray(response?.data)
        ? response.data
        : (Array.isArray(response) ? response : []);
      setProducts(productsData);
      return productsData;
    } catch (error) {
      console.error('Error fetching shop products:', error);
      message.warning('Unable to fetch product data');
      return [];
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // ⭐ FIXED: converts period → real dates AND recomputes COGS from transactions
  const fetchShopPerformance = useCallback(async (shopId, period = 'monthly', dateRange = null) => {
    if (!shopId) return;
    try {
      const params = { shopId, dataType: 'withItems' };

      // ★ Convert period keyword → real startDate/endDate
      const range = periodToDateRange(period, dateRange);
      if (range && range[0] && range[1]) {
        params.startDate = range[0].format('YYYY-MM-DD');
        params.endDate = range[1].format('YYYY-MM-DD');
      }

      const response = await unifiedAPI.getCombinedTransactions(params);

      const summary =
        response?.data?.summary ||
        response?.data?.financialStats ||
        response?.summary ||
        response?.financialStats ||
        {};

      const txs =
        response?.data?.transactions ||
        response?.data?.salesWithProfit ||
        response?.data?.filteredTransactions ||
        response?.transactions ||
        response?.salesWithProfit ||
        [];

      const allProducts =
        response?.data?.products ||
        response?.data?.comprehensiveData?.products ||
        products ||
        [];

      const totalRevenue = txs.reduce(
        (s, t) => s + CalculationUtils.safeNumber(t.totalAmount), 0
      );

      const totalCOGS = txs.reduce((s, t) => {
        const stored = CalculationUtils.safeNumber(t.cost);
        if (stored > 0) return s + stored;
        const fromItems = CalculationUtils.calculateCostFromItems
          ? CalculationUtils.calculateCostFromItems(t, allProducts)
          : 0;
        return s + fromItems;
      }, 0);

      const totalProfit = totalRevenue - totalCOGS;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      setShopPerformance({
        totalRevenue,
        totalSales: txs.length,
        costOfGoodsSold: totalCOGS,
        grossProfit: totalProfit,
        netProfit: totalProfit,
        profitMargin,
        paymentComposition: summary.paymentComposition || null,
      });
    } catch (error) {
      console.error('Error fetching shop performance:', error);
      setShopPerformance({});
    }
  }, [products]);

  // ⭐ FIXED: same period → date conversion
  const fetchShopTransactions = useCallback(async (shopId, period = 'monthly', dateRange = null) => {
    if (!shopId) return;
    setTransactionsLoading(true);
    try {
      const params = { shopId, dataType: 'withItems' };

      // ★ Convert period keyword → real startDate/endDate
      const range = periodToDateRange(period, dateRange);
      if (range && range[0] && range[1]) {
        params.startDate = range[0].format('YYYY-MM-DD');
        params.endDate = range[1].format('YYYY-MM-DD');
      }

      const response = await unifiedAPI.getCombinedTransactions(params);
      const transactionsData =
        response?.data?.salesWithProfit ||
        response?.data?.transactions ||
        response?.transactions ||
        [];

      const processed = CalculationUtils?.processComprehensiveData
        ? CalculationUtils.processComprehensiveData(
            { transactions: transactionsData, products },
            shopId
          ).salesWithProfit
        : transactionsData;

      setTransactions(Array.isArray(processed) ? processed : []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }, [products]);

  // =============================================
  // EFFECTS
  // =============================================
  useEffect(() => { fetchShops(); }, [fetchShops]);

  const handleSearch = useCallback((value) => {
    setSearchTerm(value || '');
  }, []);

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

  // =============================================
  // SUBMIT HANDLER
  // =============================================
  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      if (!values?.name?.trim() || !values?.location?.trim()) {
        throw new Error('Shop name and location are required');
      }
      const shopData = {
        name: values.name.trim(),
        location: values.location.trim()
      };

      if (editingShop) {
        await shopAPI.update(editingShop._id, shopData);
        message.success('Shop updated successfully');
      } else {
        await shopAPI.create(shopData);
        message.success('Shop added successfully');
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchShops();
    } catch (error) {
      message.error(error.message || 'Failed to save shop');
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // METRICS — authoritative COGS (matches AdminDashboard / Reports)
  // =============================================
  const metrics = useMemo(() => {
    const safeTx = Array.isArray(transactions) ? transactions : [];
    const serverStats = shopPerformance || {};

    const serverRevenue = CalculationUtils.safeNumber(serverStats.totalRevenue);
    const txSumRevenue = safeTx.reduce(
      (s, t) => s + CalculationUtils.safeNumber(t.totalAmount), 0
    );
    const totalRevenue =
      serverRevenue > 0 ? serverRevenue
        : txSumRevenue > 0 ? txSumRevenue
          : (CalculationUtils.calculateRevenue ? CalculationUtils.calculateRevenue(safeTx) : 0);

    // ★ Recompute COGS using the same fallback chain as AdminDashboard/Reports
    const totalCOGS = safeTx.reduce((s, t) => {
      const stored = CalculationUtils.safeNumber(t.cost);
      if (stored > 0) return s + stored;
      const fromItems = CalculationUtils.calculateCostFromItems
        ? CalculationUtils.calculateCostFromItems(t, products)
        : 0;
      return s + fromItems;
    }, 0);

    const grossProfit = Math.max(0, totalRevenue - totalCOGS);
    const netProfit = grossProfit;

    const paymentComposition =
      serverStats.paymentComposition ||
      (CalculationUtils.calculatePaymentComposition
        ? CalculationUtils.calculatePaymentComposition(safeTx)
        : { cash: 0, mpesa_bank: 0, cashPercentage: 0, mpesaBankPercentage: 0 });

    const totalItemsSold = safeTx.reduce(
      (sum, t) => sum + (t?.itemsCount || (t?.items?.length || 0)),
      0
    );

    const dataSource = 'local';

    return {
      totalSales: safeTx.length,
      totalRevenue: parseFloat((totalRevenue || 0).toFixed(2)),
      totalItemsSold,
      totalCOGS: parseFloat((totalCOGS || 0).toFixed(2)),
      grossProfit: parseFloat((grossProfit || 0).toFixed(2)),
      netProfit: parseFloat((netProfit || 0).toFixed(2)),
      paymentComposition,
      totalCash: paymentComposition?.cash || 0,
      totalBankMpesa: paymentComposition?.mpesa_bank || 0,
      cashPercentage: paymentComposition?.cashPercentage || 0,
      bankMpesaPercentage: paymentComposition?.mpesaBankPercentage || 0,
      cashTransactions: safeTx.filter(t => t?.paymentMethod === 'cash').length,
      bankMpesaTransactions: safeTx.filter(t =>
        ['mpesa', 'bank', 'mpesa_bank'].includes(t?.paymentMethod)
      ).length,
      dataSource
    };
  }, [shopPerformance, transactions, products]);

  // =============================================
  // PERFORMANCE VIEW
  // =============================================
  const ShopPerformanceView = () => {
    const [activeTab, setActiveTab] = useState('overview');

    return (
      <div>
        {/* ── Filter Bar ── */}
        <DeviceAwareCard title="Performance Filter" style={{ marginBottom: layoutConfig.gap }}>
          <Row gutter={[layoutConfig.gap, layoutConfig.gap]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Text strong style={{ fontSize: layoutConfig.fontSize.body }}>Filter by:</Text>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                value={timeFilter}
                onChange={handleTimeFilterChange}
                style={{ width: '100%' }}
                size={isMobile ? 'small' : 'middle'}
                suffixIcon={<CalendarOutlined />}
              >
                <Option value="daily">📅 Today</Option>
                <Option value="weekly">📆 Last 7 Days</Option>
                <Option value="monthly">📊 Last 30 Days</Option>
                <Option value="annually">📈 Last 12 Months</Option>
                <Option value="all">♾️ All Time</Option>
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
                />
              </Col>
            )}
          </Row>
        </DeviceAwareCard>

        {/* ── Stat Cards ── */}
        <Row gutter={[layoutConfig.gap, layoutConfig.gap]} style={{ marginBottom: layoutConfig.gap }}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <ResponsiveStatCard
              title="Total Sales"
              value={metrics.totalSales}
              icon={<ShoppingCartOutlined />}
              color={colors.purple}
              suffix="sales"
            >
              <Progress percent={75} strokeColor={colors.purple} size="small" showInfo={false} />
            </ResponsiveStatCard>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <ResponsiveStatCard
              title="Total Revenue"
              value={metrics.totalRevenue}
              prefix="KES"
              icon={<DollarOutlined />}
              color={colors.primary}
            >
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Source: <Tag color="processing">{metrics.dataSource}</Tag>
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
            >
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Items: {metrics.totalItemsSold}
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
            >
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Gross: KES {metrics.grossProfit.toLocaleString()}
              </Text>
            </ResponsiveStatCard>
          </Col>
        </Row>

        <Segmented
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { label: <span><BarChartOutlined /> {!isMobile && 'Overview'}</span>, value: 'overview' },
            { label: <span><PieChartOutlined /> {!isMobile && 'Payments'}</span>, value: 'payments' },
            {
              label: (
                <span>
                  <ShoppingCartOutlined /> {!isMobile && 'Transactions'}{' '}
                  <Badge count={transactions.length} size="small" />
                </span>
              ),
              value: 'transactions'
            },
          ]}
          block={isMobile}
          style={{
            marginBottom: layoutConfig.gap,
            background: token.colorBgContainer,
            padding: '4px',
            borderRadius: '8px'
          }}
        />

        {activeTab === 'overview' && (
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
                      <Text style={{ fontWeight: '500' }}>Total Revenue</Text>
                      <Text style={{ fontSize: '12px', color: token.colorTextTertiary }}>
                        From {metrics.totalSales} sales
                      </Text>
                    </Flex>
                    <Text strong style={{ color: colors.primary, fontSize: '20px' }}>
                      KES {metrics.totalRevenue.toLocaleString()}
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
                      <Text style={{ fontWeight: '500' }}>Cost of Goods</Text>
                      <Text style={{ fontSize: '12px', color: token.colorTextTertiary }}>
                        For {metrics.totalItemsSold} items
                      </Text>
                    </Flex>
                    <Text strong style={{ color: colors.warning, fontSize: '18px' }}>
                      KES {metrics.totalCOGS.toLocaleString()}
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
                    borderLeft: `4px solid ${colors.success}`
                  }}>
                    <Flex vertical gap="small">
                      <Text style={{ fontWeight: '500' }}>Gross Profit</Text>
                      <Text style={{ fontSize: '12px', color: token.colorTextTertiary }}>
                        Revenue - COGS
                      </Text>
                    </Flex>
                    <Text strong style={{ color: colors.success, fontSize: '18px' }}>
                      KES {metrics.grossProfit.toLocaleString()}
                    </Text>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    background: `${colors.success}08`,
                    borderRadius: '8px',
                    borderLeft: `4px solid ${colors.success}`
                  }}>
                    <Flex vertical gap="small">
                      <Text style={{ fontWeight: '500' }}>Net Profit</Text>
                      <Text style={{ fontSize: '12px', color: token.colorTextTertiary }}>
                        No expenses in shop view
                      </Text>
                    </Flex>
                    <Text strong style={{ color: colors.success, fontSize: '20px' }}>
                      KES {metrics.netProfit.toLocaleString()}
                    </Text>
                  </div>
                </Space>
              </DeviceAwareCard>
            </Col>
          </Row>
        )}

        {activeTab === 'payments' && (
          <DeviceAwareCard title="Payment Composition">
            <Row gutter={[layoutConfig.gap, layoutConfig.gap]}>
              <Col xs={24} md={12}>
                <Card style={{ background: `${colors.purple}10`, borderRadius: '12px' }}>
                  <Text strong>Cash ({metrics.cashPercentage.toFixed(1)}%)</Text>
                  <Title level={3} style={{ color: colors.purple, margin: '8px 0' }}>
                    KES {metrics.totalCash.toLocaleString()}
                  </Title>
                  <Progress percent={metrics.cashPercentage} strokeColor={colors.purple} showInfo={false} />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card style={{ background: `${colors.primary}10`, borderRadius: '12px' }}>
                  <Text strong>Bank/Mpesa ({metrics.bankMpesaPercentage.toFixed(1)}%)</Text>
                  <Title level={3} style={{ color: colors.primary, margin: '8px 0' }}>
                    KES {metrics.totalBankMpesa.toLocaleString()}
                  </Title>
                  <Progress percent={metrics.bankMpesaPercentage} strokeColor={colors.primary} showInfo={false} />
                </Card>
              </Col>
            </Row>
          </DeviceAwareCard>
        )}

        {activeTab === 'transactions' && (
          <DeviceAwareCard
            title={`Recent Transactions (${transactions.length})`}
            loading={transactionsLoading}
          >
            {transactions.length > 0 ? (
              <List
                dataSource={transactions}
                renderItem={t => (
                  <TransactionItem
                    key={t?._id || Math.random()}
                    transaction={t}
                    screens={screens}
                    colors={colors}
                  />
                )}
                pagination={{
                  pageSize: isMobile ? 5 : 10,
                  size: isMobile ? 'small' : 'default',
                  simple: isMobile
                }}
              />
            ) : (
              <Empty description="No transactions found in this period" />
            )}
          </DeviceAwareCard>
        )}
      </div>
    );
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Content style={{
        padding: layoutConfig.padding,
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%',
        paddingBottom: isMobile ? '80px' : layoutConfig.padding
      }}>
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
                  <ShopFilled style={{ color: 'white', fontSize: isMobile ? '24px' : '28px' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Shop Management</Title>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: layoutConfig.fontSize.subtitle,
                      display: 'block',
                      marginTop: '4px'
                    }}
                  >
                    Manage your shops and monitor performance
                  </Text>
                </div>
              </Flex>

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
                  style={{ width: isMobile ? '100%' : 300, maxWidth: '100%' }}
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

        <Table
          columns={columns}
          dataSource={filteredShops}
          loading={loading}
          rowKey={(record) => record?._id || Math.random().toString(36)}
          pagination={{
            pageSize: isMobile ? 5 : 10,
            size: isMobile ? 'small' : 'default',
            showSizeChanger: !isMobile,
            showTotal: (total) => `Total ${total} shops`
          }}
          scroll={{ x: 'max-content' }}
          size={isMobile ? 'small' : 'middle'}
          locale={{ emptyText: <Empty description="No shops found" /> }}
          onRow={(record) => ({
            onClick: () => { if (isMobile && record) handleViewShop(record); },
            style: { cursor: isMobile ? 'pointer' : 'default' }
          })}
        />

        {isMobile && (
          <div style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 1000 }}>
            <FloatButton.Group trigger="click" type="primary" icon={<SettingOutlined />} tooltip="Actions">
              <FloatButton icon={<ReloadOutlined />} onClick={fetchShops} tooltip="Refresh" />
              <FloatButton icon={<PlusOutlined />} onClick={handleAddShop} tooltip="Add Shop" />
              <FloatButton icon={<MobileOutlined />} tooltip={`Mobile ${screens?.width}×${screens?.height}`} />
              <FloatButton.BackTop visibilityHeight={0} />
            </FloatButton.Group>
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal
          title={
            <Flex align="center" gap="small">
              {editingShop ? (
                <><EditOutlined style={{ color: colors.primary }} /><span>Edit Shop Details</span></>
              ) : (
                <><PlusOutlined style={{ color: colors.success }} /><span>Add New Shop</span></>
              )}
            </Flex>
          }
          open={isModalOpen}
          onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
          footer={null}
          destroyOnClose
          width={isMobile ? '90%' : 520}
          centered
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="Shop Name"
              name="name"
              rules={[{ required: true, message: 'Please enter shop name' }]}
            >
              <Input placeholder="Enter shop name" size="large" prefix={<ShopOutlined />} />
            </Form.Item>
            <Form.Item
              label="Location"
              name="location"
              rules={[{ required: true, message: 'Please enter location' }]}
            >
              <Input placeholder="Enter location" size="large" prefix={<EnvironmentOutlined />} />
            </Form.Item>
            <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                style={{
                  background: `linear-gradient(45deg, ${colors.primary}, ${colors.success})`,
                  border: 'none',
                  height: '48px',
                  fontSize: '16px'
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
              <Flex align="center" gap="middle">
                <BarChartOutlined style={{ fontSize: '20px' }} />
                <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: '18px' }}>{viewingShop?.name || 'Shop'}</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <EnvironmentOutlined /> {viewingShop?.location || 'Unknown'}
                  </Text>
                </Flex>
              </Flex>
            }
            open={isViewModalOpen}
            onCancel={() => setIsViewModalOpen(false)}
            footer={[
              <Button key="close" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            ]}
            width="90%"
            style={{ top: 20, maxWidth: '1200px' }}
            bodyStyle={{
              padding: '24px',
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto'
            }}
          >
            <Spin spinning={loading || productsLoading} size="large">
              {viewingShop && <ShopPerformanceView />}
            </Spin>
          </Modal>
        )}

        {/* Mobile Drawer */}
        <Drawer
          title={
            <Flex vertical gap="small">
              <Flex align="center" gap="small">
                <ShopOutlined style={{ color: colors.primary }} />
                <Text strong>{viewingShop?.name || 'Shop'}</Text>
              </Flex>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {viewingShop?.location || 'Unknown'}
              </Text>
            </Flex>
          }
          placement="right"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={screens?.width > 400 ? '90%' : '100%'}
          bodyStyle={{ padding: '16px', paddingBottom: '80px' }}
          extra={
            <Button
              icon={<CloseOutlined />}
              onClick={() => setDrawerVisible(false)}
              type="text"
              size="small"
            />
          }
        >
          {viewingShop && <ShopPerformanceView />}
        </Drawer>
      </Content>
    </Layout>
  );
};

export default ShopManagement;