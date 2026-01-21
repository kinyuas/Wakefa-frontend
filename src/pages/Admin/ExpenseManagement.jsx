import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  DatePicker, 
  Select, 
  message, 
  Breadcrumb, 
  Spin, 
  Tag, 
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Alert,
  Tooltip,
  InputNumber,
  Badge,
  Divider,
  ConfigProvider
} from 'antd';
import { 
  DollarOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  HomeOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  ShopOutlined,
  MoneyCollectOutlined,
  BarChartOutlined,
  SortAscendingOutlined,
  DownloadOutlined,
  PieChartOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { expenseAPI, shopAPI } from '../../services/api';
import dayjs from 'dayjs';

const ExpenseManagement = () => {
  const [expenses, setExpenses] = useState([]);
  const [shops, setShops] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalAmount: 0,
    averageExpense: 0,
    todayExpenses: 0,
    highestExpense: 0
  });
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // Search and filter states
  const [searchText, setSearchText] = useState('');
  const [selectedShopFilter, setSelectedShopFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modern color palette with vibrant colors
  const colors = {
    primary: '#1890ff',
    primaryLight: '#69c0ff',
    secondary: '#722ed1',
    secondaryLight: '#9254de',
    success: '#52c41a',
    successLight: '#95de64',
    warning: '#fa8c16',
    warningLight: '#ffc069',
    danger: '#ff4d4f',
    dangerLight: '#ff7875',
    info: '#13c2c2',
    infoLight: '#36cfc9',
    dark: '#1f1f1f',
    darkLight: '#434343',
    light: '#f8f9fa',
    white: '#ffffff'
  };

  const categories = [
    { value: 'rent', label: 'Rent', color: '#ff6b6b', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)', icon: '🏢' },
    { value: 'utilities', label: 'Utilities', color: '#4d96ff', gradient: 'linear-gradient(135deg, #4d96ff 0%, #2779bd 100%)', icon: '💡' },
    { value: 'salaries', label: 'Salaries', color: '#6bc77e', gradient: 'linear-gradient(135deg, #6bc77e 0%, #38a169 100%)', icon: '💰' },
    { value: 'supplies', label: 'Supplies', color: '#ffa94d', gradient: 'linear-gradient(135deg, #ffa94d 0%, #f6993f 100%)', icon: '📦' },
    { value: 'maintenance', label: 'Maintenance', color: '#9d4edd', gradient: 'linear-gradient(135deg, #9d4edd 0%, #805ad5 100%)', icon: '🔧' },
    { value: 'marketing', label: 'Marketing', color: '#00c9c8', gradient: 'linear-gradient(135deg, #00c9c8 0%, #00a3af 100%)', icon: '📢' },
    { value: 'transport', label: 'Transport', color: '#ff8a65', gradient: 'linear-gradient(135deg, #ff8a65 0%, #ed8936 100%)', icon: '🚚' },
    { value: 'other', label: 'Other', color: '#95a5a6', gradient: 'linear-gradient(135deg, #95a5a6 0%, #718096 100%)', icon: '📝' }
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Cash', color: colors.success, gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)', icon: '💵' },
    { value: 'mpesa', label: 'M-Pesa/Bank', color: colors.primary, gradient: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', icon: '📱' }
  ];

  // Custom styles object
  const styles = {
    mainContainer: {
      padding: '16px 12px',
      minHeight: '100vh',
      backgroundColor: '#f5f7fa',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"
    },
    headerCard: {
      marginBottom: 16,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: 'none',
      borderRadius: '16px',
      boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
      overflow: 'hidden'
    },
    statCard: {
      border: 'none',
      borderRadius: '14px',
      boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    tableCard: {
      border: 'none',
      borderRadius: '16px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      overflow: 'hidden'
    },
    filterCard: {
      marginBottom: '20px',
      border: 'none',
      borderRadius: '14px',
      boxShadow: '0 6px 20px rgba(0,0,0,0.05)',
      background: colors.white
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: 'none',
      borderRadius: '10px',
      fontWeight: '600',
      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
      transition: 'all 0.3s ease'
    },
    dangerButton: {
      background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
      border: 'none',
      borderRadius: '10px',
      fontWeight: '600',
      boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)',
      transition: 'all 0.3s ease'
    },
    successButton: {
      background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
      border: 'none',
      borderRadius: '10px',
      fontWeight: '600',
      boxShadow: '0 4px 15px rgba(82, 196, 26, 0.4)',
      transition: 'all 0.3s ease'
    },
    amountDisplay: {
      backgroundColor: '#fff2f0',
      padding: '8px 12px',
      borderRadius: '10px',
      border: `2px solid ${colors.danger}`,
      boxShadow: '0 2px 8px rgba(255, 77, 79, 0.1)'
    },
    categoryTag: {
      color: colors.white,
      fontWeight: '700',
      border: 'none',
      padding: '4px 12px',
      borderRadius: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    modalStyle: {
      borderRadius: '16px',
      overflow: 'hidden'
    }
  };

  const handleApiResponse = useCallback((response) => {
    if (!response) return null;

    if (Array.isArray(response)) {
      return response;
    }

    if (response.success !== undefined) {
      if (response.success) {
        return response.data || response;
      } else {
        throw new Error(response.message || 'API request failed');
      }
    }

    return response.data || response;
  }, []);

  const handleApiError = useCallback((error, defaultMessage) => {
    let errorMessage = defaultMessage;
    
    if (error.response) {
      const responseData = error.response.data;
      errorMessage = responseData?.message || 
                   responseData?.error || 
                   `Server error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'No response from server. Please check if the backend is running.';
    } else {
      errorMessage = error.message;
    }
    
    message.error(errorMessage);
    return errorMessage;
  }, []);

  const fetchShops = useCallback(async () => {
    setShopLoading(true);
    try {
      const response = await shopAPI.getAll();
      const shopsData = handleApiResponse(response);
      
      if (shopsData && Array.isArray(shopsData)) {
        setShops(shopsData);
      } else {
        console.warn('Unexpected shops response format:', shopsData);
        setShops([]);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to load shops';
      message.warning(errorMessage);
      setShops([]);
    } finally {
      setShopLoading(false);
    }
  }, [handleApiResponse]);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await expenseAPI.getAll();
      const expensesData = handleApiResponse(response);
      
      if (expensesData && Array.isArray(expensesData)) {
        setExpenses(expensesData);
        calculateStats(expensesData);
      } else {
        setError('Invalid expenses data format received from server');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to load expenses. Please check your connection.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [handleApiResponse]);

  useEffect(() => {
    fetchExpenses();
    fetchShops();
  }, [fetchExpenses, fetchShops]);

  const calculateStats = useCallback((expensesData) => {
    if (!expensesData || !Array.isArray(expensesData)) {
      setStats({
        totalExpenses: 0,
        totalAmount: 0,
        averageExpense: 0,
        todayExpenses: 0,
        highestExpense: 0
      });
      return;
    }

    const today = dayjs().startOf('day');
    const totalExpenses = expensesData.length;
    const totalAmount = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;
    const todayExpenses = expensesData.filter(expense => 
      dayjs(expense.date).isSame(today, 'day')
    ).reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const highestExpense = expensesData.length > 0 ? 
      Math.max(...expensesData.map(e => e.amount || 0)) : 0;

    setStats({
      totalExpenses,
      totalAmount,
      averageExpense,
      todayExpenses,
      highestExpense
    });
  }, []);

  const handleRefresh = () => {
    fetchExpenses();
    message.success('Data refreshed successfully');
  };

  const handleAddExpense = () => {
    form.resetFields();
    setEditingExpense(null);
    setIsModalVisible(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    form.setFieldsValue({
      ...expense,
      date: expense.date ? dayjs(expense.date) : null,
      shop: expense.shop || (shops.length > 0 ? shops[0]._id : '')
    });
    setIsModalVisible(true);
  };

  const handleDeleteExpense = useCallback(async (id) => {
    Modal.confirm({
      title: (
        <div style={{ display: 'flex', alignItems: 'center', color: colors.danger }}>
          <ExclamationCircleOutlined style={{ fontSize: '20px', marginRight: '8px' }} />
          <span style={{ fontWeight: '600' }}>Confirm Delete</span>
        </div>
      ),
      content: (
        <div style={{ padding: '8px 0' }}>
          <p style={{ marginBottom: '4px', fontWeight: '500' }}>Are you sure you want to delete this expense?</p>
          <p style={{ color: '#666', fontSize: '14px' }}>This action cannot be undone.</p>
        </div>
      ),
      icon: null,
      okText: 'Yes, Delete',
      okButtonProps: {
        style: {
          ...styles.dangerButton,
          padding: '8px 20px'
        }
      },
      cancelButtonProps: {
        style: {
          border: `1px solid ${colors.primary}`,
          color: colors.primary,
          borderRadius: '10px',
          padding: '8px 20px'
        }
      },
      onOk: async () => {
        try {
          await expenseAPI.delete(id);
          const updatedExpenses = expenses.filter(expense => expense._id !== id);
          setExpenses(updatedExpenses);
          calculateStats(updatedExpenses);
          message.success({
            content: 'Expense deleted successfully',
            style: {
              marginTop: '50vh',
            }
          });
        } catch (error) {
          console.error('Error deleting expense:', error);
          handleApiError(error, 'Failed to delete expense');
        }
      },
      width: 400,
      centered: true
    });
  }, [expenses, calculateStats, handleApiError, colors, styles]);

  const shopOptions = useMemo(() => {
    const options = shops.map(shop => ({
      value: shop._id,
      label: shop.name || shop.shopName || `Shop ${shop._id}`,
      key: shop._id
    }));
    return options;
  }, [shops]);

  const prepareExpenseData = useCallback((values) => {
    if (!values.shop) {
      throw new Error('Please select a shop for this expense.');
    }

    const selectedShop = shops.find(shop => shop._id === values.shop);
    
    if (!selectedShop) {
      throw new Error('Selected shop not found. Please refresh and try again.');
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
      referenceNumber: `EXP-${Date.now().toString().slice(-6)}`
    };

    return expenseData;
  }, [shops]);

  const handleSubmit = useCallback(async (values) => {
    setFormLoading(true);
    try {
      const expenseData = prepareExpenseData(values);

      if (!expenseData.amount || expenseData.amount <= 0) {
        message.error('Amount must be greater than 0');
        return;
      }

      let result;
      if (editingExpense) {
        result = await expenseAPI.update(editingExpense._id, expenseData);
        const updatedExpenses = expenses.map(expense => 
          expense._id === editingExpense._id ? result : expense
        );
        setExpenses(updatedExpenses);
        calculateStats(updatedExpenses);
        message.success({
          content: 'Expense updated successfully',
          style: {
            marginTop: '50vh',
          }
        });
      } else {
        result = await expenseAPI.create(expenseData);
        const newExpenses = [result, ...expenses];
        setExpenses(newExpenses);
        calculateStats(newExpenses);
        message.success({
          content: 'Expense added successfully',
          style: {
            marginTop: '50vh',
          }
        });
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error submitting expense:', error);
      
      if (error.response?.status === 400) {
        message.error('Validation failed. Please check your input.');
      } else if (error.response?.status === 409) {
        message.error('An expense with similar details already exists');
      } else if (error.response?.status === 404) {
        message.error('Expense not found. It may have been deleted.');
      } else {
        const errorMessage = error.message || 
                           (editingExpense ? 'Failed to update expense' : 'Failed to add expense');
        message.error(errorMessage);
      }
    } finally {
      setFormLoading(false);
    }
  }, [editingExpense, expenses, calculateStats, form, prepareExpenseData]);

  const getCategoryColor = (category) => {
    return categories.find(cat => cat.value === category)?.color || colors.dark;
  };

  const getCategoryGradient = (category) => {
    return categories.find(cat => cat.value === category)?.gradient || `linear-gradient(135deg, ${colors.dark} 0%, ${colors.darkLight} 100%)`;
  };

  const getCategoryIcon = (category) => {
    return categories.find(cat => cat.value === category)?.icon || '📝';
  };

  const getPaymentMethodColor = (method) => {
    return paymentMethods.find(pm => pm.value === method)?.color || colors.dark;
  };

  const getPaymentMethodGradient = (method) => {
    return paymentMethods.find(pm => pm.value === method)?.gradient || `linear-gradient(135deg, ${colors.dark} 0%, ${colors.darkLight} 100%)`;
  };

  const getPaymentMethodIcon = (method) => {
    return paymentMethods.find(pm => pm.value === method)?.icon || '💳';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatCompactCurrency = (amount) => {
    if (amount >= 1000000) {
      return `KES ${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `KES ${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  const formatDate = (date) => {
    return date ? dayjs(date).format('DD/MM/YYYY') : 'N/A';
  };

  const getShopName = (shopId) => {
    if (!shopId) {
      return 'No Shop Assigned';
    }

    const actualShopId = typeof shopId === 'object' ? shopId._id : shopId;
    
    const shop = shops.find(s => {
      const shopMongoId = s._id?.toString();
      const providedId = actualShopId?.toString();
      return shopMongoId === providedId;
    });

    if (shop) {
      return shop.name || shop.shopName || 'Unknown Shop Name';
    }

    return 'Shop Not Found';
  };

  const shopFilterOptions = useMemo(() => {
    const baseOptions = [
      { value: 'all', label: 'All Shops' }
    ];
    
    return [...baseOptions, ...shopOptions];
  }, [shopOptions]);

  const categoryFilterOptions = useMemo(() => {
    const baseOptions = [
      { value: 'all', label: 'All Categories' }
    ];
    
    const categoryOptions = categories.map(cat => ({
      value: cat.value,
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: 8, fontSize: '16px' }}>{cat.icon}</span>
          <span style={{ fontWeight: '500' }}>{cat.label}</span>
        </span>
      )
    }));
    
    return [...baseOptions, ...categoryOptions];
  }, [categories]);

  const paymentFilterOptions = useMemo(() => {
    const baseOptions = [
      { value: 'all', label: 'All Payment Methods' }
    ];
    
    const paymentOptions = paymentMethods.map(pm => ({
      value: pm.value,
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: 8, fontSize: '16px' }}>{pm.icon}</span>
          <span style={{ fontWeight: '500' }}>{pm.label}</span>
        </span>
      )
    }));
    
    return [...baseOptions, ...paymentOptions];
  }, [paymentMethods]);

  const filteredExpenses = useMemo(() => {
    if (!expenses || !Array.isArray(expenses)) return [];

    let result = expenses.filter(expense => {
      const matchesSearch = searchText === '' || 
        (expense.description && expense.description.toLowerCase().includes(searchText.toLowerCase())) ||
        (expense.category && expense.category.toLowerCase().includes(searchText.toLowerCase())) ||
        (getShopName(expense.shop) && getShopName(expense.shop).toLowerCase().includes(searchText.toLowerCase())) ||
        (expense.recordedBy && expense.recordedBy.toLowerCase().includes(searchText.toLowerCase()));

      const matchesShop = selectedShopFilter === 'all' || 
        expense.shop === selectedShopFilter;

      const matchesCategory = selectedCategoryFilter === 'all' || 
        expense.category === selectedCategoryFilter;

      const matchesPayment = selectedPaymentFilter === 'all' || 
        expense.paymentMethod === selectedPaymentFilter;

      return matchesSearch && matchesShop && matchesCategory && matchesPayment;
    });

    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [expenses, searchText, selectedShopFilter, selectedCategoryFilter, selectedPaymentFilter, getShopName, sortOrder]);

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
    setSortOrder('desc');
    message.success('Filters cleared');
  }, []);

  const toggleSortOrder = useCallback(() => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newOrder);
    message.info(`Sorted by date: ${newOrder === 'desc' ? 'Newest first' : 'Oldest first'}`);
  }, [sortOrder]);

  const columns = useMemo(() => [
    { 
      title: (
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: '600' }}>
          <CalendarOutlined style={{ marginRight: 8, color: colors.primary }} />
          Date
        </div>
      ), 
      dataIndex: 'date', 
      key: 'date',
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      render: (date) => (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          padding: '4px 0'
        }}>
          <div style={{
            backgroundColor: '#e6f7ff',
            padding: '6px 10px',
            borderRadius: '8px',
            border: `1px solid ${colors.primaryLight}`,
            fontWeight: '600',
            fontSize: '13px'
          }}>
            {formatDate(date)}
          </div>
        </div>
      ),
      width: 120
    },
    { 
      title: (
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: '600' }}>
          <PieChartOutlined style={{ marginRight: 8, color: colors.secondary }} />
          Category
        </div>
      ), 
      dataIndex: 'category', 
      key: 'category',
      render: (category) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ 
            fontSize: '18px', 
            marginRight: '8px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
          }}>
            {getCategoryIcon(category)}
          </span>
          <Tag 
            style={{ 
              background: getCategoryGradient(category),
              ...styles.categoryTag
            }}
          >
            {categories.find(cat => cat.value === category)?.label || category}
          </Tag>
        </div>
      ),
      width: 140
    },
    { 
      title: (
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: '600' }}>
          <MoneyCollectOutlined style={{ marginRight: 8, color: colors.danger }} />
          Amount
        </div>
      ), 
      dataIndex: 'amount', 
      key: 'amount', 
      render: amount => (
        <div style={styles.amountDisplay}>
          <span style={{ 
            fontWeight: '800', 
            color: colors.danger,
            fontSize: '15px',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            {formatCurrency(amount)}
          </span>
        </div>
      ),
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
      width: 140
    },
    { 
      title: (
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: '600' }}>
          <ShopOutlined style={{ marginRight: 8, color: colors.secondary }} />
          Shop
        </div>
      ), 
      dataIndex: 'shop', 
      key: 'shop',
      render: (shopId) => {
        const shopName = getShopName(shopId);
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              backgroundColor: '#f0f5ff',
              padding: '6px 12px',
              borderRadius: '8px',
              border: `1px solid ${colors.primaryLight}`,
              fontWeight: '600',
              fontSize: '13px'
            }}>
              {shopName}
            </div>
          </div>
        );
      },
      width: 140
    },
    { 
      title: (
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: '600' }}>
          <LineChartOutlined style={{ marginRight: 8, color: colors.success }} />
          Payment
        </div>
      ), 
      dataIndex: 'paymentMethod', 
      key: 'paymentMethod',
      render: (method) => (
        <Tag 
          style={{ 
            background: getPaymentMethodGradient(method),
            ...styles.categoryTag,
            padding: '4px 14px'
          }}
        >
          <span style={{ marginRight: 6, fontSize: '14px' }}>
            {getPaymentMethodIcon(method)}
          </span>
          {paymentMethods.find(pm => pm.value === method)?.label || method}
        </Tag>
      ),
      width: 140
    },
    { 
      title: 'Actions', 
      key: 'action',
      fixed: 'right',
      width: 110,
      render: (_, record) => (
        <Space size="small" style={{ display: 'flex', justifyContent: 'center' }}>
          <Tooltip title="Edit Expense" color={colors.primary}>
            <Button 
              type="primary" 
              size="small"
              icon={<EditOutlined style={{ fontSize: '14px' }} />}
              onClick={(e) => {
                e.stopPropagation();
                handleEditExpense(record);
              }}
              style={{ 
                ...styles.primaryButton,
                padding: '4px 8px',
                height: '28px',
                minWidth: '28px'
              }}
            />
          </Tooltip>
          <Tooltip title="Delete Expense" color={colors.danger}>
            <Button 
              size="small"
              icon={<DeleteOutlined style={{ fontSize: '14px' }} />}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteExpense(record._id);
              }}
              style={{ 
                ...styles.dangerButton,
                padding: '4px 8px',
                height: '28px',
                minWidth: '28px'
              }}
            />
          </Tooltip>
        </Space>
      )
    },
  ], [handleEditExpense, handleDeleteExpense, colors, styles]);

  // Add inline CSS for global styles
  const addGlobalStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      
      * {
        box-sizing: border-box;
      }
      
      body {
        margin: 0;
        padding: 0;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      .expense-table-row {
        transition: all 0.2s ease;
      }
      
      .expense-table-row:hover {
        background-color: #fafafa !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important;
      }
      
      .ant-table-row:hover {
        cursor: pointer;
      }
      
      .ant-card {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      
      .ant-card:hover {
        transform: translateY(-2px);
      }
      
      .ant-btn {
        transition: all 0.3s ease !important;
      }
      
      .ant-btn:active {
        transform: scale(0.98);
      }
      
      .ant-input:focus,
      .ant-input-number:focus,
      .ant-select-focused .ant-select-selector,
      .ant-picker-focused {
        border-color: ${colors.primary} !important;
        box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1) !important;
      }
      
      .ant-tag {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 28px !important;
        font-weight: 500 !important;
      }
      
      .ant-select-item-option-content {
        display: flex !important;
        align-items: center !important;
      }
      
      /* Responsive adjustments */
      @media (max-width: 768px) {
        .ant-table-thead > tr > th {
          padding: 12px 8px !important;
          font-size: 13px !important;
        }
        
        .ant-table-tbody > tr > td {
          padding: 12px 8px !important;
          font-size: 13px !important;
        }
        
        .ant-tag {
          font-size: 11px !important;
          padding: 2px 8px !important;
        }
        
        .ant-statistic-title {
          font-size: 12px !important;
        }
        
        .ant-statistic-content {
          font-size: 18px !important;
        }
      }
      
      @media (max-width: 576px) {
        .ant-modal {
          max-width: 95vw !important;
          margin: 10px auto !important;
        }
        
        .ant-modal-body {
          padding: 16px !important;
        }
        
        .ant-btn {
          padding: 6px 12px !important;
          height: auto !important;
        }
      }
      
      /* Custom scrollbar */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
      
      /* Gradient text */
      .gradient-text {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  };

  useEffect(() => {
    const cleanup = addGlobalStyles();
    return cleanup;
  }, []);

  if (loading && expenses.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '80vh',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Spin 
          size="large" 
          style={{ 
            color: colors.white,
            marginBottom: 24 
          }}
        />
        <p style={{ 
          color: colors.white,
          fontSize: 18,
          fontWeight: '600',
          marginBottom: 8
        }}>
          Loading expenses...
        </p>
        <p style={{ 
          color: 'rgba(255,255,255,0.8)',
          fontSize: 14
        }}>
          Please wait while we fetch your data
        </p>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: colors.primary,
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"
        },
        components: {
          Card: {
            borderRadiusLG: 16,
            boxShadowTertiary: '0 8px 25px rgba(0,0,0,0.08)'
          },
          Button: {
            borderRadius: 8,
            controlHeight: 36
          },
          Table: {
            borderRadius: 8,
            headerBg: '#fafafa',
            headerColor: colors.dark,
            rowHoverBg: '#fafafa'
          }
        }
      }}
    >
      <div style={styles.mainContainer}>
        {/* Header Section */}
        <Card 
          style={styles.headerCard}
          bodyStyle={{ padding: '20px 24px' }}
        >
          <Breadcrumb 
            style={{ marginBottom: 20 }}
            separator={<span style={{ color: 'rgba(255,255,255,0.6)' }}>›</span>}
            items={[
              {
                title: (
                  <span style={{ 
                    cursor: 'pointer',
                    color: colors.white,
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onClick={() => navigate('/admin/dashboard')}
                  >
                    <HomeOutlined style={{ marginRight: 8 }} />
                    Dashboard
                  </span>
                ),
              },
              {
                title: (
                  <span style={{ 
                    color: colors.white, 
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <DollarOutlined style={{ marginRight: 8 }} />
                    Expense Management
                  </span>
                ),
              },
            ]}
          />

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h1 style={{ 
                color: colors.white, 
                margin: '0 0 8px 0',
                fontSize: '28px',
                fontWeight: '800',
                lineHeight: '1.2'
              }}>
                Expense Management
              </h1>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                margin: 0,
                fontSize: '15px',
                maxWidth: '600px'
              }}>
                Track, manage, and analyze all business expenses in one place
              </p>
            </div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddExpense}
              disabled={shopOptions.length === 0}
              style={{ 
                ...styles.primaryButton,
                padding: '10px 24px',
                height: 'auto',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center'
              }}
              size="large"
            >
              Add Expense
            </Button>
          </div>
        </Card>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              style={{ 
                ...styles.statCard,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
              }}
              bodyStyle={{ padding: '20px' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Statistic
                title={
                  <span style={{ 
                    color: colors.white, 
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <BarChartOutlined style={{ marginRight: 8 }} />
                    Total Expenses
                  </span>
                }
                value={stats.totalExpenses}
                valueStyle={{ 
                  color: colors.white, 
                  fontSize: '28px',
                  fontWeight: '800',
                  marginTop: '8px'
                }}
                suffix={
                  <span style={{ 
                    fontSize: '16px',
                    fontWeight: '600',
                    opacity: 0.9
                  }}>
                    expenses
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              style={{ 
                ...styles.statCard,
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
              }}
              bodyStyle={{ padding: '20px' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Statistic
                title={
                  <span style={{ 
                    color: colors.white, 
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <MoneyCollectOutlined style={{ marginRight: 8 }} />
                    Total Amount
                  </span>
                }
                value={stats.totalAmount}
                precision={0}
                valueStyle={{ 
                  color: colors.white, 
                  fontSize: '28px',
                  fontWeight: '800',
                  marginTop: '8px'
                }}
                formatter={(value) => formatCompactCurrency(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              style={{ 
                ...styles.statCard,
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              }}
              bodyStyle={{ padding: '20px' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Statistic
                title={
                  <span style={{ 
                    color: colors.white, 
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    Today's Expenses
                  </span>
                }
                value={stats.todayExpenses}
                precision={0}
                valueStyle={{ 
                  color: colors.white, 
                  fontSize: '28px',
                  fontWeight: '800',
                  marginTop: '8px'
                }}
                formatter={(value) => formatCompactCurrency(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              style={{ 
                ...styles.statCard,
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
              }}
              bodyStyle={{ padding: '20px' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Statistic
                title={
                  <span style={{ 
                    color: colors.white, 
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <LineChartOutlined style={{ marginRight: 8 }} />
                    Highest Expense
                  </span>
                }
                value={stats.highestExpense}
                precision={0}
                valueStyle={{ 
                  color: colors.white, 
                  fontSize: '28px',
                  fontWeight: '800',
                  marginTop: '8px'
                }}
                formatter={(value) => formatCompactCurrency(value)}
              />
            </Card>
          </Col>
        </Row>

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
                style={{ ...styles.primaryButton, border: 'none' }}
              >
                Retry
              </Button>
            }
            style={{ 
              marginBottom: '24px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%)'
            }}
          />
        )}

        {/* Search and Filter Section */}
        <Card 
          style={styles.filterCard}
          bodyStyle={{ padding: '24px' }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h3 style={{ 
                margin: 0,
                fontSize: '18px',
                fontWeight: '700',
                color: colors.dark,
                display: 'flex',
                alignItems: 'center'
              }}>
                <SearchOutlined style={{ marginRight: '10px', color: colors.primary }} />
                Search & Filter Expenses
              </h3>
              <p style={{ 
                margin: '4px 0 0 0',
                color: '#666',
                fontSize: '14px'
              }}>
                Find specific expenses using filters below
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Badge 
                count={filteredExpenses.length} 
                showZero 
                style={{ 
                  backgroundColor: colors.primary,
                  boxShadow: '0 0 0 2px #fff'
                }}
              />
              <span style={{ 
                color: '#666', 
                fontSize: '14px',
                fontWeight: '500'
              }}>
                of {expenses.length} total
              </span>
            </div>
          </div>

          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Search by description, category, shop..."
                prefix={<SearchOutlined style={{ color: colors.primary }} />}
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                allowClear
                size="large"
                style={{
                  borderRadius: '10px',
                  border: `1px solid #e8e8e8`
                }}
              />
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Select
                placeholder="Shop"
                value={selectedShopFilter}
                onChange={handleShopFilterChange}
                options={shopFilterOptions}
                style={{ width: '100%' }}
                size="large"
                suffixIcon={<ShopOutlined style={{ color: colors.primary }} />}
                dropdownStyle={{ borderRadius: '10px' }}
              />
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Select
                placeholder="Category"
                value={selectedCategoryFilter}
                onChange={handleCategoryFilterChange}
                options={categoryFilterOptions}
                style={{ width: '100%' }}
                size="large"
                dropdownStyle={{ borderRadius: '10px' }}
              />
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Select
                placeholder="Payment"
                value={selectedPaymentFilter}
                onChange={handlePaymentFilterChange}
                options={paymentFilterOptions}
                style={{ width: '100%' }}
                size="large"
                dropdownStyle={{ borderRadius: '10px' }}
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
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ 
              color: colors.dark, 
              fontSize: '15px',
              fontWeight: '500'
            }}>
              <span style={{ 
                color: colors.primary,
                fontWeight: '700',
                fontSize: '16px'
              }}>
                {filteredExpenses.length}
              </span>
              {' '}expenses found
              {searchText && (
                <span style={{ marginLeft: '8px', color: colors.darkLight }}>
                  matching "<strong>{searchText}</strong>"
                </span>
              )}
            </div>
            <Space size="middle" wrap>
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
              <Button 
                icon={<DownloadOutlined />}
                size="large"
                onClick={() => message.success('Export feature coming soon!')}
                style={styles.successButton}
              >
                Export
              </Button>
            </Space>
          </div>
        </Card>

        {/* Expenses Table */}
        <Card
          style={styles.tableCard}
          bodyStyle={{ padding: 0 }}
        >
          {shopOptions.length === 0 && !shopLoading && (
            <Alert
              message="No Shops Available"
              description={
                <div>
                  You need to create shops first before adding expenses.{' '}
                  <a href="#" onClick={(e) => {
                    e.preventDefault();
                    navigate('/admin/shops');
                  }} style={{ fontWeight: '600' }}>
                    Go to Shops Management
                  </a>
                </div>
              }
              type="warning"
              showIcon
              style={{ 
                margin: '20px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #fffbe6 0%, #ffe58f 100%)'
              }}
            />
          )}

          {filteredExpenses.length === 0 && !loading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              backgroundColor: '#fafafa',
              borderRadius: '16px'
            }}>
              <div style={{
                fontSize: '64px',
                marginBottom: '20px',
                opacity: 0.6,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
              }}>
                💸
              </div>
              <h3 style={{ 
                color: colors.dark,
                marginBottom: '12px',
                fontSize: '20px',
                fontWeight: '700'
              }}>
                {searchText || selectedShopFilter !== 'all' 
                  ? 'No Matching Expenses Found'
                  : 'No Expenses Yet'}
              </h3>
              <p style={{ 
                color: colors.darkLight,
                marginBottom: '32px',
                fontSize: '15px',
                maxWidth: '400px',
                margin: '0 auto 32px'
              }}>
                {searchText || selectedShopFilter !== 'all' 
                  ? 'Try adjusting your search terms or filters'
                  : 'Start tracking your business expenses to get insights'}
              </p>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddExpense}
                disabled={shopOptions.length === 0}
                size="large"
                style={{ 
                  ...styles.primaryButton,
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
                  simple: false,
                  style: {
                    padding: '20px 24px',
                    margin: 0,
                    borderRadius: '0 0 16px 16px'
                  }
                }}
                scroll={{ x: 'max-content' }}
                size="middle"
                rowClassName={() => 'expense-table-row'}
                style={{
                  minWidth: '800px'
                }}
                onRow={(record) => ({
                  onClick: () => handleEditExpense(record),
                  style: { 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }
                })}
              />
            </div>
          )}
        </Card>

        {/* Add/Edit Expense Modal */}
        <Modal
          title={
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              fontSize: '20px',
              fontWeight: '700',
              color: colors.dark
            }}>
              <DollarOutlined style={{ 
                marginRight: '12px', 
                color: colors.primary,
                fontSize: '24px'
              }} />
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              {editingExpense && (
                <span style={{ 
                  marginLeft: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.darkLight
                }}>
                  ID: {editingExpense.referenceNumber || editingExpense._id?.slice(-6)}
                </span>
              )}
            </div>
          }
          open={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false);
            form.resetFields();
          }}
          footer={null}
          destroyOnClose
          width="90%"
          maxWidth="500px"
          maskClosable={false}
          style={{
            top: 20,
            borderRadius: '16px',
            overflow: 'hidden'
          }}
          bodyStyle={{
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '24px 24px 0'
          }}
          className="expense-modal"
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
            size="large"
          >
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item 
                  name="date" 
                  label={
                    <span style={{ 
                      fontWeight: '600',
                      fontSize: '15px'
                    }}>
                      <CalendarOutlined style={{ marginRight: '8px' }} />
                      Date
                    </span>
                  } 
                  rules={[{ required: true, message: 'Please select a date' }]}
                >
                  <DatePicker 
                    style={{ width: '100%' }} 
                    format="YYYY-MM-DD"
                    placeholder="Select date"
                    disabledDate={(current) => current && current > dayjs().endOf('day')}
                    suffixIcon={<CalendarOutlined style={{ color: colors.primary }} />}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item 
                  name="shop" 
                  label={
                    <span style={{ 
                      fontWeight: '600',
                      fontSize: '15px'
                    }}>
                      <ShopOutlined style={{ marginRight: '8px' }} />
                      Shop
                    </span>
                  } 
                  rules={[{ required: true, message: 'Please select a shop' }]}
                  help={shopOptions.length === 0 ? (
                    <span style={{ color: colors.danger }}>
                      No shops available. Please add shops first.
                    </span>
                  ) : undefined}
                >
                  <Select 
                    placeholder="Select shop"
                    loading={shopLoading}
                    disabled={shopOptions.length === 0}
                    options={shopOptions}
                    suffixIcon={<ShopOutlined style={{ color: colors.primary }} />}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item 
                  name="category" 
                  label={
                    <span style={{ 
                      fontWeight: '600',
                      fontSize: '15px'
                    }}>
                      <PieChartOutlined style={{ marginRight: '8px' }} />
                      Category
                    </span>
                  } 
                  rules={[{ required: true, message: 'Please select a category' }]}
                >
                  <Select 
                    options={categories.map(cat => ({
                      ...cat,
                      label: (
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ 
                            marginRight: 12, 
                            fontSize: '18px',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                          }}>
                            {cat.icon}
                          </span>
                          <span style={{ fontWeight: '500' }}>{cat.label}</span>
                        </span>
                      )
                    }))} 
                    placeholder="Select category" 
                    showSearch
                    filterOption={(input, option) =>
                      option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item 
                  name="paymentMethod" 
                  label={
                    <span style={{ 
                      fontWeight: '600',
                      fontSize: '15px'
                    }}>
                      <LineChartOutlined style={{ marginRight: '8px' }} />
                      Payment Method
                    </span>
                  } 
                  rules={[{ required: true, message: 'Please select payment method' }]}
                >
                  <Select 
                    options={paymentMethods.map(pm => ({
                      ...pm,
                      label: (
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ 
                            marginRight: 12, 
                            fontSize: '18px',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                          }}>
                            {pm.icon}
                          </span>
                          <span style={{ fontWeight: '500' }}>{pm.label}</span>
                        </span>
                      )
                    }))} 
                    placeholder="Select payment method" 
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item 
              name="amount" 
              label={
                <span style={{ 
                  fontWeight: '600',
                  fontSize: '15px'
                }}>
                  <MoneyCollectOutlined style={{ marginRight: '8px' }} />
                  Amount (KES)
                </span>
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
                addonBefore={
                  <span style={{ 
                    fontWeight: '600',
                    color: colors.danger
                  }}>
                    KES
                  </span>
                }
                size="large"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/(,*)/g, '')}
              />
            </Form.Item>

            <Form.Item 
              name="description" 
              label={
                <span style={{ 
                  fontWeight: '600',
                  fontSize: '15px'
                }}>
                  Description
                </span>
              }
            >
              <Input.TextArea 
                placeholder="Enter expense description (optional)"
                rows={3}
                maxLength={200}
                showCount
                style={{ resize: 'vertical' }}
              />
            </Form.Item>

            <Form.Item 
              name="notes" 
              label={
                <span style={{ 
                  fontWeight: '600',
                  fontSize: '15px'
                }}>
                  Additional Notes
                </span>
              }
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
              padding: '20px 0',
              borderTop: `1px solid ${colors.light}`,
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
                style={{ 
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.primary}`,
                  color: colors.primary,
                  fontWeight: '600'
                }}
                disabled={formLoading}
                size="large"
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={formLoading}
                disabled={shopOptions.length === 0}
                size="large"
                style={{ 
                  ...styles.primaryButton,
                  padding: '10px 32px',
                  minWidth: '140px',
                  fontWeight: '600',
                  fontSize: '15px'
                }}
              >
                {editingExpense ? 'Update Expense' : 'Add Expense'}
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default ExpenseManagement;