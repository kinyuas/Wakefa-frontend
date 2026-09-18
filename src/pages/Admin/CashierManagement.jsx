// src/pages/Admin/CashierManagement.jsx
// Cashier management + per-cashier performance view.
// - Converts period keyword → real startDate/endDate (backend ignores `period`)
// - Recomputes COGS from transactions (item-level fallback → products[] lookup)
// - Shows Overview (stats + payments) AND Transactions list
// - Responsive across mobile / tablet / desktop
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';
import {
  Table, Button, Modal, message, Card, Spin, Form, Input, Space, Tag,
  Statistic, Row, Col, Select, DatePicker, Tooltip, Badge, Progress,
  Alert, Typography, Grid, theme, Empty, Drawer, Dropdown, Avatar,
  FloatButton, Flex, Layout, List, Segmented
} from 'antd';
import {
  UserAddOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  TeamOutlined, DollarOutlined, ShoppingCartOutlined, CalendarOutlined,
  ExclamationCircleOutlined, UserOutlined, PhoneOutlined, WarningOutlined,
  RiseOutlined, BankOutlined,
  MailOutlined, ReloadOutlined, SearchOutlined, FilterOutlined,
  MoreOutlined, MenuOutlined, CloseOutlined, LockOutlined,
  KeyOutlined, SafetyCertificateOutlined, InfoCircleOutlined,
  StopOutlined, CheckCircleOutlined, MoneyCollectOutlined, BarcodeOutlined,
  BarChartOutlined, SettingOutlined, MobileOutlined, PieChartOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { cashierAPI, unifiedAPI } from '../../services/api';
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

// =============================================
// CONSTANTS
// =============================================
const TIME_RANGE_OPTIONS = [
  { label: 'Today', value: 'daily', icon: <CalendarOutlined /> },
  { label: 'Last 7 Days', value: 'weekly', icon: <CalendarOutlined /> },
  { label: 'Last 30 Days', value: 'monthly', icon: <CalendarOutlined /> },
  { label: 'Last 12 Months', value: 'annually', icon: <CalendarOutlined /> },
  { label: 'All Time', value: 'all', icon: <CalendarOutlined /> },
  { label: 'Custom Range', value: 'custom', icon: <FilterOutlined /> }
];

const PAYMENT_METHOD_CONFIG = {
  cash: { color: 'green', text: 'CASH' },
  mpesa: { color: 'blue', text: 'MPESA' },
  bank: { color: 'purple', text: 'BANK' },
  mpesa_bank: { color: 'blue', text: 'MPESA/BANK' },
  cash_mpesa_bank: { color: 'cyan', text: 'CASH + M-PESA/BANK' }
};

// =============================================
// HELPERS
// =============================================
const normalizeCashier = (c) => {
  if (!c || typeof c !== 'object') return null;
  return {
    _id: c._id || c.id || Math.random().toString(36),
    name: c.name || 'Unnamed Cashier',
    email: c.email || 'no-email@example.com',
    phone: c.phone || '',
    status: c.status || (c.isActive === false ? 'inactive' : 'active'),
    isActive: typeof c.isActive === 'boolean' ? c.isActive : true,
    password: c.password || null,
    lastLogin: c.lastLogin || null,
    createdAt: c.createdAt || null,
    ...c
  };
};

const getCashierStatus = (cashier) => {
  if (!cashier) return 'inactive';
  if (cashier.status) return cashier.status;
  if (typeof cashier.isActive === 'boolean') {
    return cashier.isActive ? 'active' : 'inactive';
  }
  return 'active';
};

// ⭐ Same period → date conversion used in ShopManagement
const periodToDateRange = (period, customRange = null) => {
  if (period === 'custom' && customRange?.[0] && customRange?.[1]) {
    return [customRange[0], customRange[1]];
  }

  const now = dayjs();
  const end = now.endOf('day');

  switch (period) {
    case 'daily':
      return [now.startOf('day'), end];
    case 'weekly':
    case '7d':
      return [now.subtract(7, 'days').startOf('day'), end];
    case 'monthly':
    case '30d':
      return [now.subtract(30, 'days').startOf('day'), end];
    case 'annually':
    case 'yearly':
      return [now.subtract(365, 'days').startOf('day'), end];
    case 'all':
      return null;
    default:
      return [now.subtract(30, 'days').startOf('day'), end];
  }
};

// =============================================
// PASSWORD STRENGTH INDICATOR
// =============================================
const PasswordStrengthIndicator = ({ password }) => {
  const { token } = useToken();
  if (!password) return null;

  const calculateStrength = (pass) => {
    let s = 0;
    if (pass.length >= 8) s += 25;
    else if (pass.length >= 6) s += 15;
    if (/\d/.test(pass)) s += 25;
    if (/[a-z]/.test(pass)) s += 15;
    if (/[A-Z]/.test(pass)) s += 15;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) s += 20;
    return Math.min(100, s);
  };

  const strength = calculateStrength(password);
  const getColor = () =>
    strength < 30 ? token.colorError :
    strength < 60 ? token.colorWarning :
    strength < 80 ? token.colorInfo : token.colorSuccess;
  const getText = () =>
    strength < 30 ? 'Weak' :
    strength < 60 ? 'Fair' :
    strength < 80 ? 'Good' : 'Strong';

  return (
    <div style={{ marginTop: 8 }}>
      <Flex justify="space-between" align="center">
        <Text type="secondary" style={{ fontSize: 12 }}>Password Strength:</Text>
        <Text style={{ color: getColor(), fontSize: 12, fontWeight: 500 }}>
          {getText()} ({strength}%)
        </Text>
      </Flex>
      <Progress
        percent={strength}
        strokeColor={getColor()}
        showInfo={false}
        size="small"
        style={{ marginTop: 4 }}
      />
    </div>
  );
};

