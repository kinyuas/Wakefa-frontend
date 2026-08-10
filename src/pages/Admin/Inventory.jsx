import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Statistic,
  Input,
  Tag,
  Row,
  Col,
  Typography,
  Alert,
  Button,
  Modal,
  Form,
  InputNumber,
  Select,
  message,
  Space,
  Popconfirm,
  Spin,
  Tooltip,
  Badge,
  Divider,
  Progress,
  ConfigProvider,
  Descriptions
} from 'antd';
import { 
  AppstoreOutlined, 
  SearchOutlined, 
  PlusOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  EditOutlined,
  InboxOutlined,
  WarningOutlined,
  DollarOutlined,
  ShopOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  DownloadOutlined,
  BarcodeOutlined,
  StockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { productAPI, handleApiError, shopAPI } from '../../services/api';

const { Option } = Select;
const { TextArea } = Input;

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [stats, setStats] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [restockModalVisible, setRestockModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form] = Form.useForm();
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedShopFilter, setSelectedShopFilter] = useState('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState('all');

  // Modern color palette
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

  // Custom styles
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
    stockDisplay: {
      backgroundColor: '#fff2f0',
      padding: '6px 12px',
      borderRadius: '10px',
      border: `2px solid ${colors.danger}`,
      boxShadow: '0 2px 8px rgba(255, 77, 79, 0.1)',
      fontWeight: '800'
    }
  };

  // Enhanced API response handler
  const handleApiResponse = useCallback((response, dataKey = 'data') => {
    console.log('📦 API Response:', response);
    
    if (!response) {
      console.warn('⚠️ No response received');
      return null;
    }

    if (Array.isArray(response)) {
      console.log('✅ Returning array response');
      return response;
    }

    if (response.success !== undefined) {
      if (response.success) {
        if (response[dataKey] !== undefined) {
          console.log(`✅ Extracted ${dataKey} from success response`);
          return response[dataKey];
        } else if (response.data) {
          console.log('✅ Extracted data from success response');
          return response.data;
        } else {
          console.log('✅ Returning full success response');
          return response;
        }
      } else {
        throw new Error(response.message || 'API request failed');
      }
    }

    if (response[dataKey] !== undefined) {
      console.log(`✅ Extracted ${dataKey} from response`);
      return response[dataKey];
    }

    console.log('⚠️ No specific structure found, returning full response');
    return response;
  }, []);

  // Fetch shops data
  const fetchShops = useCallback(async () => {
    try {
      console.log('🔄 Fetching shops data...');
      const response = await shopAPI.getAll();
      const shopsData = handleApiResponse(response, 'shops');
      
      if (shopsData && Array.isArray(shopsData)) {
        console.log('✅ Shops loaded:', shopsData.length);
        setShops(shopsData);
      } else {
        console.warn('⚠️ No shops data found or invalid format');
      }
    } catch (error) {
      console.error('❌ Failed to fetch shops:', error);
    }
  }, [handleApiResponse]);

  // Calculate statistics from inventory data
  const calculateStats = useCallback((inventoryData) => {
    if (!inventoryData || !Array.isArray(inventoryData)) {
      console.log('⚠️ No products list for stats calculation');
      return;
    }
    
    const totalProducts = inventoryData.length;
    const lowStockCount = inventoryData.filter(item => 
      (item.currentStock || 0) > 0 && (item.currentStock || 0) <= (item.minStockLevel || 5)
    ).length;
    const outOfStockCount = inventoryData.filter(item => (item.currentStock || 0) === 0).length;
    const inStockCount = inventoryData.filter(item => (item.currentStock || 0) > (item.minStockLevel || 5)).length;
    
    const totalInventoryValue = inventoryData.reduce((total, item) => {
      return total + (item.buyingPrice || 0) * (item.currentStock || 0);
    }, 0);
    
    const totalPotentialValue = inventoryData.reduce((total, item) => {
      return total + (item.minSellingPrice || 0) * (item.currentStock || 0);
    }, 0);
    
    const avgStockLevel = inventoryData.reduce((total, item) => {
      return total + (item.currentStock || 0);
    }, 0) / totalProducts;
    
    setStats({
      totalProducts,
      lowStockCount,
      outOfStockCount,
      inStockCount,
      totalInventoryValue,
      totalPotentialValue,
      avgStockLevel
    });
    
    console.log('📊 Inventory stats calculated:', stats);
  }, []);

  // Get shop name from product
  const getShopName = useCallback((product) => {
    if (!product) return 'Unknown Shop';
    
    if (product.shop && typeof product.shop === 'object') {
      return product.shop.name || product.shop.shopName || 'Unknown Shop';
    } else if (product.shop && shops.length > 0) {
      const foundShop = shops.find(shop => shop._id === product.shop);
      return foundShop?.name || 'Unknown Shop';
    } else if (product.shop) {
      return product.shop;
    }
    
    return 'Unknown Shop';
  }, [shops]);
