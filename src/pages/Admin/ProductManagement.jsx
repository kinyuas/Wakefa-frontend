// src/pages/Admin/ProductManagement.jsx - COMPLETE UPDATED VERSION (BARCODE REMOVED)
import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef 
} from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Spin, 
  Alert, 
  Space, 
  Card, 
  Statistic, 
  Row, 
  Col, 
  Tag, 
  InputNumber,
  Tooltip,
  Badge,
  Divider,
  Typography,
  Layout,
  Grid,
  Drawer,
  FloatButton,
  Empty,
  notification,
  Avatar,
  List,
  Tabs,
  Popconfirm
} from 'antd';
import { 
  ProductOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined, 
  EyeOutlined, 
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  WarningOutlined,
  CheckCircleOutlined, 
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
  MenuOutlined,
  AppstoreOutlined,
  StockOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { productAPI, shopAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { TabPane } = Tabs;

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ 
    total: 0, 
    lowStock: 0, 
    outOfStock: 0, 
    inStock: 0
  });

  // Responsive states
  const screens = useBreakpoint();
  const [deviceType, setDeviceType] = useState('desktop');
  const [orientation, setOrientation] = useState('portrait');
  const [mobileView, setMobileView] = useState('products');
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Search and filter states
  const [searchText, setSearchText] = useState('');
  const [selectedShopFilter, setSelectedShopFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  
  const [form] = Form.useForm();
  const searchInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Device detection
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

  // Device configurations
  const deviceConfig = useMemo(() => ({
    isMobile: ['android', 'ios', 'mobile'].includes(deviceType),
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isLandscape: orientation === 'landscape',
    deviceType,
    cardPadding: deviceType === 'mobile' ? '8px' : '16px',
    fontSize: {
      small: deviceType === 'mobile' ? '10px' : '12px',
      medium: deviceType === 'mobile' ? '12px' : '14px',
      large: deviceType === 'mobile' ? '14px' : '16px'
    }
  }), [deviceType, orientation]);

  // API response handler
  const handleApiResponse = useCallback((response) => {
    if (!response) return null;
    if (Array.isArray(response)) return response;
    if (response.success !== undefined) {
      if (response.success) return response.data || response;
      throw new Error(response.message || 'API request failed');
    }
    return response.data || response;
  }, []);

  // Fetch shops
  const fetchShops = useCallback(async () => {
    try {
      const response = await shopAPI.getAll();
      const shopsData = handleApiResponse(response);
      if (shopsData && Array.isArray(shopsData)) {
        setShops(shopsData);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      notification.warning({
        message: 'Shops Loading Failed',
        description: 'Failed to load shops',
        placement: deviceConfig.isMobile ? 'bottom' : 'topRight',
      });
    }
  }, [handleApiResponse, deviceConfig.isMobile]);

  // Extract categories from products
  const extractCategoriesFromProducts = useCallback((productsList) => {
    if (!productsList || !Array.isArray(productsList)) return [];
    const uniqueCategories = [...new Set(
      productsList
        .map(p => p.category)
        .filter(cat => cat && typeof cat === 'string')
        .map(cat => cat.trim())
        .filter(cat => cat.length > 0)
    )];
    return uniqueCategories.sort();
  }, []);

  // Calculate product statistics
  const calculateStats = useCallback((productsList) => {
    if (!productsList || !Array.isArray(productsList)) {
      setStats({ 
        total: 0, 
        lowStock: 0, 
        outOfStock: 0, 
        inStock: 0
      });
      return;
    }
    
    const total = productsList.length;
    const outOfStock = productsList.filter(p => p.currentStock === 0).length;
    const lowStock = productsList.filter(p => 
      p.currentStock > 0 && p.currentStock <= (p.minStockLevel || 5)
    ).length;
    const inStock = total - outOfStock;
    
    setStats({ 
      total, 
      lowStock, 
      outOfStock, 
      inStock
    });
  }, []);

  // Get shop name
  const getShopName = useCallback((product) => {
    if (!product) return 'Unknown Shop';
    if (product.shopName && product.shopName !== 'Unknown Shop') return product.shopName;
    if (product.shop && typeof product.shop === 'object') {
      return product.shop.name || product.shop.shopName || 'Unknown Shop';
    }
    if (product.shop) {
      const shopId = typeof product.shop === 'string' ? product.shop : product.shop._id;
      const foundShop = shops.find(s => s._id === shopId);
      if (foundShop) return foundShop.name || foundShop.shopName || 'Unknown Shop';
    }
    if (product.shopId) {
      const foundShop = shops.find(s => s._id === product.shopId);
      if (foundShop) return foundShop.name || foundShop.shopName || 'Unknown Shop';
    }
    return 'Unknown Shop';
  }, [shops]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setFetching(true);
      setError(null);
      
      const response = await productAPI.getAll({ 
        page: 1, 
        limit: 9999
      });
      
      const productsData = handleApiResponse(response);
      
      if (productsData && Array.isArray(productsData)) {
        const enhancedProducts = productsData.map(product => ({
          ...product,
          displayShopName: getShopName(product)
        }));
        
        setProducts(enhancedProducts);
        calculateStats(enhancedProducts);
        setCategories(extractCategoriesFromProducts(enhancedProducts));
      } else {
        setError('Invalid products data format received from server');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please try again.');
    } finally {
      setFetching(false);
    }
  }, [calculateStats, extractCategoriesFromProducts, handleApiResponse, getShopName]);

  // Initial data loading
  useEffect(() => {
    fetchProducts();
    fetchShops();
  }, [fetchProducts, fetchShops]);

  // API error handler
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
    
    notification.error({
      message: 'Operation Failed',
      description: errorMessage,
      placement: deviceConfig.isMobile ? 'bottom' : 'topRight',
    });
    
    return errorMessage;
  }, [deviceConfig.isMobile]);

  // Product actions
  const handleAddProduct = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({
      currentStock: 0,
      minStockLevel: 5,
      buyingPrice: 0,
      sellingPrice: 0
    });
    setEditingProduct(null);
    setIsModalVisible(true);
  }, [form]);

  const handleViewProduct = useCallback((product) => {
    setSelectedProduct(product);
    setIsViewModalVisible(true);
  }, []);

  const handleEditProduct = useCallback((product) => {
    setEditingProduct(product);
    
    const shopValue = product.shop?._id || product.shop || product.shopId;
    
    form.setFieldsValue({
      name: product.name,
      category: product.category,
      buyingPrice: product.buyingPrice,
      sellingPrice: product.minSellingPrice || product.sellingPrice,
      currentStock: product.currentStock,
      minStockLevel: product.minStockLevel || 5,
      shop: shopValue
    });
    
    setIsModalVisible(true);
  }, [form]);

  const handleDeleteProduct = useCallback(async (productId) => {
    Modal.confirm({
      title: 'Delete Product',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to delete this product? This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: deviceConfig.isMobile,
      onOk: async () => {
        try {
          setLoading(true);
          const response = await productAPI.delete(productId);
          
          if (response && response.success) {
            message.success('Product deleted successfully');
            const updatedProducts = products.filter(product => product._id !== productId);
            setProducts(updatedProducts);
            calculateStats(updatedProducts);
            setCategories(extractCategoriesFromProducts(updatedProducts));
          } else {
            message.error(response?.message || 'Failed to delete product');
          }
        } catch (error) {
          handleApiError(error, 'Failed to delete product');
        } finally {
          setLoading(false);
        }
      }
    });
  }, [handleApiError, products, calculateStats, extractCategoriesFromProducts, deviceConfig.isMobile]);

  // Prepare product data
  const prepareProductData = useCallback((values) => {
    const selectedShop = shops.find(shop => shop._id === values.shop);
    if (!selectedShop) throw new Error('Selected shop not found');

    return {
      name: values.name.trim(),
      category: values.category.trim(),
      buyingPrice: Number(values.buyingPrice),
      minSellingPrice: Number(values.sellingPrice),
      currentStock: Number(values.currentStock) || 0,
      minStockLevel: Number(values.minStockLevel) || 5,
      shop: values.shop,
      shopName: selectedShop.name || selectedShop.shopName
    };
  }, [shops]);

  // Handle form submission
  const handleSubmit = useCallback(async (values) => {
    try {
      setLoading(true);
      const productData = prepareProductData(values);

      if (!productData.name || productData.name.length < 2) {
        notification.error({ message: 'Validation Error', description: 'Product name must be at least 2 characters long' });
        return;
      }

      let response;
      
      if (editingProduct) {
        response = await productAPI.update(editingProduct._id, productData);
        if (response && (response.success === true || response._id)) {
          const updatedProduct = response.data || response;
          const updatedProducts = products.map(product => 
            product._id === editingProduct._id 
              ? { ...product, ...updatedProduct, displayShopName: getShopName({ ...product, ...updatedProduct }) }
              : product
          );
          setProducts(updatedProducts);
          calculateStats(updatedProducts);
          setCategories(extractCategoriesFromProducts(updatedProducts));
          notification.success({ message: 'Product Updated', description: 'Product updated successfully' });
          setIsModalVisible(false);
          setEditingProduct(null);
          form.resetFields();
        }
      } else {
        response = await productAPI.create(productData);
        if (response && (response.success === true || response._id)) {
          const newProduct = response.data || response;
          const enhancedProduct = { ...newProduct, displayShopName: getShopName(newProduct) };
          const newProducts = [...products, enhancedProduct];
          setProducts(newProducts);
          calculateStats(newProducts);
          setCategories(extractCategoriesFromProducts(newProducts));
          notification.success({ message: 'Product Created', description: 'Product created successfully' });
          setIsModalVisible(false);
          form.resetFields();
        }
      }
    } catch (error) {
      console.error('Error submitting product:', error);
      notification.error({
        message: 'Operation Failed',
        description: error.message || (editingProduct ? 'Failed to update product' : 'Failed to add product'),
      });
    } finally {
      setLoading(false);
    }
  }, [editingProduct, products, calculateStats, extractCategoriesFromProducts, form, prepareProductData, getShopName]);

  // Stock status utility
  const getStockStatus = useCallback((product) => {
    if (!product) return { status: 'default', text: 'Unknown', color: '#d9d9d9', gradient: 'linear-gradient(135deg, #d9d9d9 0%, #bfbfbf 100%)' };
    const currentStock = product.currentStock || 0;
    const minStockLevel = product.minStockLevel || 5;
    
    if (currentStock === 0) {
      return { 
        status: 'error', 
        text: 'Out of Stock', 
        color: '#ff4d4f',
        gradient: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
        icon: <FallOutlined />
      };
    } else if (currentStock <= minStockLevel) {
      return { 
        status: 'warning', 
        text: 'Low Stock', 
        color: '#faad14',
        gradient: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)',
        icon: <WarningOutlined />
      };
    } else {
      return { 
        status: 'success', 
        text: 'In Stock', 
        color: '#52c41a',
        gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
        icon: <RiseOutlined />
      };
    }
  }, []);

  // Shop options
  const shopOptions = useMemo(() => {
    return shops.map(shop => ({
      value: shop._id,
      label: shop.name || shop.shopName || 'Unknown Shop',
      key: shop._id
    }));
  }, [shops]);

  // Shop filter options
  const shopFilterOptions = useMemo(() => {
    const baseOptions = [{ value: 'all', label: 'All Shops' }];
    const shopOptionsList = shops.map(shop => ({
      value: shop._id,
      label: shop.name || shop.shopName || 'Unknown Shop'
    }));
    return [...baseOptions, ...shopOptionsList];
  }, [shops]);

  // Category filter options
  const categoryFilterOptions = useMemo(() => {
    const baseOptions = [{ value: 'all', label: 'All Categories' }];
    const categoryOptions = categories.map(cat => ({ value: cat, label: cat }));
    return [...baseOptions, ...categoryOptions];
  }, [categories]);

  // Get shop ID
  const getShopId = useCallback((product) => {
    if (!product) return null;
    if (product.shop && typeof product.shop === 'object') return product.shop._id;
    if (product.shop) return product.shop;
    if (product.shopId) return product.shopId;
    return null;
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    return products.filter(product => {
      const matchesSearch = searchText === '' || 
        (product.name && product.name.toLowerCase().includes(searchText.toLowerCase())) ||
        (product.category && product.category.toLowerCase().includes(searchText.toLowerCase())) ||
        (getShopName(product) && getShopName(product).toLowerCase().includes(searchText.toLowerCase()));
      
      const matchesShop = selectedShopFilter === 'all' || getShopId(product) === selectedShopFilter;
      const matchesCategory = selectedCategoryFilter === 'all' || product.category === selectedCategoryFilter;
      
      return matchesSearch && matchesShop && matchesCategory;
    });
  }, [products, searchText, selectedShopFilter, selectedCategoryFilter, getShopName, getShopId]);

  // Search and filter handlers
  const handleSearch = useCallback((value) => setSearchText(value), []);
  const handleShopFilterChange = useCallback((value) => setSelectedShopFilter(value), []);
  const handleCategoryFilterChange = useCallback((value) => setSelectedCategoryFilter(value), []);
  
  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setSelectedShopFilter('all');
    setSelectedCategoryFilter('all');
    notification.success({
      message: 'Filters Cleared',
      description: 'All filters have been cleared',
      placement: deviceConfig.isMobile ? 'bottom' : 'topRight',
      duration: 2,
    });
  }, [deviceConfig.isMobile]);

  // Format currency
  const formatCurrency = (amount) => {
    return `KES ${(amount || 0).toLocaleString('en-KE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // Mobile Navigation Bar
  const MobileNavBar = useCallback(() => {
    if (!deviceConfig.isMobile) return null;
    return (
      <div style={{
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
              type={mobileView === 'products' ? 'primary' : 'text'}
              icon={<AppstoreOutlined />}
              onClick={() => setMobileView('products')}
              block
              style={{ height: '44px', fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
              Products
            </Button>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <Button
              type={mobileView === 'stats' ? 'primary' : 'text'}
              icon={<BarChartOutlined />}
              onClick={() => setMobileView('stats')}
              block
              style={{ height: '44px', fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
              Stats
            </Button>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
              block
              style={{ height: '44px', fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
              Menu
            </Button>
          </Col>
        </Row>
      </div>
    );
  }, [deviceConfig.isMobile, mobileView]);

  // Mobile Drawer
  const MobileDrawer = useCallback(() => (
    <Drawer
      title="Product Management"
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
          onClick={() => { setDrawerVisible(false); handleAddProduct(); }}
          style={{ textAlign: 'left', height: '50px', fontSize: '14px', marginBottom: '8px' }}
        >
          Add New Product
        </Button>
        <Button 
          icon={<ReloadOutlined />}
          onClick={() => { fetchProducts(); setDrawerVisible(false); }}
          block
          style={{ textAlign: 'left', height: '50px', fontSize: '14px', marginBottom: '8px' }}
        >
          Refresh Data
        </Button>
      </Space>
    </Drawer>
  ), [drawerVisible, handleAddProduct, fetchProducts]);

  // Statistics Cards
  const StatisticsCards = useCallback(() => (
    <Row gutter={[8, 8]} style={{ marginBottom: deviceConfig.isMobile ? '12px' : '16px' }}>
      <Col xs={12} sm={12} md={8} lg={6}>
        <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', height: '100%' }}>
          <Statistic
            title={<Text style={{ color: 'white', fontSize: deviceConfig.isMobile ? '10px' : '11px', fontWeight: '500' }}>Total Products</Text>}
            value={stats.total}
            prefix={<ProductOutlined style={{ color: 'white', fontSize: deviceConfig.isMobile ? '12px' : '16px' }} />}
            valueStyle={{ color: 'white', fontSize: deviceConfig.isMobile ? '14px' : '16px', fontWeight: 'bold' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={8} lg={6}>
        <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', height: '100%' }}>
          <Statistic
            title={<Text style={{ color: 'white', fontSize: deviceConfig.isMobile ? '10px' : '11px', fontWeight: '500' }}>In Stock</Text>}
            value={stats.inStock}
            prefix={<StockOutlined style={{ color: 'white', fontSize: deviceConfig.isMobile ? '12px' : '16px' }} />}
            valueStyle={{ color: 'white', fontSize: deviceConfig.isMobile ? '14px' : '16px', fontWeight: 'bold' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={8} lg={6}>
        <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', height: '100%' }}>
          <Statistic
            title={<Text style={{ color: 'white', fontSize: deviceConfig.isMobile ? '10px' : '11px', fontWeight: '500' }}>Low Stock</Text>}
            value={stats.lowStock || 0}
            prefix={<ExclamationCircleOutlined style={{ color: 'white', fontSize: deviceConfig.isMobile ? '12px' : '16px' }} />}
            valueStyle={{ color: 'white', fontSize: deviceConfig.isMobile ? '14px' : '16px', fontWeight: 'bold' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={8} lg={6}>
        <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', background: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)', height: '100%' }}>
          <Statistic
            title={<Text style={{ color: 'white', fontSize: deviceConfig.isMobile ? '10px' : '11px', fontWeight: '500' }}>Out of Stock</Text>}
            value={stats.outOfStock || 0}
            prefix={<FallOutlined style={{ color: 'white', fontSize: deviceConfig.isMobile ? '12px' : '16px' }} />}
            valueStyle={{ color: 'white', fontSize: deviceConfig.isMobile ? '14px' : '16px', fontWeight: 'bold' }}
          />
        </Card>
      </Col>
    </Row>
  ), [stats, deviceConfig]);

  // Search and Filter Section
  const SearchFilterSection = useCallback(() => (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FilterOutlined style={{ color: '#3498db', fontSize: deviceConfig.isMobile ? '12px' : '14px' }} />
          <Text strong style={{ fontSize: deviceConfig.isMobile ? '12px' : '14px' }}>Search & Filter</Text>
        </div>
      }
      style={{ marginBottom: deviceConfig.isMobile ? '12px' : '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none' }}
      size={deviceConfig.isMobile ? 'small' : 'default'}
    >
      <Row gutter={[8, 8]} align="middle">
        <Col xs={24} sm={24} md={8} lg={8}>
          <Input
            placeholder="Search products, categories..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            size={deviceConfig.isMobile ? 'small' : 'middle'}
            ref={searchInputRef}
          />
        </Col>
        <Col xs={12} sm={12} md={6} lg={5}>
          <Select
            placeholder="Filter by Shop"
            value={selectedShopFilter}
            onChange={handleShopFilterChange}
            options={shopFilterOptions}
            style={{ width: '100%' }}
            size={deviceConfig.isMobile ? 'small' : 'middle'}
          />
        </Col>
        <Col xs={12} sm={12} md={6} lg={5}>
          <Select
            placeholder="Filter by Category"
            value={selectedCategoryFilter}
            onChange={handleCategoryFilterChange}
            options={categoryFilterOptions}
            style={{ width: '100%' }}
            size={deviceConfig.isMobile ? 'small' : 'middle'}
          />
        </Col>
        <Col xs={24} sm={24} md={6} lg={6}>
          <Button 
            icon={<FilterOutlined />}
            onClick={handleClearFilters}
            block
            size={deviceConfig.isMobile ? 'small' : 'middle'}
          >
            Clear Filters
          </Button>
        </Col>
      </Row>
    </Card>
  ), [searchText, selectedShopFilter, selectedCategoryFilter, shopFilterOptions, categoryFilterOptions, deviceConfig, handleSearch, handleShopFilterChange, handleCategoryFilterChange, handleClearFilters]);

  // Loading state
  if (fetching && products.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', backgroundColor: '#f0f2f5' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}><Text type="secondary">Loading products...</Text></div>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Header style={{ 
        background: 'linear-gradient(135deg, #1a365d 0%, #2d3748 100%)',
        padding: deviceConfig.isMobile ? '0 8px' : '0 16px',
        height: deviceConfig.isMobile ? '56px' : '64px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <Row justify="space-between" align="middle" style={{ height: '100%' }}>
          <Col>
            <Space>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ProductOutlined style={{ fontSize: deviceConfig.isMobile ? '18px' : '20px', color: 'white' }} />
                <Title level={deviceConfig.isMobile ? 5 : 4} style={{ margin: 0, color: 'white' }}>
                  Product Management
                </Title>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              {!deviceConfig.isMobile && (
                <>
                  <Tag color="#1890ff" style={{ borderRadius: '12px', padding: '4px 8px' }}>
                    <ShopOutlined /> {shops.length} shops
                  </Tag>
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={fetchProducts}
                    loading={fetching}
                    size="small"
                    style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                  >
                    Refresh
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={handleAddProduct}
                    disabled={fetching || shopOptions.length === 0}
                    size="small"
                    style={{ background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)', border: 'none' }}
                  >
                    Add Product
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Header>

      <Content style={{ 
        padding: deviceConfig.isMobile ? '8px' : '16px',
        marginBottom: deviceConfig.isMobile ? '60px' : '0',
        height: deviceConfig.isMobile ? 'calc(100vh - 116px)' : 'auto',
        overflow: deviceConfig.isMobile ? 'hidden' : 'auto'
      }}>
        {deviceConfig.isMobile && <MobileNavBar />}
        {deviceConfig.isMobile && <MobileDrawer />}

        {error && (
          <Alert
            message="Error Loading Products"
            description={error}
            type="error"
            showIcon
            action={<Button size="small" onClick={fetchProducts}>Retry</Button>}
            style={{ marginBottom: '16px', borderRadius: '8px' }}
          />
        )}

        {shopOptions.length === 0 && !fetching && (
          <Alert
            message="No Shops Available"
            description="You need to create shops first before adding products."
            type="warning"
            showIcon
            style={{ marginBottom: '16px', borderRadius: '8px' }}
          />
        )}

        {!deviceConfig.isMobile ? (
          <>
            <StatisticsCards />
            <SearchFilterSection />
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card 
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BarChartOutlined style={{ color: '#9b59b6' }} />
                      <Text strong>Products ({filteredProducts.length} of {products.length})</Text>
                    </div>
                  }
                  extra={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <Button icon={<ReloadOutlined />} onClick={fetchProducts} loading={fetching} size="small">
                        Refresh
                      </Button>
                    </div>
                  }
                  style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none' }}
                >
                  <Table 
                    columns={[
                      { 
                        title: <Text strong>Product Name</Text>, 
                        dataIndex: 'name', 
                        key: 'name',
                        sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
                        render: (name, record) => (
                          <div>
                            <div style={{ fontWeight: 500, fontSize: '14px' }}>{name || 'Unknown Product'}</div>
                            <div style={{ marginTop: '4px' }}>
                              <Badge 
                                count={getStockStatus(record).text}
                                style={{ 
                                  background: getStockStatus(record).gradient,
                                  border: 'none',
                                  fontSize: '10px',
                                  height: '20px',
                                  padding: '0 8px',
                                  borderRadius: '10px'
                                }}
                              />
                            </div>
                          </div>
                        )
                      },
                      { 
                        title: <Text strong>Category</Text>, 
                        dataIndex: 'category', 
                        key: 'category',
                        sorter: (a, b) => (a.category || '').localeCompare(b.category || ''),
                        render: (category) => <Tag color="purple">{category || 'Uncategorized'}</Tag>
                      },
                      { 
                        title: <Text strong>Buying Price</Text>, 
                        dataIndex: 'buyingPrice', 
                        key: 'buyingPrice', 
                        sorter: (a, b) => (a.buyingPrice || 0) - (b.buyingPrice || 0),
                        render: price => <Text strong style={{ color: '#3498db' }}>{formatCurrency(price)}</Text>
                      },
                      { 
                        title: <Text strong>Selling Price</Text>, 
                        dataIndex: 'minSellingPrice', 
                        key: 'minSellingPrice', 
                        sorter: (a, b) => (a.minSellingPrice || 0) - (b.minSellingPrice || 0),
                        render: price => <Text strong style={{ color: '#2ecc71' }}>{formatCurrency(price)}</Text>
                      },
                      { 
                        title: <Text strong>Current Stock</Text>, 
                        dataIndex: 'currentStock', 
                        key: 'currentStock',
                        sorter: (a, b) => (a.currentStock || 0) - (b.currentStock || 0),
                        render: (stock, record) => (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              background: getStockStatus(record).gradient,
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '12px',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              minWidth: '40px',
                              textAlign: 'center'
                            }}>
                              {stock}
                            </div>
                            {stock <= (record.minStockLevel || 5) && (
                              <Tooltip title={`Low stock alert! Minimum level: ${record.minStockLevel || 5}`}>
                                <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                              </Tooltip>
                            )}
                          </div>
                        )
                      },
                      { 
                        title: <Text strong>Shop</Text>, 
                        key: 'shop',
                        sorter: (a, b) => getShopName(a).localeCompare(getShopName(b)),
                        render: (_, record) => (
                          <Tooltip title={`Shop ID: ${getShopId(record) || 'N/A'}`}>
                            <Tag color="blue" style={{ margin: 0, background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', border: 'none', color: 'white' }}>
                              {getShopName(record)}
                            </Tag>
                          </Tooltip>
                        )
                      },
                      { 
                        title: <Text strong>Actions</Text>, 
                        key: 'action',
                        width: 120,
                        fixed: 'right',
                        render: (_, record) => (
                          <Space size="small">
                            <Tooltip title="View Details">
                              <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewProduct(record)} disabled={loading} size="small" style={{ color: '#3498db' }} />
                            </Tooltip>
                            <Tooltip title="Edit Product">
                              <Button type="text" icon={<EditOutlined />} onClick={() => handleEditProduct(record)} disabled={loading} size="small" style={{ color: '#faad14' }} />
                            </Tooltip>
                            <Tooltip title="Delete Product">
                              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteProduct(record._id)} disabled={loading} size="small" />
                            </Tooltip>
                          </Space>
                        )
                      },
                    ]} 
                    dataSource={filteredProducts} 
                    rowKey="_id"
                    pagination={{ 
                      pageSize: 10, 
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => <Text>{range[0]}-{range[1]} of {total} items</Text>,
                      size: 'small'
                    }}
                    loading={fetching}
                    scroll={{ x: '100%' }}
                    size="small"
                  />
                </Card>
              </Col>
            </Row>
          </>
        ) : (
          // Mobile View
          <div 
            ref={scrollContainerRef}
            style={{ 
              height: '100%', 
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '20px'
            }}
          >
            {mobileView === 'products' && (
              <div style={{ height: '100%' }}>
                <StatisticsCards />
                <SearchFilterSection />
                <Card
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ProductOutlined style={{ color: '#9b59b6' }} />
                      <Text strong style={{ fontSize: '14px' }}>Products ({filteredProducts.length})</Text>
                    </div>
                  }
                  style={{ 
                    borderRadius: '8px', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
                    border: 'none',
                    marginBottom: '20px'
                  }}
                  bodyStyle={{ padding: '8px' }}
                >
                  {filteredProducts.length === 0 ? (
                    <Empty description="No products found" style={{ padding: '40px 0' }} />
                  ) : (
                    <List
                      dataSource={filteredProducts}
                      renderItem={(product) => (
                        <List.Item
                          key={product._id}
                          style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fff' }}
                          actions={[
                            <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewProduct(product)} size="small" style={{ color: '#3498db' }} />,
                            <Button type="text" icon={<EditOutlined />} onClick={() => handleEditProduct(product)} size="small" style={{ color: '#faad14' }} />,
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteProduct(product._id)} size="small" />
                          ]}
                        >
                          <List.Item.Meta
                            avatar={<Avatar style={{ background: getStockStatus(product).gradient, color: 'white' }}>{product.name.charAt(0)}</Avatar>}
                            title={
                              <div>
                                <Text strong style={{ fontSize: '14px' }}>{product.name}</Text>
                                <div style={{ marginTop: '4px' }}>
                                  <Tag color={getStockStatus(product).color} style={{ fontSize: '10px', padding: '0 4px' }}>{getStockStatus(product).text}</Tag>
                                </div>
                              </div>
                            }
                            description={
                              <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>{product.category}</Text>
                                <div style={{ marginTop: '4px' }}>
                                  <Text strong style={{ fontSize: '12px', color: '#2ecc71' }}>{formatCurrency(product.minSellingPrice)}</Text>
                                  <Text type="secondary" style={{ fontSize: '10px', marginLeft: '8px' }}>Stock: {product.currentStock}</Text>
                                </div>
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </div>
            )}
            {mobileView === 'stats' && (
              <Card title="Statistics" style={{ marginBottom: '20px' }}>
                <Statistic title="Total Products" value={stats.total} />
                <Statistic title="In Stock" value={stats.inStock} />
                <Statistic title="Low Stock" value={stats.lowStock} />
                <Statistic title="Out of Stock" value={stats.outOfStock} />
              </Card>
            )}
          </div>
        )}

        {/* Add/Edit Product Modal */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingProduct ? <EditOutlined style={{ color: '#faad14' }} /> : <PlusOutlined style={{ color: '#2ecc71' }} />}
              <Text strong style={{ fontSize: deviceConfig.isMobile ? '14px' : '16px' }}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
            </div>
          }
          open={isModalVisible}
          onCancel={() => { setIsModalVisible(false); setEditingProduct(null); form.resetFields(); }}
          footer={null}
          width={Math.min(600, window.innerWidth * 0.95)}
          destroyOnClose
          centered={deviceConfig.isMobile}
        >
          <Form form={form} onFinish={handleSubmit} layout="vertical" requiredMark="optional"
            initialValues={{ currentStock: 0, minStockLevel: 5, buyingPrice: 0, sellingPrice: 0 }}>
            
            <Form.Item name="name" label={<Text strong>Product Name</Text>}
              rules={[{ required: true, message: 'Please input product name' }, { min: 2, message: 'Minimum 2 characters' }, { max: 100, message: 'Maximum 100 characters' }]}>
              <Input placeholder="Enter product name" disabled={loading} maxLength={100} showCount size={deviceConfig.isMobile ? 'middle' : 'large'} />
            </Form.Item>

            <Form.Item name="category" label={<Text strong>Category</Text>}
              rules={[{ required: true, message: 'Please input category name' }, { min: 2, message: 'Minimum 2 characters' }, { max: 50, message: 'Maximum 50 characters' }]}>
              <Input placeholder="Enter category name" disabled={loading} maxLength={50} showCount size={deviceConfig.isMobile ? 'middle' : 'large'} />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="buyingPrice" label={<Text strong>Buying Price</Text>}
                  rules={[{ required: true, message: 'Please input buying price' }, { type: 'number', min: 0, message: 'Price must be a positive number' }]}>
                  <InputNumber min={0} step={0.01} precision={2} placeholder="0.00" disabled={loading} style={{ width: '100%' }} addonAfter="KES" size={deviceConfig.isMobile ? 'middle' : 'large'} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="sellingPrice" label={<Text strong>Selling Price</Text>}
                  rules={[{ required: true, message: 'Please input selling price' }, { type: 'number', min: 0, message: 'Price must be a positive number' }]}>
                  <InputNumber min={0} step={0.01} precision={2} placeholder="0.00" disabled={loading} style={{ width: '100%' }} addonAfter="KES" size={deviceConfig.isMobile ? 'middle' : 'large'} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="currentStock" label={<Text strong>Current Stock</Text>}
                  rules={[{ required: true, message: 'Please input stock quantity' }, { type: 'number', min: 0, message: 'Stock cannot be negative' }]}>
                  <InputNumber min={0} placeholder="0" disabled={loading} style={{ width: '100%' }} size={deviceConfig.isMobile ? 'middle' : 'large'} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="minStockLevel" label={
                    <span><Text strong>Min Stock Level</Text><Tooltip title="Alert level for low stock"><InfoCircleOutlined style={{ marginLeft: '4px', color: '#999' }} /></Tooltip></span>
                  }
                  rules={[{ required: true, message: 'Please input minimum stock level' }, { type: 'number', min: 0, message: 'Must be a positive number' }]}>
                  <InputNumber min={0} placeholder="5" disabled={loading} style={{ width: '100%' }} size={deviceConfig.isMobile ? 'middle' : 'large'} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="shop" label={<Text strong>Shop</Text>} rules={[{ required: true, message: 'Please select shop' }]}>
              <Select 
                placeholder="Select shop" 
                disabled={loading || shopOptions.length === 0}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) => (option?.label || '').toLowerCase().includes(input.toLowerCase())}
                options={shopOptions}
                size={deviceConfig.isMobile ? 'middle' : 'large'}
              />
            </Form.Item>

            <div style={{ textAlign: 'right', paddingTop: '16px', borderTop: '1px solid #f0f0f0', marginTop: '16px' }}>
              <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 8 }} disabled={loading} size={deviceConfig.isMobile ? 'middle' : 'large'}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={loading} disabled={shopOptions.length === 0}
                size={deviceConfig.isMobile ? 'middle' : 'large'} style={{ background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', border: 'none' }}>
                {editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </div>
          </Form>
        </Modal>

        {/* View Product Modal - BARCODE REMOVED */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EyeOutlined style={{ color: '#3498db' }} />
              <Text strong style={{ fontSize: deviceConfig.isMobile ? '14px' : '16px' }}>Product Details</Text>
            </div>
          }
          open={isViewModalVisible}
          onCancel={() => setIsViewModalVisible(false)}
          footer={[
            <Button key="edit" type="primary" onClick={() => { setIsViewModalVisible(false); handleEditProduct(selectedProduct); }}
              style={{ background: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)', border: 'none' }} size={deviceConfig.isMobile ? 'middle' : 'large'}>
              Edit Product
            </Button>,
            <Button key="close" onClick={() => setIsViewModalVisible(false)} size={deviceConfig.isMobile ? 'middle' : 'large'}>
              Close
            </Button>
          ]}
          width={Math.min(600, window.innerWidth * 0.95)}
          centered={deviceConfig.isMobile}
        >
          {selectedProduct && (
            <div style={{ lineHeight: '2' }}>
              <Divider>Basic Information</Divider>
              <p><strong>Name:</strong> <Text strong style={{ color: '#2c3e50' }}>{selectedProduct.name}</Text></p>
              <p><strong>Category:</strong> <Tag color="purple">{selectedProduct.category || 'Uncategorized'}</Tag></p>
              
              <Divider>Pricing</Divider>
              <p><strong>Buying Price:</strong> <Text strong style={{ color: '#3498db' }}>{formatCurrency(selectedProduct.buyingPrice)}</Text></p>
              <p><strong>Selling Price:</strong> <Text strong style={{ color: '#2ecc71' }}>{formatCurrency(selectedProduct.minSellingPrice)}</Text></p>
              <p><strong>Profit Margin:</strong> <Text strong style={{ color: selectedProduct.minSellingPrice > selectedProduct.buyingPrice ? '#2ecc71' : '#e74c3c' }}>
                {((selectedProduct.minSellingPrice - selectedProduct.buyingPrice) / selectedProduct.buyingPrice * 100).toFixed(2)}%
              </Text></p>
              
              <Divider>Stock Information</Divider>
              <p><strong>Current Stock:</strong> <Badge count={selectedProduct.currentStock} style={{ backgroundColor: getStockStatus(selectedProduct).color, fontWeight: 'bold' }} /></p>
              <p><strong>Min Stock Level:</strong> <Text>{selectedProduct.minStockLevel || 5}</Text></p>
              <p><strong>Status:</strong> <Badge count={getStockStatus(selectedProduct).text} style={{ background: getStockStatus(selectedProduct).gradient, border: 'none', fontSize: '10px', padding: '0 8px', height: '20px', borderRadius: '10px', color: 'white' }} /></p>
              
              <Divider>Shop Information</Divider>
              <p><strong>Shop:</strong> <Tag color="blue" style={{ marginLeft: '8px', background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', border: 'none', color: 'white' }}>
                {getShopName(selectedProduct)}
              </Tag></p>
            </div>
          )}
        </Modal>
      </Content>

      {deviceConfig.isMobile && (
        <FloatButton
          icon={<PlusOutlined />}
          type="primary"
          onClick={handleAddProduct}
          style={{ right: 24, bottom: 80 }}
          tooltip="Add New Product"
        />
      )}
    </Layout>
  );
};

export default ProductManagement;                 