// =============================================
// RESPONSIVE STAT CARD
// =============================================
const ResponsiveStatCard = ({ title, value, prefix, suffix, icon, color, children }) => {
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
        borderRadius: 12,
        border: `1px solid ${color}20`
      }}
      hoverable
      bodyStyle={{
        padding: screens.xs ? '14px' : '18px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          background: `${color}15`,
          borderRadius: 8,
          padding: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon ? React.cloneElement(icon, { style: { color, fontSize: getIconSize() } }) : null}
        </div>
        <Text strong style={{
          color: token.colorTextSecondary,
          fontSize: screens.xs ? '12px' : '13px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {title}
        </Text>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
        {prefix && <Text style={{
          color: token.colorTextTertiary,
          fontSize: screens.xs ? '11px' : '13px'
        }}>{prefix}</Text>}
        <Text strong style={{
          color,
          fontSize: screens.xs ? '20px' : '26px',
          fontWeight: 700,
          lineHeight: 1.2
        }}>
          {typeof value === 'number' ? value.toLocaleString() : (value ?? '0')}
        </Text>
        {suffix && <Text style={{
          color: token.colorTextTertiary,
          fontSize: screens.xs ? '11px' : '13px'
        }}>{suffix}</Text>}
      </div>

      {children && (
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: `1px solid ${token.colorBorder}`
        }}>
          {children}
        </div>
      )}
    </Card>
  );
};

// =============================================
// TRANSACTION ITEM (used in cashier summary)
// =============================================
const TransactionItem = ({ transaction, screens, colors }) => {
  const { token } = useToken();
  const [expanded, setExpanded] = useState(false);
  const tx = transaction || {};
  const items = Array.isArray(tx.items) ? tx.items : [];
  const dateValue = tx.saleDate || tx.transactionDate || tx.createdAt;
  const paymentConfig = PAYMENT_METHOD_CONFIG[tx.paymentMethod] || PAYMENT_METHOD_CONFIG.cash;

  return (
    <div
      style={{
        marginBottom: 12,
        padding: screens?.xs ? '12px' : '16px',
        borderRadius: 10,
        backgroundColor: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        cursor: 'pointer'
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <Flex vertical={screens?.xs} gap={screens?.xs ? 'small' : 'middle'} justify="space-between">
        <Flex vertical gap="small" style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" gap="small" wrap="wrap">
            <FileTextOutlined style={{ color: colors?.primary, fontSize: 14 }} />
            <Text strong style={{ fontSize: screens?.xs ? '13px' : '14px', flex: 1, minWidth: 0 }}>
              {tx.transactionNumber || `TXN-${(tx._id || '').substring(0, 6)}`}
            </Text>
            <Tag
              color={paymentConfig.color}
              style={{ fontSize: 10, margin: 0 }}
            >
              {paymentConfig.text}
            </Tag>
          </Flex>
          <Flex align="center" gap="small" wrap="wrap">
            <CalendarOutlined style={{ fontSize: 11, color: token.colorTextTertiary }} />
            <Text style={{ fontSize: 11, color: token.colorTextTertiary }}>
              {dateValue ? dayjs(dateValue).format('MMM D, YYYY h:mm A') : 'No date'}
            </Text>
          </Flex>
          <Text style={{ fontSize: 11, color: token.colorTextTertiary }}>
            {items.length} item{items.length === 1 ? '' : 's'} sold
          </Text>
          {expanded && items.length > 0 && (
            <div style={{
              marginTop: 8,
              padding: 8,
              background: token.colorBgLayout,
              borderRadius: 6
            }}>
              {items.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: index < items.length - 1
                      ? `1px dashed ${token.colorBorder}`
                      : 'none'
                  }}
                >
                  <Text style={{ fontSize: 11 }}>
                    {(item?.productName || item?.name || 'Item')} × {item?.quantity || 1}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: 500 }}>
                    KES {((item?.price || 0) * (item?.quantity || 1)).toLocaleString()}
                  </Text>
                </div>
              ))}
            </div>
          )}
        </Flex>
        <Flex vertical align={screens?.xs ? 'flex-start' : 'flex-end'} gap="small">
          <Text strong style={{
            fontSize: screens?.xs ? '18px' : '20px',
            color: colors?.success
          }}>
            KES {(tx.totalAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={{ fontSize: 10, color: token.colorTextTertiary }}>
            {tx.shopName || (tx.shop && typeof tx.shop === 'object' ? tx.shop.name : '')}
          </Text>
        </Flex>
      </Flex>
    </div>
  );
};