// In Inventory.jsx - Update the fetchInventory function
const fetchInventory = useCallback(async () => {
  try {
    setFetching(true);
    setError(null);
    console.log('🔄 Fetching inventory data...');
    
    // Request ALL products with a high limit
    const response = await productAPI.getAll({ 
      page: 1, 
      limit: 9999  // ← Request up to 9999 products
    });
    
    console.log('📦 Raw inventory API response:', response);
    
    const inventoryData = handleApiResponse(response, 'products');
    console.log('🔄 Processed inventory data:', inventoryData);
    
    if (inventoryData && Array.isArray(inventoryData)) {
      console.log('✅ Inventory loaded:', inventoryData.length);
      setInventory(inventoryData);
      calculateStats(inventoryData);
    } else if (inventoryData && typeof inventoryData === 'object') {
      const possibleArrays = Object.values(inventoryData).filter(value => Array.isArray(value));
      if (possibleArrays.length > 0) {
        const inventoryArray = possibleArrays[0];
        console.log('✅ Inventory extracted from object:', inventoryArray.length);
        setInventory(inventoryArray);
        calculateStats(inventoryArray);
      } else {
        const errorMsg = 'No products array found in response';
        setError(errorMsg);
        console.error('❌ Inventory API error:', errorMsg);
      }
    } else {
      const errorMsg = 'Invalid inventory data format';
      setError(errorMsg);
      console.error('❌ Inventory API error:', errorMsg);
    }
  } catch (error) {
    console.error('❌ Failed to fetch inventory:', error);
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'Failed to load inventory data. Please check your connection.';
    setError(errorMessage);
  } finally {
    setFetching(false);
  }
}, [calculateStats, handleApiResponse]);

  // Fetch both inventory and shops on component mount
  useEffect(() => {
    const fetchData = async () => {
      await fetchShops();
      await fetchInventory();
    };
    
    fetchData();
  }, [fetchInventory, fetchShops]);

  // Handle stock update
  const handleStockUpdate = async (values) => {
    try {
      setLoading(true);
      
      if (!selectedProduct || !selectedProduct._id) {
        message.error('No product selected for update');
        return;
      }

      const updatedStock = (selectedProduct.currentStock || 0) + Number(values.quantity);
      
      if (updatedStock < 0) {
        message.error('Stock cannot be negative');
        return;
      }

      const updateData = {
        currentStock: updatedStock,
        name: selectedProduct.name,
        category: selectedProduct.category,
        buyingPrice: selectedProduct.buyingPrice,
        minSellingPrice: selectedProduct.minSellingPrice,
        minStockLevel: selectedProduct.minStockLevel || 5,
        shop: selectedProduct.shop?._id || selectedProduct.shop
      };

      console.log('📤 Updating product stock:', {
        productId: selectedProduct._id,
        updateData: updateData
      });

      const response = await productAPI.update(selectedProduct._id, updateData);
      console.log('📦 Stock update response:', response);
      
      if (response && (response.success || response._id)) {
        const updatedProduct = handleApiResponse(response);
        
        const updatedInventory = inventory.map(item => 
          item._id === selectedProduct._id 
            ? { ...item, ...updatedProduct, currentStock: updatedStock }
            : item
        );
        
        setInventory(updatedInventory);
        calculateStats(updatedInventory);
        message.success({
          content: 'Stock updated successfully',
          style: {
            marginTop: '50vh',
          }
        });
        setIsModalVisible(false);
        form.resetFields();
      } else {
        throw new Error(response?.message || 'Failed to update stock');
      }
    } catch (error) {
      console.error('❌ Error updating stock:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to update stock. Please try again.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk restock
  const handleRestock = async () => {
    try {
      setLoading(true);
      
      const lowStockItems = inventory.filter(item => 
        (item.currentStock || 0) <= (item.minStockLevel || 5)
      );

      if (lowStockItems.length === 0) {
        message.info('No low stock items found');
        return;
      }

      console.log(`🔄 Restocking ${lowStockItems.length} low stock items`);

      const updatePromises = lowStockItems.map(item => {
        const restockQuantity = (item.minStockLevel || 5) * 2;
        const updateData = {
          currentStock: restockQuantity,
          name: item.name,
          category: item.category,
          buyingPrice: item.buyingPrice,
          minSellingPrice: item.minSellingPrice,
          minStockLevel: item.minStockLevel || 5,
          shop: item.shop?._id || item.shop
        };
        
        console.log(`📤 Restocking product ${item._id}:`, updateData);
        return productAPI.update(item._id, updateData);
      });

      const results = await Promise.all(updatePromises);
      console.log('📦 Restock results:', results);

      await fetchInventory();
      
      message.success({
        content: `${lowStockItems.length} items restocked successfully`,
        style: {
          marginTop: '50vh',
        }
      });
      setRestockModalVisible(false);
    } catch (error) {
      console.error('❌ Error restocking:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to restock products. Please try again.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const showUpdateModal = (product) => {
    setSelectedProduct(product);
    setIsModalVisible(true);
    form.setFieldsValue({
      quantity: 0,
      reason: 'restock',
      notes: ''
    });
  };

  const showViewModal = (product) => {
    setSelectedProduct(product);
    setViewModalVisible(true);
  };

  // Stock status helper function
  const getStockStatus = (product) => {
    if (!product) return { status: 'default', text: 'Unknown', color: '#d9d9d9' };
    
    const currentStock = product.currentStock || 0;
    const minStockLevel = product.minStockLevel || 5;
    
    if (currentStock === 0) {
      return { 
        status: 'error', 
        text: 'Out of Stock', 
        color: colors.danger,
        gradient: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)'
      };
    } else if (currentStock <= minStockLevel) {
      return { 
        status: 'warning', 
        text: 'Low Stock', 
        color: colors.warning,
        gradient: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)'
      };
    } else {
      return { 
        status: 'success', 
        text: 'In Stock', 
        color: colors.success,
        gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)'
      };
    }
  };

  const getStockPercentage = (product) => {
    if (!product) return 0;
    const currentStock = product.currentStock || 0;
    const minStockLevel = product.minStockLevel || 5;
    const maxStockLevel = minStockLevel * 4; // Assume 4x min level is full
    
    if (currentStock >= maxStockLevel) return 100;
    return Math.min(100, (currentStock / maxStockLevel) * 100);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // Get unique categories for filter
  const categories = Array.from(new Set(inventory.map(item => item.category).filter(Boolean)));

  // Filter inventory based on search text and filters
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = searchText === '' || 
      item.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchText.toLowerCase()) ||
      getShopName(item).toLowerCase().includes(searchText.toLowerCase()) ||
      item.barcode?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesCategory = selectedCategoryFilter === 'all' || item.category === selectedCategoryFilter;
    const matchesShop = selectedShopFilter === 'all' || getShopName(item) === selectedShopFilter;
    const matchesStock = selectedStockFilter === 'all' || 
      (selectedStockFilter === 'out' && (item.currentStock || 0) === 0) ||
      (selectedStockFilter === 'low' && (item.currentStock || 0) > 0 && (item.currentStock || 0) <= (item.minStockLevel || 5)) ||
      (selectedStockFilter === 'in' && (item.currentStock || 0) > (item.minStockLevel || 5));
    
    return matchesSearch && matchesCategory && matchesShop && matchesStock;
  });

  const columns = [
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: '600' }}>
          <InboxOutlined style={{ marginRight: 8, color: colors.primary }} />
          Product
        </div>
      ),
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      render: (name, record) => (
        <div style={{ padding: '4px 0' }}>
          <div style={{ 
            fontWeight: '700', 
            fontSize: '14px',
            color: colors.dark,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }} 
          onClick={() => showViewModal(record)}>
            {name || 'Unknown Product'}
            {record.barcode && (
              <Tooltip title={`Barcode: ${record.barcode}`}>
                <BarcodeOutlined style={{ 
                  marginLeft: 8, 
                  fontSize: '12px', 
                  color: colors.darkLight 
                }} />
              </Tooltip>
            )}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: colors.darkLight,
            marginTop: '2px'
          }}>
            {record.category || 'Uncategorized'}
          </div>
          <Tag 
            style={{ 
              marginTop: '4px',
              background: getStockStatus(record).gradient,
              color: colors.white,
              fontWeight: '600',
              border: 'none',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px'
            }}
          >
            {getStockStatus(record).text}
          </Tag>
        </div>
      ),
      width: 180
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: '600' }}>
          <DollarOutlined style={{ marginRight: 8, color: colors.success }} />
          Prices
        </div>
      ),
      key: 'prices',
      render: (record) => (
        <div style={{ padding: '4px 0' }}>
          <div style={{ 
            fontSize: '13px',
            fontWeight: '600',
            color: colors.danger
          }}>
            Buy: {formatCurrency(record.buyingPrice)}
          </div>
          <div style={{ 
            fontSize: '13px',
            fontWeight: '600',
            color: colors.success,
            marginTop: '4px'
          }}>
            Sell: {formatCurrency(record.minSellingPrice)}
          </div>
        </div>
      ),
      width: 120
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: '600' }}>
          <StockOutlined style={{ marginRight: 8, color: colors.info }} />
          Stock Level
        </div>
      ),
      key: 'stock',
      render: (record) => {
        const stockStatus = getStockStatus(record);
        const stockPercentage = getStockPercentage(record);
        
        return (
          <div style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={styles.stockDisplay}>
                <span style={{ 
                  color: stockStatus.color,
                  fontSize: '14px'
                }}>
                  {record.currentStock || 0}
                </span>
                <span style={{ 
                  fontSize: '11px',
                  color: colors.darkLight,
                  marginLeft: '4px'
                }}>
                  /{record.minStockLevel || 5}
                </span>
              </div>
              {(record.currentStock || 0) <= (record.minStockLevel || 5) && (
                <Tooltip title={`Low stock alert! Minimum level: ${record.minStockLevel || 5}`}>
                  <ExclamationCircleOutlined style={{ 
                    color: colors.warning,
                    fontSize: '16px'
                  }} />
                </Tooltip>
              )}
            </div>
            <Progress 
              percent={stockPercentage}
              size="small"
              strokeColor={stockStatus.color}
              style={{ 
                marginTop: '8px',
                fontSize: '10px'
              }}
              showInfo={false}
            />
          </div>
        );
      },
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
      sorter: (a, b) => getShopName(a).localeCompare(getShopName(b)),
      render: (shop, record) => {
        const shopName = getShopName(record);
        return (
          <Tag 
            color={colors.secondary}
            style={{ 
              background: `linear-gradient(135deg, ${colors.secondaryLight} 0%, ${colors.secondary} 100%)`,
              color: colors.white,
              fontWeight: '600',
              border: 'none',
              padding: '2px 10px',
              borderRadius: '12px'
            }}
          >
            {shopName}
          </Tag>
        );
      },
      width: 120
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Space size="small" style={{ display: 'flex', justifyContent: 'center' }}>
          <Tooltip title="View Details" color={colors.primary}>
            <Button 
              type="primary"
              size="small"
              icon={<EyeOutlined style={{ fontSize: '12px' }} />}
              onClick={(e) => {
                e.stopPropagation();
                showViewModal(record);
              }}
              style={{ 
                ...styles.primaryButton,
                padding: '4px 6px',
                height: '26px',
                minWidth: '26px'
              }}
            />
          </Tooltip>
          <Tooltip title="Update Stock" color={colors.success}>
            <Button 
              size="small"
              icon={<EditOutlined style={{ fontSize: '12px' }} />}
              onClick={(e) => {
                e.stopPropagation();
                showUpdateModal(record);
              }}
              style={{ 
                ...styles.successButton,
                padding: '4px 6px',
                height: '26px',
                minWidth: '26px'
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Add inline CSS for global styles
  useEffect(() => {
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
      
      .inventory-table-row {
        transition: all 0.2s ease;
      }
      
      .inventory-table-row:hover {
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
        min-height: 24px !important;
        font-weight: 500 !important;
      }
      
      .ant-select-item-option-content {
        display: flex !important;
        align-items: center !important;
      }
      
      /* Responsive adjustments */
      @media (max-width: 768px) {
        .ant-table-thead > tr > th {
          padding: 12px 6px !important;
          font-size: 12px !important;
        }
        
        .ant-table-tbody > tr > td {
          padding: 12px 6px !important;
          font-size: 12px !important;
        }
        
        .ant-tag {
          font-size: 10px !important;
          padding: 1px 6px !important;
        }
        
        .ant-statistic-title {
          font-size: 11px !important;
        }
        
        .ant-statistic-content {
          font-size: 16px !important;
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
        width: 6px;
        height: 6px;
      }
      
      ::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      
      ::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (fetching && inventory.length === 0) {
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
          Loading inventory...
        </p>
        <p style={{ 
          color: 'rgba(255,255,255,0.8)',
          fontSize: 14
        }}>
          Please wait while we fetch your products
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
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <AppstoreOutlined style={{ 
                  fontSize: '28px', 
                  color: colors.white,
                  marginRight: '12px'
                }} />
                <h1 style={{ 
                  color: colors.white, 
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: '800',
                  lineHeight: '1.2'
                }}>
                  Inventory Management
                </h1>
              </div>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                margin: 0,
                fontSize: '15px',
                maxWidth: '600px'
              }}>
                Track stock levels, manage products, and monitor inventory value
              </p>
            </div>
            <Space wrap>
              <Button 
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setRestockModalVisible(true)}
                disabled={fetching || inventory.length === 0}
                style={{ 
                  ...styles.primaryButton,
                  padding: '10px 20px',
                  height: 'auto'
                }}
              >
                Quick Restock
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchInventory}
                loading={fetching}
                style={{ 
                  backgroundColor: colors.white,
                  color: colors.primary,
                  border: 'none',
                  fontWeight: '600',
                  padding: '10px 20px'
                }}
              >
                Refresh
              </Button>
            </Space>
          </div>
        </Card>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={12} lg={6}>
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
                    <InboxOutlined style={{ marginRight: 8 }} />
                    Total Products
                  </span>
                }
                value={stats.totalProducts || 0}
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
                    items
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={6}>
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
                    <WarningOutlined style={{ marginRight: 8 }} />
                    Low Stock
                  </span>
                }
                value={stats.lowStockCount || 0}
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
                    items
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={6}>
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
                    <DollarOutlined style={{ marginRight: 8 }} />
                    Total Value
                  </span>
                }
                value={stats.totalInventoryValue || 0}
                precision={0}
                valueStyle={{ 
                  color: colors.white, 
                  fontSize: '20px',
                  fontWeight: '800',
                  marginTop: '8px'
                }}
                formatter={(value) => formatCurrency(value)}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={6}>
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
                    <CloseCircleOutlined style={{ marginRight: 8 }} />
                    Out of Stock
                  </span>
                }
                value={stats.outOfStockCount || 0}
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
                    items
                  </span>
                }
              />
            </Card>
          </Col>
        </Row>

        {error && (
          <Alert
            message="Error Loading Inventory"
            description={error}
            type="error"
            showIcon
            action={
              <Button 
                size="small" 
                onClick={fetchInventory}
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
                Search & Filter Products
              </h3>
              <p style={{ 
                margin: '4px 0 0 0',
                color: '#666',
                fontSize: '14px'
              }}>
                Find products using search and filters
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Badge 
                count={filteredInventory.length} 
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
                of {inventory.length} total
              </span>
            </div>
          </div>

          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Search products..."
                prefix={<SearchOutlined style={{ color: colors.primary }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
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
                placeholder="Category"
                value={selectedCategoryFilter}
                onChange={setSelectedCategoryFilter}
                style={{ width: '100%' }}
                size="large"
                dropdownStyle={{ borderRadius: '10px' }}
                allowClear
              >
                <Option value="all">All Categories</Option>
                {categories.map(category => (
                  <Option key={category} value={category}>{category}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Select
                placeholder="Shop"
                value={selectedShopFilter}
                onChange={setSelectedShopFilter}
                style={{ width: '100%' }}
                size="large"
                dropdownStyle={{ borderRadius: '10px' }}
                allowClear
              >
                <Option value="all">All Shops</Option>
                {Array.from(new Set(inventory.map(item => getShopName(item)))).map(shop => (
                  <Option key={shop} value={shop}>{shop}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Select
                placeholder="Stock Status"
                value={selectedStockFilter}
                onChange={setSelectedStockFilter}
                style={{ width: '100%' }}
                size="large"
                dropdownStyle={{ borderRadius: '10px' }}
              >
                <Option value="all">All Stock</Option>
                <Option value="out">Out of Stock</Option>
                <Option value="low">Low Stock</Option>
                <Option value="in">In Stock</Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={4} lg={3}>
              <Button 
                icon={<FilterOutlined />}
                onClick={() => {
                  setSelectedCategoryFilter('all');
                  setSelectedShopFilter('all');
                  setSelectedStockFilter('all');
                  setSearchText('');
                }}
                style={{ width: '100%' }}
                size="large"
              >
                Clear
              </Button>
            </Col>
            <Col xs={12} sm={6} md={4} lg={3}>
              <Button 
                icon={<DownloadOutlined />}
                style={{ width: '100%' }}
                size="large"
                onClick={() => message.success('Export feature coming soon!')}
                style={styles.successButton}
              >
                Export
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Inventory Table */}
        <Card
          style={styles.tableCard}
          bodyStyle={{ padding: 0 }}
        >
          {filteredInventory.length === 0 && !fetching ? (
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
                📦
              </div>
              <h3 style={{ 
                color: colors.dark,
                marginBottom: '12px',
                fontSize: '20px',
                fontWeight: '700'
              }}>
                {searchText || selectedCategoryFilter !== 'all' 
                  ? 'No Products Found'
                  : 'No Products Yet'}
              </h3>
              <p style={{ 
                color: colors.darkLight,
                marginBottom: '32px',
                fontSize: '15px',
                maxWidth: '400px',
                margin: '0 auto 32px'
              }}>
                {searchText || selectedCategoryFilter !== 'all' 
                  ? 'Try adjusting your search terms or filters'
                  : 'Start adding products to manage your inventory'}
              </p>
            </div>
          ) : (
            <div style={{ 
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}>
              <Table 
                columns={columns} 
                dataSource={filteredInventory} 
                rowKey="_id"
                loading={fetching}
                pagination={{ 
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} of ${total} products`,
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
                rowClassName={() => 'inventory-table-row'}
                style={{
                  minWidth: '800px'
                }}
                onRow={(record) => ({
                  onClick: () => showViewModal(record),
                  style: { 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }
                })}
              />
            </div>
          )}
        </Card>

        {/* Update Stock Modal */}
        <Modal
          title={
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              fontSize: '20px',
              fontWeight: '700',
              color: colors.dark
            }}>
              <EditOutlined style={{ 
                marginRight: '12px', 
                color: colors.primary,
                fontSize: '24px'
              }} />
              Update Stock - {selectedProduct?.name}
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
          style={{
            top: 20,
            borderRadius: '16px',
            overflow: 'hidden'
          }}
          bodyStyle={{
            padding: '24px 24px 0'
          }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleStockUpdate}
            initialValues={{ quantity: 0, reason: 'restock' }}
            size="large"
          >
            <div style={{ 
              backgroundColor: '#f0f5ff',
              padding: '16px',
              borderRadius: '10px',
              marginBottom: '24px'
            }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Product Name">
                  <strong>{selectedProduct?.name}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Current Stock">
                  <span style={{ 
                    color: getStockStatus(selectedProduct).color,
                    fontWeight: '700',
                    fontSize: '16px'
                  }}>
                    {selectedProduct?.currentStock || 0}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Min Stock Level">
                  {selectedProduct?.minStockLevel || 5}
                </Descriptions.Item>
              </Descriptions>
            </div>
            
            <Form.Item
              name="quantity"
              label="Adjustment Quantity"
              rules={[
                { required: true, message: 'Please enter quantity' },
                { 
                  validator: (_, value) => {
                    const numValue = Number(value);
                    if (isNaN(numValue)) {
                      return Promise.reject('Please enter a valid number');
                    }
                    const newStock = (selectedProduct?.currentStock || 0) + numValue;
                    if (newStock < 0) {
                      return Promise.reject('Resulting stock cannot be negative');
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <InputNumber 
                placeholder="Positive to add, negative to remove" 
                style={{ width: '100%' }}
                min={-1000}
                max={1000}
                disabled={loading}
                prefix={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {form.getFieldValue('quantity') > 0 ? (
                      <ArrowUpOutlined style={{ color: colors.success }} />
                    ) : form.getFieldValue('quantity') < 0 ? (
                      <ArrowDownOutlined style={{ color: colors.danger }} />
                    ) : null}
                  </div>
                }
              />
            </Form.Item>

            <Form.Item
              name="reason"
              label="Reason for Adjustment"
              rules={[{ required: true, message: 'Please select a reason' }]}
            >
              <Select placeholder="Select reason" disabled={loading}>
                <Option value="restock">Restock</Option>
                <Option value="damaged">Damaged Goods</Option>
                <Option value="return">Customer Return</Option>
                <Option value="adjustment">Stock Adjustment</Option>
                <Option value="other">Other</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="notes"
              label="Additional Notes"
            >
              <TextArea 
                placeholder="Enter any additional notes..." 
                rows={3} 
                disabled={loading}
                maxLength={500}
                showCount
              />
            </Form.Item>

            <div style={{ 
              textAlign: 'right',
              padding: '16px 0',
              borderTop: `1px solid ${colors.light}`,
              marginTop: '24px'
            }}>
              <Button 
                onClick={() => setIsModalVisible(false)}
                disabled={loading}
                style={{ 
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.primary}`,
                  color: colors.primary,
                  fontWeight: '600',
                  marginRight: '12px'
                }}
                size="large"
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                style={{ 
                  ...styles.primaryButton,
                  padding: '10px 32px',
                  minWidth: '140px',
                  fontWeight: '600',
                  fontSize: '15px'
                }}
                size="large"
              >
                Update Stock
              </Button>
            </div>
          </Form>
        </Modal>

        {/* View Product Modal */}
        <Modal
          title={
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              fontSize: '20px',
              fontWeight: '700',
              color: colors.dark
            }}>
              <EyeOutlined style={{ 
                marginRight: '12px', 
                color: colors.primary,
                fontSize: '24px'
              }} />
              Product Details - {selectedProduct?.name}
            </div>
          }
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          footer={[
            <Button 
              key="update" 
              type="primary" 
              onClick={() => {
                setViewModalVisible(false);
                showUpdateModal(selectedProduct);
              }}
              style={styles.primaryButton}
            >
              Update Stock
            </Button>,
            <Button 
              key="close" 
              onClick={() => setViewModalVisible(false)}
              style={{ 
                border: `1px solid ${colors.primary}`,
                color: colors.primary
              }}
            >
              Close
            </Button>
          ]}
          width="90%"
          maxWidth="500px"
          style={{
            borderRadius: '16px',
            overflow: 'hidden'
          }}
        >
          {selectedProduct && (
            <div style={{ padding: '8px 0' }}>
              <Descriptions column={1} size="middle">
                <Descriptions.Item label="Product Name">
                  <strong>{selectedProduct.name}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Category">
                  <Tag color="blue">{selectedProduct.category || 'Uncategorized'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Buying Price">
                  <span style={{ color: colors.danger, fontWeight: '700' }}>
                    {formatCurrency(selectedProduct.buyingPrice)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Selling Price">
                  <span style={{ color: colors.success, fontWeight: '700' }}>
                    {formatCurrency(selectedProduct.minSellingPrice)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Current Stock">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      color: getStockStatus(selectedProduct).color,
                      fontWeight: '800',
                      fontSize: '18px'
                    }}>
                      {selectedProduct.currentStock || 0}
                    </span>
                    <Tag 
                      style={{ 
                        background: getStockStatus(selectedProduct).gradient,
                        color: colors.white,
                        fontWeight: '600',
                        border: 'none'
                      }}
                    >
                      {getStockStatus(selectedProduct).text}
                    </Tag>
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Minimum Stock Level">
                  {selectedProduct.minStockLevel || 5}
                </Descriptions.Item>
                <Descriptions.Item label="Shop">
                  <Tag color={colors.secondary}>
                    {getShopName(selectedProduct)}
                  </Tag>
                </Descriptions.Item>
                {selectedProduct.barcode && (
                  <Descriptions.Item label="Barcode">
                    <Tag icon={<BarcodeOutlined />}>
                      {selectedProduct.barcode}
                    </Tag>
                  </Descriptions.Item>
                )}
                {selectedProduct.createdAt && (
                  <Descriptions.Item label="Created">
                    {new Date(selectedProduct.createdAt).toLocaleString()}
                  </Descriptions.Item>
                )}
                {selectedProduct.updatedAt && (
                  <Descriptions.Item label="Last Updated">
                    {new Date(selectedProduct.updatedAt).toLocaleString()}
                  </Descriptions.Item>
                )}
              </Descriptions>
              
              {selectedProduct.currentStock <= selectedProduct.minStockLevel && (
                <Alert
                  message="Low Stock Alert"
                  description={`Current stock (${selectedProduct.currentStock}) is at or below minimum level (${selectedProduct.minStockLevel || 5})`}
                  type="warning"
                  showIcon
                  style={{ marginTop: '20px', borderRadius: '10px' }}
                />
              )}
            </div>
          )}
        </Modal>

        {/* Quick Restock Modal */}
        <Modal
          title={
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              fontSize: '20px',
              fontWeight: '700',
              color: colors.dark
            }}>
              <ArrowUpOutlined style={{ 
                marginRight: '12px', 
                color: colors.success,
                fontSize: '24px'
              }} />
              Quick Restock Low Stock Items
            </div>
          }
          open={restockModalVisible}
          onCancel={() => setRestockModalVisible(false)}
          footer={[
            <Button 
              key="cancel" 
              onClick={() => setRestockModalVisible(false)}
              disabled={loading}
              style={{ 
                border: `1px solid ${colors.primary}`,
                color: colors.primary
              }}
            >
              Cancel
            </Button>,
            <Popconfirm
              key="restock"
              title="Are you sure you want to restock all low stock items?"
              description="This will set stock levels to 2x the minimum stock level for all low stock items."
              onConfirm={handleRestock}
              okText="Yes, Restock All"
              cancelText="Cancel"
              disabled={loading}
              okButtonProps={{ style: styles.successButton }}
            >
              <Button 
                type="primary" 
                loading={loading}
                style={styles.successButton}
              >
                Restock All
              </Button>
            </Popconfirm>
          ]}
          width="90%"
          maxWidth="500px"
          style={{
            borderRadius: '16px',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '8px 0' }}>
            <p style={{ marginBottom: '16px', fontSize: '15px' }}>
              This will restock all items that are at or below their minimum stock level to 2x their minimum level.
            </p>
            
            <div style={{ 
              backgroundColor: '#e6f7ff',
              padding: '16px',
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontWeight: '600', color: colors.dark }}>
                  Items to Restock:
                </span>
                <Badge 
                  count={inventory.filter(item => (item.currentStock || 0) <= (item.minStockLevel || 5)).length}
                  style={{ 
                    backgroundColor: colors.warning,
                    fontSize: '16px',
                    fontWeight: '700'
                  }}
                />
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ color: colors.darkLight }}>
                  Out of Stock:
                </span>
                <span style={{ fontWeight: '600', color: colors.danger }}>
                  {inventory.filter(item => (item.currentStock || 0) === 0).length}
                </span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: colors.darkLight }}>
                  Low Stock:
                </span>
                <span style={{ fontWeight: '600', color: colors.warning }}>
                  {inventory.filter(item => 
                    (item.currentStock || 0) > 0 && (item.currentStock || 0) <= (item.minStockLevel || 5)
                  ).length}
                </span>
              </div>
            </div>
            
            <Alert
              message="Note"
              description="Stock levels will be set to 2x the minimum stock level for each low stock item."
              type="info"
              showIcon
              style={{ borderRadius: '10px' }}
            />
          </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default Inventory;