// =============================================
// MAIN COMPONENT
// =============================================
const CashierManagement = () => {
  const [cashiers, setCashiers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingCashier, setEditingCashier] = useState(null);
  const [viewingCashier, setViewingCashier] = useState(null);
  const [cashierSummary, setCashierSummary] = useState({});
  const [cashierTransactions, setCashierTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('monthly');
  const [customDateRange, setCustomDateRange] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [togglingStatusId, setTogglingStatusId] = useState(null);
  const [summaryTab, setSummaryTab] = useState('overview'); // 'overview' | 'transactions'

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
    gap: isMobile ? 12 : isTablet ? 16 : 20
  }), [isMobile, isTablet, isDesktop]);

  // =============================================
  // FETCH CASHIERS
  // =============================================
  const fetchCashiers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await cashierAPI.getAll();
      const raw = Array.isArray(response)
        ? response
        : (response?.data || response?.cashiers || []);
      const cashiersData = raw.map(normalizeCashier).filter(Boolean);
      setCashiers(cashiersData);
    } catch (error) {
      console.error('❌ Error fetching cashiers:', error);
      message.error('Failed to fetch cashiers');
      setCashiers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // =============================================
  // FETCH CASHIER SUMMARY — Revenue, COGS, Profit, Payments
  // =============================================
  const fetchCashierSummary = useCallback(async (
    cashierId,
    rangeType = 'monthly',
    dateRange = null
  ) => {
    if (!cashierId) return;
    try {
      const params = { cashierId, dataType: 'withItems' };

      const range = periodToDateRange(rangeType, dateRange);
      if (range && range[0] && range[1]) {
        params.startDate = range[0].format('YYYY-MM-DD');
        params.endDate = range[1].format('YYYY-MM-DD');
      }

      const response = await unifiedAPI.getCombinedTransactions(params);

      const summary =
        response?.summary ||
        response?.data?.summary ||
        response?.financialStats ||
        response?.data?.financialStats ||
        {};

      const rawTransactions =
        response?.transactions ||
        response?.salesWithProfit ||
        response?.data?.transactions ||
        response?.data?.salesWithProfit ||
        [];

      const allProducts =
        response?.products ||
        response?.data?.products ||
        response?.data?.comprehensiveData?.products ||
        [];

      const txSumRevenue = rawTransactions.reduce(
        (s, t) => s + CalculationUtils.safeNumber(t.totalAmount), 0
      );
      const totalRevenue =
        CalculationUtils.safeNumber(summary.totalRevenue) || txSumRevenue;

      // ★ COGS with item fallback
      const totalCOGS = rawTransactions.reduce((s, t) => {
        const stored = CalculationUtils.safeNumber(t.cost);
        if (stored > 0) return s + stored;
        const fromItems = CalculationUtils.calculateCostFromItems
          ? CalculationUtils.calculateCostFromItems(t, allProducts)
          : 0;
        return s + fromItems;
      }, 0);

      const grossProfit = Math.max(0, totalRevenue - totalCOGS);
      const netProfit = grossProfit;
      const profitMargin = totalRevenue > 0
        ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(2))
        : 0;

      const paymentComp = CalculationUtils.calculatePaymentComposition
        ? CalculationUtils.calculatePaymentComposition(rawTransactions)
        : { cash: 0, mpesa_bank: 0 };

      const totalCash = CalculationUtils.safeNumber(summary.totalCash) || paymentComp.cash || 0;
      const totalBankMpesa = CalculationUtils.safeNumber(
        summary.totalMpesaBank ?? summary.totalBank
      ) || paymentComp.mpesa_bank || 0;

      const totalPayments = totalCash + totalBankMpesa;

      const totalTransactions =
        CalculationUtils.safeNumber(summary.totalSales ?? summary.totalTransactions) ||
        rawTransactions.length || 0;

      const totalItemsSold =
        CalculationUtils.safeNumber(summary.totalItemsSold) ||
        rawTransactions.reduce(
          (s, t) => s + CalculationUtils.safeNumber(t.itemsCount || (t.items?.length || 0)),
          0
        );

      setCashierSummary({
        totalRevenue: parseFloat((totalRevenue || 0).toFixed(2)),
        totalCOGS: parseFloat((totalCOGS || 0).toFixed(2)),
        grossProfit: parseFloat((grossProfit || 0).toFixed(2)),
        netProfit: parseFloat((netProfit || 0).toFixed(2)),
        profitMargin,
        totalTransactions,
        totalItemsSold,
        totalCash: parseFloat((totalCash || 0).toFixed(2)),
        totalBankMpesa: parseFloat((totalBankMpesa || 0).toFixed(2)),
        cashPercentage: totalPayments > 0
          ? parseFloat(((totalCash / totalPayments) * 100).toFixed(1))
          : 0,
        mpesaBankPercentage: totalPayments > 0
          ? parseFloat(((totalBankMpesa / totalPayments) * 100).toFixed(1))
          : 0,
        dataSource: 'local'
      });

      // ⭐ Also store transactions for the Transactions tab
      setCashierTransactions(
        Array.isArray(rawTransactions)
          ? rawTransactions.sort(
              (a, b) =>
                new Date(b.saleDate || b.createdAt) -
                new Date(a.saleDate || a.createdAt)
            )
          : []
      );
    } catch (error) {
      console.error('❌ Error fetching cashier summary:', error);
      setCashierSummary({});
      setCashierTransactions([]);
    }
  }, []);

  // =============================================
  // HANDLERS
  // =============================================
  const handleTimeFilterChange = useCallback((value) => {
    setTimeFilter(value);
    if (value !== 'custom') {
      setCustomDateRange(null);
      if (viewingCashier) {
        setSummaryLoading(true);
        setTransactionsLoading(true);
        fetchCashierSummary(viewingCashier._id, value, null)
          .finally(() => {
            setSummaryLoading(false);
            setTransactionsLoading(false);
          });
      }
    }
  }, [viewingCashier, fetchCashierSummary]);

  const handleCustomDateChange = useCallback((dates) => {
    setCustomDateRange(dates);
    if (dates?.[0] && dates?.[1] && viewingCashier) {
      setSummaryLoading(true);
      setTransactionsLoading(true);
      fetchCashierSummary(viewingCashier._id, 'custom', dates)
        .finally(() => {
          setSummaryLoading(false);
          setTransactionsLoading(false);
        });
    }
  }, [viewingCashier, fetchCashierSummary]);

  const handleManualRefresh = useCallback(async () => {
    if (!viewingCashier) return;
    setSummaryLoading(true);
    setTransactionsLoading(true);
    try {
      await fetchCashierSummary(viewingCashier._id, timeFilter, customDateRange);
      message.success('Data refreshed');
    } catch {
      message.error('Failed to refresh');
    } finally {
      setSummaryLoading(false);
      setTransactionsLoading(false);
    }
  }, [viewingCashier, timeFilter, customDateRange, fetchCashierSummary]);

  const handleAddCashier = () => {
    form.resetFields();
    setEditingCashier(null);
    setPasswordValue('');
    setIsModalOpen(true);
  };

  const handleEditCashier = (cashier) => {
    if (!cashier) return;
    setEditingCashier(cashier);
    setPasswordValue('');
    form.setFieldsValue({
      name: cashier?.name || '',
      email: cashier?.email || '',
      phone: cashier?.phone || '',
    });
    setIsModalOpen(true);
  };

  // INSTANT open — data loads in the background
  const handleViewCashier = useCallback(async (cashier) => {
    if (!cashier) return;
    setViewingCashier(cashier);
    setCashierSummary({});
    setCashierTransactions([]);
    setSummaryTab('overview');

    if (isMobile) setDrawerVisible(true);
    else setIsViewModalOpen(true);

    setSummaryLoading(true);
    setTransactionsLoading(true);
    try {
      await fetchCashierSummary(cashier._id, timeFilter, customDateRange);
    } catch (e) {
      console.warn('Summary fetch failed:', e);
    } finally {
      setSummaryLoading(false);
      setTransactionsLoading(false);
    }
  }, [isMobile, timeFilter, customDateRange, fetchCashierSummary]);

  const handleDeleteCashier = (id) => {
    if (!id) return;
    Modal.confirm({
      title: 'Delete Cashier',
      content: 'Are you sure? This cannot be undone.',
      icon: <ExclamationCircleOutlined />,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setLoading(true);
          await cashierAPI.delete(id);
          setCashiers(prev => prev.filter(c => c._id !== id));
          message.success('Cashier deleted');
        } catch {
          message.error('Failed to delete cashier');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleToggleCashierStatus = (cashier) => {
    if (!cashier || !cashier._id) return;
    const currentStatus = getCashierStatus(cashier);
    const isCurrentlyActive = currentStatus === 'active';
    const newStatus = isCurrentlyActive ? 'inactive' : 'active';
    const actionLabel = isCurrentlyActive ? 'Deactivate' : 'Activate';

    Modal.confirm({
      title: `${actionLabel} Cashier`,
      icon: isCurrentlyActive
        ? <StopOutlined style={{ color: colors.warning }} />
        : <CheckCircleOutlined style={{ color: colors.success }} />,
      content: isCurrentlyActive
        ? `Deactivate "${cashier.name}"? They will not be able to log in.`
        : `Activate "${cashier.name}"? They will be able to log in again.`,
      okText: `Yes, ${actionLabel}`,
      okType: isCurrentlyActive ? 'danger' : 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setTogglingStatusId(cashier._id);
          await cashierAPI.update(cashier._id, {
            name: cashier.name,
            email: cashier.email,
            phone: cashier.phone || '',
            status: newStatus
          });
          setCashiers(prev =>
            prev.map(c =>
              c._id === cashier._id
                ? { ...c, status: newStatus, isActive: newStatus === 'active' }
                : c
            )
          );
          if (viewingCashier && viewingCashier._id === cashier._id) {
            setViewingCashier(prev => ({
              ...prev,
              status: newStatus,
              isActive: newStatus === 'active'
            }));
          }
          message.success(`Cashier ${isCurrentlyActive ? 'deactivated' : 'activated'}`);
        } catch {
          message.error(`Failed to ${actionLabel.toLowerCase()} cashier`);
        } finally {
          setTogglingStatusId(null);
        }
      }
    });
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      if (!values?.name?.trim() || !values?.email?.trim()) {
        throw new Error('Name and email are required');
      }
      const cashierData = {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || '',
        status: 'active',
        isActive: true
      };
      if (values.password?.trim()) {
        cashierData.password = values.password.trim();
      }
      if (editingCashier) {
        await cashierAPI.update(editingCashier._id, cashierData);
        message.success('Cashier updated');
      } else {
        if (!values.password?.trim()) {
          throw new Error('Password is required for new cashiers');
        }
        await cashierAPI.create(cashierData);
        message.success('Cashier added');
      }
      setIsModalOpen(false);
      form.resetFields();
      setPasswordValue('');
      fetchCashiers();
    } catch (error) {
      message.error(error.message || 'Failed to save cashier');
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // FILTERED CASHIERS
  // =============================================
  const filteredCashiers = useMemo(() => {
    let result = Array.isArray(cashiers) ? [...cashiers] : [];
    if (searchText?.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(c =>
        (c?.name || '').toLowerCase().includes(search) ||
        (c?.email || '').toLowerCase().includes(search) ||
        (c?.phone && c.phone.includes(search))
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(c => getCashierStatus(c) === statusFilter);
    }
    return result;
  }, [cashiers, searchText, statusFilter]);

  // =============================================
  // EFFECTS
  // =============================================
  useEffect(() => { fetchCashiers(); }, [fetchCashiers]);

  // Re-fetch summary when period changes while viewing
  useEffect(() => {
    if (viewingCashier && (isViewModalOpen || drawerVisible)) {
      setSummaryLoading(true);
      setTransactionsLoading(true);
      fetchCashierSummary(viewingCashier._id, timeFilter, customDateRange)
        .finally(() => {
          setSummaryLoading(false);
          setTransactionsLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter, customDateRange]);

  // =============================================
  // COLUMNS
  // =============================================
  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: 'Cashier',
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
                icon={<UserOutlined />}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: isMobile ? '13px' : '14px', display: 'block' }}>
                  {text || 'Unnamed'}
                </Text>
                <Text
                  type="secondary"
                  style={{
                    fontSize: isMobile ? '11px' : '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <MailOutlined style={{ fontSize: '10px' }} />
                  {record.email || 'No email'}
                </Text>
                {record.phone && (
                  <Text
                    type="secondary"
                    style={{
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <PhoneOutlined style={{ fontSize: '10px' }} />
                    {record.phone}
                  </Text>
                )}
              </div>
            </Flex>
          );
        }
      },
    ];

    if (!isMobile) {
      baseColumns.push(
        {
          title: 'Status',
          key: 'status',
          width: 110,
          align: 'center',
          render: (_, record) => {
            if (!record) return null;
            const status = getCashierStatus(record);
            return (
              <Badge
                status={status === 'active' ? 'success' : 'warning'}
                text={status === 'active' ? 'Active' : 'Inactive'}
              />
            );
          }
        },
        {
          title: 'Password',
          key: 'passwordStatus',
          width: 110,
          align: 'center',
          render: (_, record) => {
            if (!record) return null;
            return (
              <Tag
                color={record.password ? 'green' : 'orange'}
                icon={record.password ? <SafetyCertificateOutlined /> : <WarningOutlined />}
                style={{ fontSize: '11px' }}
              >
                {record.password ? 'Set' : 'Not Set'}
              </Tag>
            );
          }
        },
        {
          title: 'Last Login',
          dataIndex: 'lastLogin',
          key: 'lastLogin',
          width: 180,
          render: (date) => (
            date ? (
              <Flex vertical gap={0}>
                <Text style={{ fontSize: '12px', fontWeight: 500 }}>
                  {dayjs(date).format('MMM D, YYYY')}
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {dayjs(date).format('h:mm:ss A')}
                </Text>
              </Flex>
            ) : (
              <Text type="secondary" style={{ fontSize: '12px' }}>Never</Text>
            )
          )
        }
      );
    }

    baseColumns.push({
      title: 'Action',
      key: 'action',
      width: isMobile ? 80 : 210,
      fixed: isMobile ? 'right' : false,
      align: 'center',
      render: (_, record) => {
        if (!record || !record._id) return null;
        const status = getCashierStatus(record);
        const isActive = status === 'active';
        const isToggling = togglingStatusId === record._id;

        if (isMobile) {
          return (
            <Dropdown
              menu={{
                items: [
                  { key: 'view', label: 'View Summary', icon: <EyeOutlined />, onClick: () => handleViewCashier(record) },
                  { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => handleEditCashier(record) },
                  {
                    key: 'toggle',
                    label: isActive ? 'Deactivate' : 'Activate',
                    icon: isActive ? <StopOutlined /> : <CheckCircleOutlined />,
                    onClick: () => handleToggleCashierStatus(record)
                  },
                  { type: 'divider' },
                  { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDeleteCashier(record._id) }
                ]
              }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button type="text" icon={<MoreOutlined />} size="small" loading={isToggling} />
            </Dropdown>
          );
        }
        return (
          <Space size="small">
            <Tooltip title="View Summary">
              <Button icon={<EyeOutlined />} onClick={() => handleViewCashier(record)} type="primary" size="small" />
            </Tooltip>
            <Tooltip title="Edit">
              <Button icon={<EditOutlined />} onClick={() => handleEditCashier(record)} size="small" />
            </Tooltip>
            <Tooltip title={isActive ? 'Deactivate' : 'Activate'}>
              <Button
                icon={isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                onClick={() => handleToggleCashierStatus(record)}
                size="small"
                loading={isToggling}
                style={{
                  color: isActive ? colors.warning : colors.success,
                  borderColor: isActive ? colors.warning : colors.success
                }}
              />
            </Tooltip>
            <Tooltip title="Delete">
              <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteCashier(record._id)} size="small" />
            </Tooltip>
          </Space>
        );
      }
    });

    return baseColumns;
  }, [isMobile, colors, token, togglingStatusId]);

  // =============================================
  // CASHIER SUMMARY VIEW — Overview + Transactions
  // =============================================
  const CashierSummaryView = () => {
    const status = getCashierStatus(viewingCashier);
    const isActive = status === 'active';
    const s = cashierSummary || {};

    return (
      <div>
        {/* Status banner */}
        {viewingCashier && (
          <Alert
            type={isActive ? 'success' : 'warning'}
            showIcon
            icon={isActive ? <CheckCircleOutlined /> : <StopOutlined />}
            message={
              <Flex justify="space-between" align="center" wrap="wrap" gap="small">
                <Text>
                  Status:{' '}
                  <Tag color={isActive ? 'green' : 'orange'} style={{ marginLeft: 4 }}>
                    {isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Tag>
                </Text>
                <Button
                  size="small"
                  type={isActive ? 'default' : 'primary'}
                  danger={isActive}
                  icon={isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                  onClick={() => handleToggleCashierStatus(viewingCashier)}
                  loading={togglingStatusId === viewingCashier._id}
                >
                  {isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </Flex>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Period Filter */}
        <Card
          size="small"
          title={
            <Flex align="center" gap="small">
              <CalendarOutlined style={{ color: colors.primary }} />
              <Text strong>Performance Filter</Text>
            </Flex>
          }
          style={{ marginBottom: 16, borderRadius: 12 }}
        >
          <Row gutter={[layoutConfig.gap, layoutConfig.gap]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Text strong style={{ fontSize: isMobile ? '12px' : '13px' }}>Filter by:</Text>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                value={timeFilter}
                onChange={handleTimeFilterChange}
                style={{ width: '100%' }}
                size={isMobile ? 'small' : 'middle'}
                suffixIcon={<CalendarOutlined />}
              >
                {TIME_RANGE_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    <Space>{option.icon}{option.label}</Space>
                  </Option>
                ))}
              </Select>
            </Col>
            {timeFilter === 'custom' && (
              <Col xs={24} sm={24} md={10}>
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
        </Card>

        {/* ⭐ Segmented: Overview / Transactions */}
        <Segmented
          block={isMobile}
          value={summaryTab}
          onChange={setSummaryTab}
          options={[
            {
              label: (
                <span>
                  <PieChartOutlined /> {!isMobile && 'Overview'}
                </span>
              ),
              value: 'overview'
            },
            {
              label: (
                <span>
                  <ShoppingCartOutlined /> {!isMobile && 'Transactions'}{' '}
                  <Badge
                    count={cashierTransactions.length}
                    size="small"
                    overflowCount={999}
                  />
                </span>
              ),
              value: 'transactions'
            }
          ]}
          style={{
            marginBottom: 16,
            background: token.colorBgContainer,
            padding: 4,
            borderRadius: 8
          }}
        />

        {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
        {summaryTab === 'overview' && (
          <Spin spinning={summaryLoading}>
            <Row gutter={[layoutConfig.gap, layoutConfig.gap]}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <ResponsiveStatCard
                  title="Total Revenue"
                  value={s.totalRevenue || 0}
                  prefix="KES"
                  icon={<DollarOutlined />}
                  color={colors.primary}
                >
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Source: <Tag color="processing">{s.dataSource || 'local'}</Tag>
                  </Text>
                </ResponsiveStatCard>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6}>
                <ResponsiveStatCard
                  title="Cost of Goods"
                  value={s.totalCOGS || 0}
                  prefix="KES"
                  icon={<BarcodeOutlined />}
                  color={colors.warning}
                >
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Items: {s.totalItemsSold || 0}
                  </Text>
                </ResponsiveStatCard>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6}>
                <ResponsiveStatCard
                  title="Net Profit"
                  value={s.netProfit || 0}
                  prefix="KES"
                  icon={<RiseOutlined />}
                  color={colors.success}
                >
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Margin: {s.profitMargin || 0}%
                  </Text>
                </ResponsiveStatCard>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6}>
                <ResponsiveStatCard
                  title="Transactions"
                  value={s.totalTransactions || 0}
                  icon={<ShoppingCartOutlined />}
                  color={colors.purple}
                  suffix="sales"
                />
              </Col>
            </Row>

            {/* Payment Composition */}
            <Card
              title={
                <Flex align="center" gap="small">
                  <BankOutlined style={{ color: colors.primary }} />
                  <Text strong>Payment Composition</Text>
                </Flex>
              }
              style={{ marginTop: 16, borderRadius: 12 }}
            >
              <Row gutter={[layoutConfig.gap, layoutConfig.gap]}>
                <Col xs={24} md={12}>
                  <Card
                    style={{
                      background: `${colors.success}10`,
                      borderRadius: 12,
                      border: 'none'
                    }}
                    bodyStyle={{ padding: 16 }}
                  >
                    <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                      <Text strong style={{ color: colors.success }}>
                        <MoneyCollectOutlined /> Cash
                      </Text>
                      <Tag color="green">{s.cashPercentage || 0}%</Tag>
                    </Flex>
                    <Title level={isMobile ? 4 : 3} style={{ color: colors.success, margin: '4px 0' }}>
                      KES {CalculationUtils.safeNumber(s.totalCash).toLocaleString('en-KE', {
                        minimumFractionDigits: 2
                      })}
                    </Title>
                    <Progress
                      percent={s.cashPercentage || 0}
                      strokeColor={colors.success}
                      showInfo={false}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card
                    style={{
                      background: `${colors.primary}10`,
                      borderRadius: 12,
                      border: 'none'
                    }}
                    bodyStyle={{ padding: 16 }}
                  >
                    <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                      <Text strong style={{ color: colors.primary }}>
                        <BankOutlined /> Bank / Mpesa
                      </Text>
                      <Tag color="blue">{s.mpesaBankPercentage || 0}%</Tag>
                    </Flex>
                    <Title level={isMobile ? 4 : 3} style={{ color: colors.primary, margin: '4px 0' }}>
                      KES {CalculationUtils.safeNumber(s.totalBankMpesa).toLocaleString('en-KE', {
                        minimumFractionDigits: 2
                      })}
                    </Title>
                    <Progress
                      percent={s.mpesaBankPercentage || 0}
                      strokeColor={colors.primary}
                      showInfo={false}
                    />
                  </Card>
                </Col>
              </Row>
            </Card>
          </Spin>
        )}

        {/* ═══════════════ TRANSACTIONS TAB ═══════════════ */}
        {summaryTab === 'transactions' && (
          <Spin spinning={transactionsLoading}>
            <Card
              title={
                <Flex align="center" gap="small">
                  <FileTextOutlined style={{ color: colors.primary }} />
                  <Text strong>
                    Transactions ({cashierTransactions.length})
                  </Text>
                </Flex>
              }
              style={{ borderRadius: 12 }}
              bodyStyle={{ padding: isMobile ? 12 : 16 }}
            >
              {cashierTransactions.length > 0 ? (
                <List
                  dataSource={cashierTransactions}
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
                    simple: isMobile,
                    showSizeChanger: !isMobile,
                    showTotal: !isMobile
                      ? (total, range) => `${range[0]}-${range[1]} of ${total} transactions`
                      : undefined
                  }}
                />
              ) : (
                <Empty
                  description={
                    <Text type="secondary">
                      No transactions found in this period
                    </Text>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ padding: '40px 0' }}
                />
              )}
            </Card>
          </Spin>
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
        <Card
          style={{
            borderRadius: 12,
            marginBottom: 24,
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
          bodyStyle={{ padding: isMobile ? 16 : 24 }}
        >
          <Flex vertical gap="middle">
            <Flex align="center" gap="middle" wrap="wrap">
              <div style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.purple})`,
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TeamOutlined style={{ color: 'white', fontSize: isMobile ? 24 : 28 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Cashier Management</Title>
                <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>
                  Manage cashiers and view their performance summary
                </Text>
              </div>
            </Flex>

            <Flex gap="middle" wrap="wrap" justify="space-between">
              <Input
                placeholder="Search by name, email or phone..."
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: isMobile ? '100%' : 300 }}
                size={isMobile ? 'middle' : 'large'}
                prefix={<SearchOutlined />}
              />

              <Flex gap="small" wrap="wrap">
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: isMobile ? '100%' : 130 }}
                  size={isMobile ? 'middle' : 'large'}
                >
                  <Option value="all">All Status</Option>
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                </Select>

                <Button
                  icon={<ReloadOutlined spin={loading} />}
                  onClick={fetchCashiers}
                  loading={loading}
                  size={isMobile ? 'middle' : 'large'}
                  type="primary"
                >
                  {!isMobile && 'Refresh'}
                </Button>

                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={handleAddCashier}
                  size={isMobile ? 'middle' : 'large'}
                  style={{
                    background: `linear-gradient(45deg, ${colors.primary}, ${colors.success})`,
                    border: 'none'
                  }}
                >
                  {!isMobile && 'Add Cashier'}
                </Button>
              </Flex>
            </Flex>

            <Row gutter={[8, 8]}>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title={<Text style={{ fontSize: isMobile ? 11 : 12 }}>Total</Text>}
                    value={cashiers.length}
                    valueStyle={{ color: colors.primary, fontSize: isMobile ? 16 : 20 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title={<Text style={{ fontSize: isMobile ? 11 : 12 }}>Active</Text>}
                    value={cashiers.filter(c => getCashierStatus(c) === 'active').length}
                    valueStyle={{ color: colors.success, fontSize: isMobile ? 16 : 20 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title={<Text style={{ fontSize: isMobile ? 11 : 12 }}>Inactive</Text>}
                    value={cashiers.filter(c => getCashierStatus(c) === 'inactive').length}
                    valueStyle={{ color: colors.warning, fontSize: isMobile ? 16 : 20 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title={<Text style={{ fontSize: isMobile ? 11 : 12 }}>Showing</Text>}
                    value={filteredCashiers.length}
                    suffix={`/ ${cashiers.length}`}
                    valueStyle={{ color: colors.purple, fontSize: isMobile ? 16 : 20 }}
                  />
                </Card>
              </Col>
            </Row>
          </Flex>
        </Card>

        <Table
          columns={columns}
          dataSource={filteredCashiers}
          loading={loading}
          rowKey={(record) => record?._id || Math.random().toString(36)}
          pagination={{
            pageSize: isMobile ? 5 : 10,
            size: isMobile ? 'small' : 'default',
            showSizeChanger: !isMobile,
            showTotal: (total) => `Total ${total} cashiers`
          }}
          scroll={{ x: 'max-content' }}
          size={isMobile ? 'small' : 'middle'}
          locale={{ emptyText: <Empty description="No cashiers found" /> }}
          onRow={(record) => ({
            onClick: () => { if (isMobile && record) handleViewCashier(record); },
            style: { cursor: isMobile ? 'pointer' : 'default' }
          })}
        />

        {isMobile && (
          <FloatButton.Group
            trigger="click"
            type="primary"
            icon={<SettingOutlined />}
            style={{ right: 24, bottom: 80 }}
          >
            <FloatButton icon={<ReloadOutlined />} onClick={fetchCashiers} tooltip="Refresh" />
            <FloatButton icon={<UserAddOutlined />} onClick={handleAddCashier} tooltip="Add Cashier" />
            <FloatButton icon={<MobileOutlined />} tooltip={`Mobile ${screens?.width}×${screens?.height}`} />
            <FloatButton.BackTop visibilityHeight={0} />
          </FloatButton.Group>
        )}

        {/* Add/Edit Modal */}
        <Modal
          title={editingCashier ? 'Edit Cashier' : 'Add New Cashier'}
          open={isModalOpen}
          onCancel={() => { setIsModalOpen(false); form.resetFields(); setPasswordValue(''); }}
          footer={null}
          destroyOnClose
          width={isMobile ? '90%' : 550}
          centered
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="Full Name"
              name="name"
              rules={[{ required: true, message: 'Please enter name' }]}
            >
              <Input placeholder="Cashier name" size="large" prefix={<UserOutlined />} />
            </Form.Item>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please enter email' },
                { type: 'email', message: 'Enter a valid email' }
              ]}
            >
              <Input placeholder="email@example.com" size="large" prefix={<MailOutlined />} />
            </Form.Item>
            <Form.Item label="Phone" name="phone">
              <Input placeholder="Phone (optional)" size="large" prefix={<PhoneOutlined />} />
            </Form.Item>
            <Form.Item
              label={
                <Flex align="center" gap="small">
                  <LockOutlined />
                  <span>Password {!editingCashier && <Text type="danger">*</Text>}</span>
                  {editingCashier && <Tag color="orange">Leave blank to keep current</Tag>}
                </Flex>
              }
              name="password"
              rules={[
                { required: !editingCashier, message: 'Password is required for new cashiers' },
                { min: 6, message: 'At least 6 characters' }
              ]}
            >
              <Input.Password
                placeholder={editingCashier ? 'New password (optional)' : 'Enter password'}
                size="large"
                prefix={<KeyOutlined />}
                visibilityToggle={{ visible: showPassword, onVisibleChange: setShowPassword }}
                onChange={(e) => setPasswordValue(e.target.value)}
              />
            </Form.Item>

            {passwordValue && (
              <div style={{ marginBottom: 24 }}>
                <PasswordStrengthIndicator password={passwordValue} />
              </div>
            )}

            <Alert
              message="Password Requirements"
              description={
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                  <li>Minimum 6 characters</li>
                  <li>Mix letters, numbers, symbols</li>
                  {editingCashier && <li>Leave blank to keep current password</li>}
                </ul>
              }
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: 24 }}
            />

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                style={{
                  background: `linear-gradient(45deg, ${colors.primary}, ${colors.success})`,
                  border: 'none',
                  height: 48,
                  fontSize: 16
                }}
              >
                {editingCashier ? 'Update Cashier' : 'Add Cashier'}
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* Desktop Summary Modal */}
        {!isMobile && (
          <Modal
            title={
              <Flex align="center" gap="middle">
                <BarChartOutlined style={{ fontSize: 20, color: colors.purple }} />
                <Flex vertical>
                  <Text strong>{viewingCashier?.name || 'Cashier'}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {viewingCashier?.email || ''}
                  </Text>
                </Flex>
              </Flex>
            }
            open={isViewModalOpen}
            onCancel={() => {
              setIsViewModalOpen(false);
              setCashierSummary({});
              setCashierTransactions([]);
            }}
            footer={[
              <Button
                key="refresh"
                icon={<ReloadOutlined />}
                onClick={handleManualRefresh}
                loading={summaryLoading || transactionsLoading}
              >
                Refresh
              </Button>,
              <Button
                key="close"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setCashierSummary({});
                  setCashierTransactions([]);
                }}
              >
                Close
              </Button>
            ]}
            width={isMobile ? '95%' : 1000}
            style={{ top: 20 }}
            bodyStyle={{
              padding: 24,
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto'
            }}
          >
            {viewingCashier && <CashierSummaryView />}
          </Modal>
        )}

        {/* Mobile Summary Drawer */}
        <Drawer
          title={
            <Flex vertical gap="small">
              <Flex align="center" gap="small">
                <UserOutlined style={{ color: colors.primary }} />
                <Text strong>{viewingCashier?.name || 'Cashier'}</Text>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {viewingCashier?.email || ''}
              </Text>
            </Flex>
          }
          placement="right"
          onClose={() => {
            setDrawerVisible(false);
            setCashierSummary({});
            setCashierTransactions([]);
          }}
          open={drawerVisible}
          width={screens?.width > 400 ? '90%' : '100%'}
          bodyStyle={{ padding: 16, paddingBottom: 80 }}
          extra={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleManualRefresh}
                size="small"
                loading={summaryLoading || transactionsLoading}
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
          {viewingCashier && <CashierSummaryView />}
        </Drawer>
      </Content>
    </Layout>
  );
};

export default CashierManagement;