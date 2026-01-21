import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  // ✅ NEW: Add these imports
  QRCode,
  Popconfirm,
  Switch,
  Dropdown,
  Menu,
  Tabs
} from 'antd';
import { 
  ProductOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined, 
  EyeOutlined, 
  ShoppingOutlined, 
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  WarningOutlined,
  CheckCircleOutlined, 
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
  // ✅ NEW: Barcode related icons
  BarcodeOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  DownloadOutlined,
  SyncOutlined,
  CopyOutlined,
  ScanOutlined
} from '@ant-design/icons';
import { productAPI, shopAPI } from '../../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const { Title, Text } = Typography;
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
  const [stats, setStats] = useState({ total: 0, lowStock: 0, outOfStock: 0, inStock: 0 });
  const [form] = Form.useForm();

  // ✅ NEW: Barcode states
  const [barcodeModalVisible, setBarcodeModalVisible] = useState(false);
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState(null);
  const [printingBarcode, setPrintingBarcode] = useState(false);
  const [bulkGenerateLoading, setBulkGenerateLoading] = useState(false);
  const [barcodeTypeFilter, setBarcodeTypeFilter] = useState('all');
  const [barcodeGeneratedFilter, setBarcodeGeneratedFilter] = useState('all');

  // Search and filter states
  const [searchText, setSearchText] = useState('');
  const [selectedShopFilter, setSelectedShopFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // ✅ NEW: Barcode type options
  const barcodeTypeOptions = useMemo(() => [
    { value: 'INTERNAL', label: 'Internal Barcode', color: 'blue' },
    { value: 'EAN13', label: 'EAN-13', color: 'green' },
    { value: 'UPC', label: 'UPC', color: 'purple' },
    { value: 'CODE128', label: 'Code 128', color: 'orange' },
    { value: 'CODE39', label: 'Code 39', color: 'cyan' }
  ], []);

  // API response handler
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

  // Fetch shops with error handling
  const fetchShops = useCallback(async () => {
    try {
      setFetching(true);
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
      setFetching(false);
    }
  }, [handleApiResponse]);

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
      setStats({ total: 0, lowStock: 0, outOfStock: 0, inStock: 0 });
      return;
    }
    
    const total = productsList.length;
    const outOfStock = productsList.filter(p => p.currentStock === 0).length;
    const lowStock = productsList.filter(p => 
      p.currentStock > 0 && p.currentStock <= (p.minStockLevel || 5)
    ).length;
    const inStock = total - outOfStock;
    
    // ✅ NEW: Barcode statistics
    const withBarcode = productsList.filter(p => p.barcode).length;
    const withoutBarcode = total - withBarcode;
    const printedBarcodes = productsList.filter(p => p.barcodePrinted).length;
    
    setStats({ 
      total, 
      lowStock, 
      outOfStock, 
      inStock,
      withBarcode,
      withoutBarcode,
      printedBarcodes
    });
  }, []);

  // Get shop name with fallback strategies
  const getShopName = useCallback((product) => {
    if (!product) return 'Unknown Shop';
    
    if (product.shopName && product.shopName !== 'Unknown Shop') {
      return product.shopName;
    }
    
    if (product.shop && typeof product.shop === 'object') {
      return product.shop.name || product.shop.shopName || 'Unknown Shop';
    }
    
    if (product.shop) {
      const shopId = typeof product.shop === 'string' ? product.shop : product.shop._id;
      const foundShop = shops.find(s => s._id === shopId);
      if (foundShop) {
        return foundShop.name || foundShop.shopName || 'Unknown Shop';
      }
    }
    
    if (product.shopId) {
      const foundShop = shops.find(s => s._id === product.shopId);
      if (foundShop) {
        return foundShop.name || foundShop.shopName || 'Unknown Shop';
      }
    }
    
    return 'Unknown Shop';
  }, [shops]);

  // Main products fetch function
  const fetchProducts = useCallback(async () => {
    try {
      setFetching(true);
      setError(null);
      
      const response = await productAPI.getAll();
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
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to load products. Please check your connection.';
      setError(errorMessage);
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
    
    message.error(errorMessage);
    return errorMessage;
  }, []);

  // Product actions
  const handleAddProduct = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({
      barcodeType: 'INTERNAL',
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
      shop: shopValue,
      barcode: product.barcode || '',
      barcodeType: product.barcodeType || 'INTERNAL'
    });
    
    setIsModalVisible(true);
  }, [form]);

  const handleDeleteProduct = useCallback(async (productId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this product?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
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
  }, [handleApiError, products, calculateStats, extractCategoriesFromProducts]);

  // ✅ NEW: Barcode actions
  const handleGenerateBarcode = useCallback(async (productId, barcodeType = 'INTERNAL') => {
    try {
      setLoading(true);
      const response = await productAPI.generateBarcode(productId, { barcodeType });
      
      if (response.success) {
        message.success('Barcode generated successfully');
        
        // Update the product in the list
        const updatedProducts = products.map(product => 
          product._id === productId 
            ? { 
                ...product, 
                barcode: response.data.barcode,
                barcodeType: response.data.barcodeType,
                barcodeGenerated: true
              }
            : product
        );
        
        setProducts(updatedProducts);
        calculateStats(updatedProducts);
        
        // If we're viewing this product, update it
        if (selectedProduct?._id === productId) {
          setSelectedProduct(prev => ({
            ...prev,
            barcode: response.data.barcode,
            barcodeType: response.data.barcodeType,
            barcodeGenerated: true
          }));
        }
      } else {
        message.error(response?.message || 'Failed to generate barcode');
      }
    } catch (error) {
      handleApiError(error, 'Failed to generate barcode');
    } finally {
      setLoading(false);
    }
  }, [products, selectedProduct, calculateStats, handleApiError]);

  const handleBulkGenerateBarcodes = useCallback(async () => {
    Modal.confirm({
      title: 'Bulk Generate Barcodes',
      icon: <SyncOutlined />,
      content: (
        <div>
          <p>This will generate barcodes for all products that don't have one.</p>
          <p>Select barcode type:</p>
          <Select 
            defaultValue="INTERNAL" 
            style={{ width: '100%', marginTop: '8px' }}
          >
            <Select.Option value="INTERNAL">Internal Barcode</Select.Option>
            <Select.Option value="EAN13">EAN-13</Select.Option>
            <Select.Option value="UPC">UPC</Select.Option>
          </Select>
        </div>
      ),
      okText: 'Generate',
      cancelText: 'Cancel',
      onOk: async (close) => {
        try {
          setBulkGenerateLoading(true);
          const response = await productAPI.bulkGenerateBarcodes({
            barcodeType: 'INTERNAL'
          });
          
          if (response.success) {
            message.success(`Generated ${response.results.success} barcodes successfully`);
            fetchProducts(); // Refresh the list
          } else {
            message.error(response?.message || 'Failed to generate barcodes');
          }
        } catch (error) {
          handleApiError(error, 'Failed to generate barcodes');
        } finally {
          setBulkGenerateLoading(false);
          close();
        }
      }
    });
  }, [fetchProducts, handleApiError]);

  const handlePrintBarcode = useCallback(async (product) => {
    setSelectedBarcodeProduct(product);
    setBarcodeModalVisible(true);
  }, []);

  const handleMarkAsPrinted = useCallback(async (productId) => {
    try {
      const response = await productAPI.markBarcodePrinted(productId);
      
      if (response.success) {
        message.success('Barcode marked as printed');
        
        // Update the product in the list
        const updatedProducts = products.map(product => 
          product._id === productId 
            ? { 
                ...product, 
                barcodePrinted: true,
                lastPrintedAt: new Date()
              }
            : product
        );
        
        setProducts(updatedProducts);
        calculateStats(updatedProducts);
      }
    } catch (error) {
      handleApiError(error, 'Failed to mark barcode as printed');
    }
  }, [products, calculateStats, handleApiError]);

  const handleCopyBarcode = useCallback((barcode) => {
    navigator.clipboard.writeText(barcode)
      .then(() => message.success('Barcode copied to clipboard'))
      .catch(() => message.error('Failed to copy barcode'));
  }, []);

  // ✅ NEW: Print barcode label
  const printBarcodeLabel = useCallback(async (product) => {
    setPrintingBarcode(true);
    
    try {
      const element = document.getElementById(`barcode-${product._id}`);
      if (!element) {
        throw new Error('Barcode element not found');
      }
      
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [50, 30] // Small label size
      });
      
      const imgWidth = 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);
      
      // Add product info
      pdf.setFontSize(8);
      pdf.text(product.name.substring(0, 20), 25, imgHeight + 10, { align: 'center' });
      pdf.text(`KES ${product.minSellingPrice}`, 25, imgHeight + 15, { align: 'center' });
      
      pdf.save(`barcode-${product.barcode}.pdf`);
      
      // Mark as printed
      await handleMarkAsPrinted(product._id);
      
    } catch (error) {
      console.error('Error printing barcode:', error);
      message.error('Failed to print barcode');
    } finally {
      setPrintingBarcode(false);
    }
  }, [handleMarkAsPrinted]);

  // Prepare product data for API
  const prepareProductData = useCallback((values) => {
    const selectedShop = shops.find(shop => shop._id === values.shop);
    
    if (!selectedShop) {
      throw new Error('Selected shop not found. Please refresh and try again.');
    }

    const productData = {
      name: values.name.trim(),
      category: values.category.trim(),
      buyingPrice: Number(values.buyingPrice),
      minSellingPrice: Number(values.sellingPrice),
      currentStock: Number(values.currentStock) || 0,
      minStockLevel: Number(values.minStockLevel) || 5,
      shop: values.shop,
      shopName: selectedShop.name || selectedShop.shopName,
      // ✅ NEW: Barcode fields
      barcode: values.barcode?.trim() || undefined,
      barcodeType: values.barcodeType || 'INTERNAL'
    };

    return productData;
  }, [shops]);

  // Handle form submission
  const handleSubmit = useCallback(async (values) => {
    try {
      setLoading(true);
      
      const productData = prepareProductData(values);

      // Validation
      if (!productData.name || productData.name.length < 2) {
        message.error('Product name must be at least 2 characters long');
        return;
      }

      if (!productData.category || productData.category.length < 2) {
        message.error('Category must be at least 2 characters long');
        return;
      }

      if (productData.minSellingPrice < productData.buyingPrice) {
        message.error('Selling price cannot be less than buying price');
        return;
      }

      if (productData.currentStock < 0) {
        message.error('Stock cannot be negative');
        return;
      }

      let response;
      
      if (editingProduct) {
        response = await productAPI.update(editingProduct._id, productData);
        
        if (response && (response.success === true || response._id)) {
          const updatedProduct = response.data || response;
          const updatedProducts = products.map(product => 
            product._id === editingProduct._id 
              ? { 
                  ...product, 
                  ...updatedProduct,
                  displayShopName: getShopName({ ...product, ...updatedProduct })
                }
              : product
          );
          
          setProducts(updatedProducts);
          calculateStats(updatedProducts);
          setCategories(extractCategoriesFromProducts(updatedProducts));
          
          message.success('Product updated successfully');
          setIsModalVisible(false);
          setEditingProduct(null);
          form.resetFields();
        } else {
          throw new Error(response?.message || 'Failed to update product');
        }
      } else {
        response = await productAPI.create(productData);
        
        if (response && (response.success === true || response._id)) {
          const newProduct = response.data || response;
          const enhancedProduct = {
            ...newProduct,
            displayShopName: getShopName(newProduct)
          };
          const newProducts = [...products, enhancedProduct];
          setProducts(newProducts);
          calculateStats(newProducts);
          setCategories(extractCategoriesFromProducts(newProducts));
          
          message.success('Product created successfully');
          setIsModalVisible(false);
          form.resetFields();
        } else {
          throw new Error(response?.message || 'Failed to create product');
        }
      }
      
    } catch (error) {
      console.error('Error submitting product:', error);
      
      if (error.response?.status === 400) {
        message.error('Validation failed. Please check your input.');
      } else if (error.response?.status === 409) {
        message.error('A product with this name already exists in this shop');
      } else if (error.response?.status === 404) {
        message.error('Product not found. It may have been deleted.');
      } else {
        const errorMessage = error.message || 
                           (editingProduct ? 'Failed to update product' : 'Failed to add product');
        message.error(errorMessage);
      }
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

  // ✅ NEW: Get barcode status
  const getBarcodeStatus = useCallback((product) => {
    if (!product) return { status: 'default', text: 'No Barcode', color: '#d9d9d9' };
    
    if (!product.barcode) {
      return { 
        status: 'error', 
        text: 'No Barcode', 
        color: '#ff4d4f',
        icon: <ExclamationCircleOutlined />
      };
    } else if (!product.barcodePrinted) {
      return { 
        status: 'warning', 
        text: 'Not Printed', 
        color: '#faad14',
        icon: <PrinterOutlined />
      };
    } else {
      return { 
        status: 'success', 
        text: 'Printed', 
        color: '#52c41a',
        icon: <CheckCircleOutlined />
      };
    }
  }, []);

  // Shop options for forms
  const shopOptions = useMemo(() => {
    return shops.map(shop => ({
      value: shop._id,
      label: shop.name || shop.shopName || 'Unknown Shop',
      key: shop._id
    }));
  }, [shops]);

  // Shop filter options
  const shopFilterOptions = useMemo(() => {
    const baseOptions = [
      { value: 'all', label: 'All Shops' }
    ];
    
    const shopOptions = shops.map(shop => ({
      value: shop._id,
      label: shop.name || shop.shopName || 'Unknown Shop'
    }));
    
    return [...baseOptions, ...shopOptions];
  }, [shops]);

  // Category filter options
  const categoryFilterOptions = useMemo(() => {
    const baseOptions = [
      { value: 'all', label: 'All Categories' }
    ];
    
    const categoryOptions = categories.map(cat => ({
      value: cat,
      label: cat
    }));
    
    return [...baseOptions, ...categoryOptions];
  }, [categories]);

  // ✅ NEW: Barcode filter options
  const barcodeTypeFilterOptions = useMemo(() => {
    const baseOptions = [
      { value: 'all', label: 'All Barcode Types' }
    ];
    
    const typeOptions = barcodeTypeOptions.map(type => ({
      value: type.value,
      label: type.label
    }));
    
    return [...baseOptions, ...typeOptions];
  }, [barcodeTypeOptions]);

  // Get shop ID from product
  const getShopId = useCallback((product) => {
    if (!product) return null;
    
    if (product.shop && typeof product.shop === 'object') {
      return product.shop._id;
    } else if (product.shop) {
      return product.shop;
    } else if (product.shopId) {
      return product.shopId;
    }
    
    return null;
  }, []);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];

    return products.filter(product => {
      // Search filter
      const matchesSearch = searchText === '' || 
        (product.name && product.name.toLowerCase().includes(searchText.toLowerCase())) ||
        (product.category && product.category.toLowerCase().includes(searchText.toLowerCase())) ||
        (getShopName(product) && getShopName(product).toLowerCase().includes(searchText.toLowerCase())) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchText.toLowerCase()));

      // Shop filter
      const matchesShop = selectedShopFilter === 'all' || 
        getShopId(product) === selectedShopFilter;

      // Category filter
      const matchesCategory = selectedCategoryFilter === 'all' || 
        product.category === selectedCategoryFilter;

      // ✅ NEW: Barcode type filter
      const matchesBarcodeType = barcodeTypeFilter === 'all' || 
        product.barcodeType === barcodeTypeFilter;

      // ✅ NEW: Barcode generated filter
      const matchesBarcodeGenerated = barcodeGeneratedFilter === 'all' ||
        (barcodeGeneratedFilter === 'with' && product.barcode) ||
        (barcodeGeneratedFilter === 'without' && !product.barcode);

      return matchesSearch && matchesShop && matchesCategory && matchesBarcodeType && matchesBarcodeGenerated;
    });
  }, [products, searchText, selectedShopFilter, selectedCategoryFilter, barcodeTypeFilter, barcodeGeneratedFilter, getShopName, getShopId]);

  // Search and filter handlers
  const handleSearch = useCallback((value) => {
    setSearchText(value);
  }, []);

  const handleShopFilterChange = useCallback((value) => {
    setSelectedShopFilter(value);
  }, []);

  const handleCategoryFilterChange = useCallback((value) => {
    setSelectedCategoryFilter(value);
  }, []);

  const handleBarcodeTypeFilterChange = useCallback((value) => {
    setBarcodeTypeFilter(value);
  }, []);

  const handleBarcodeGeneratedFilterChange = useCallback((value) => {
    setBarcodeGeneratedFilter(value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setSelectedShopFilter('all');
    setSelectedCategoryFilter('all');
    setBarcodeTypeFilter('all');
    setBarcodeGeneratedFilter('all');
  }, []);

  // Format currency for display
  const formatCurrency = (amount) => {
    return `KES ${(amount || 0).toLocaleString('en-KE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // ✅ NEW: Generate internal barcode
  const generateInternalBarcode = useCallback(() => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `IN${timestamp}${random}`;
  }, []);

  // ✅ NEW: Handle barcode type change in form
  const handleBarcodeTypeChange = useCallback((value) => {
    if (value === 'INTERNAL' && !form.getFieldValue('barcode')) {
      form.setFieldsValue({ barcode: generateInternalBarcode() });
    }
  }, [form, generateInternalBarcode]);

  // Table columns
  const columns = useMemo(() => [
    { 
      title: <Text strong style={{ fontSize: '12px' }}>Product Name</Text>, 
      dataIndex: 'name', 
      key: 'name',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      render: (name, record) => {
        const stockStatus = getStockStatus(record);
        const barcodeStatus = getBarcodeStatus(record);
        return (
          <div>
            <div style={{ fontWeight: 500, fontSize: '12px' }}>{name || 'Unknown Product'}</div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
              <Badge 
                count={stockStatus.text}
                style={{ 
                  background: stockStatus.gradient,
                  border: 'none',
                  fontSize: '10px',
                  height: '20px',
                  padding: '0 8px',
                  borderRadius: '10px'
                }}
              />
              <Badge 
                count={barcodeStatus.text}
                style={{ 
                  background: barcodeStatus.gradient,
                  border: 'none',
                  fontSize: '10px',
                  height: '20px',
                  padding: '0 8px',
                  borderRadius: '10px'
                }}
              />
            </div>
          </div>
        );
      }
    },
    { 
      title: <Text strong style={{ fontSize: '12px' }}>Category</Text>, 
      dataIndex: 'category', 
      key: 'category',
      sorter: (a, b) => (a.category || '').localeCompare(b.category || ''),
      render: (category) => (
        <Tag color="purple" style={{ fontSize: '10px', borderRadius: '4px' }}>
          {category || 'Uncategorized'}
        </Tag>
      )
    },
    // ✅ NEW: Barcode column
    { 
      title: <Text strong style={{ fontSize: '12px' }}>Barcode</Text>, 
      dataIndex: 'barcode', 
      key: 'barcode',
      sorter: (a, b) => (a.barcode || '').localeCompare(b.barcode || ''),
      render: (barcode, record) => {
        if (!barcode) {
          return (
            <Tooltip title="Click to generate barcode">
              <Button 
                type="link" 
                size="small"
                onClick={() => handleGenerateBarcode(record._id)}
                style={{ fontSize: '10px', padding: 0 }}
              >
                Generate
              </Button>
            </Tooltip>
          );
        }
        
        const barcodeType = barcodeTypeOptions.find(opt => opt.value === record.barcodeType);
        return (
          <div>
            <div style={{ 
              fontFamily: 'monospace', 
              fontSize: '11px', 
              fontWeight: 'bold',
              color: '#1890ff'
            }}>
              {barcode}
            </div>
            <Tag 
              color={barcodeType?.color || 'blue'} 
              style={{ 
                fontSize: '9px', 
                marginTop: '2px',
                borderRadius: '2px'
              }}
            >
              {barcodeType?.label || record.barcodeType}
            </Tag>
          </div>
        );
      }
    },
    { 
      title: <Text strong style={{ fontSize: '12px' }}>Buying Price</Text>, 
      dataIndex: 'buyingPrice', 
      key: 'buyingPrice', 
      sorter: (a, b) => (a.buyingPrice || 0) - (b.buyingPrice || 0),
      render: price => (
        <Text strong style={{ fontSize: '12px', color: '#3498db' }}>
          {formatCurrency(price)}
        </Text>
      )
    },
    { 
      title: <Text strong style={{ fontSize: '12px' }}>Selling Price</Text>, 
      dataIndex: 'minSellingPrice', 
      key: 'minSellingPrice', 
      sorter: (a, b) => (a.minSellingPrice || 0) - (b.minSellingPrice || 0),
      render: price => (
        <Text strong style={{ fontSize: '12px', color: '#2ecc71' }}>
          {formatCurrency(price)}
        </Text>
      )
    },
    { 
      title: <Text strong style={{ fontSize: '12px' }}>Current Stock</Text>, 
      dataIndex: 'currentStock', 
      key: 'currentStock',
      sorter: (a, b) => (a.currentStock || 0) - (b.currentStock || 0),
      render: (stock, record) => {
        const stockStatus = getStockStatus(record);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: stockStatus.gradient,
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
                <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '14px' }} />
              </Tooltip>
            )}
          </div>
        );
      }
    },
    { 
      title: <Text strong style={{ fontSize: '12px' }}>Shop</Text>, 
      key: 'shop',
      sorter: (a, b) => getShopName(a).localeCompare(getShopName(b)),
      render: (_, record) => {
        const shopName = getShopName(record);
        const shopId = getShopId(record);
        
        return (
          <Tooltip title={`Shop ID: ${shopId || 'N/A'}`}>
            <Tag 
              color="blue" 
              style={{ 
                margin: 0, 
                cursor: 'pointer',
                fontSize: '10px',
                borderRadius: '4px',
                background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                border: 'none',
                color: 'white'
              }}
            >
              {shopName}
            </Tag>
          </Tooltip>
        );
      }
    },
    { 
      title: <Text strong style={{ fontSize: '12px' }}>Actions</Text>, 
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewProduct(record)}
              disabled={loading}
              size="small"
              style={{ color: '#3498db' }}
            />
          </Tooltip>
          {record.barcode && (
            <Tooltip title="Print Barcode">
              <Button 
                type="text" 
                icon={<PrinterOutlined />} 
                onClick={() => handlePrintBarcode(record)}
                disabled={loading}
                size="small"
                style={{ color: '#722ed1' }}
              />
            </Tooltip>
          )}
          <Tooltip title="Edit Product">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEditProduct(record)}
              disabled={loading}
              size="small"
              style={{ color: '#faad14' }}
            />
          </Tooltip>
          <Tooltip title="Delete Product">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDeleteProduct(record._id)}
              disabled={loading}
              size="small"
              style={{ color: '#ff4d4f' }}
            />
          </Tooltip>
        </Space>
      )
    },
  ], [handleViewProduct, handleEditProduct, handleDeleteProduct, handleGenerateBarcode, handlePrintBarcode, loading, getStockStatus, getBarcodeStatus, getShopName, getShopId, barcodeTypeOptions]);

  // Loading state
  if (fetching && products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <p style={{ fontSize: '12px', marginTop: '12px' }}>Loading products...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '12px',
      background: '#f5f7fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px', 
        flexWrap: 'wrap', 
        gap: '10px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ProductOutlined style={{ 
            fontSize: '24px', 
            color: '#3498db',
            background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
            padding: '8px',
            borderRadius: '8px',
            color: 'white'
          }} /> 
          <Title level={5} style={{ 
            margin: 0, 
            fontWeight: 'bold',
            background: 'linear-gradient(90deg, #3498db 0%, #2ecc71 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Product Management
          </Title>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button 
            icon={<SyncOutlined />} 
            onClick={handleBulkGenerateBarcodes}
            loading={bulkGenerateLoading}
            size="middle"
            style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              border: 'none',
              color: 'white',
              fontSize: '12px'
            }}
          >
            Bulk Barcodes
          </Button>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchProducts}
            loading={fetching}
            size="middle"
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              color: 'white',
              fontSize: '12px'
            }}
          >
            Refresh
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddProduct}
            disabled={fetching || shopOptions.length === 0}
            size="middle"
            style={{ 
              background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
              border: 'none',
              fontSize: '12px'
            }}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Statistics Cards - Updated with barcode stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: '16px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card 
            style={{ 
              borderRadius: '10px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
            bodyStyle={{ padding: '12px', textAlign: 'center' }}
          >
            <Statistic
              title={
                <Text style={{ color: 'white', fontSize: '11px', fontWeight: '500' }}>
                  Total Products
                </Text>
              }
              value={stats.total}
              prefix={<ProductOutlined style={{ color: 'white', fontSize: '16px' }} />}
              valueStyle={{ 
                color: 'white', 
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            style={{ 
              borderRadius: '10px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
              border: 'none',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
            }}
            bodyStyle={{ padding: '12px', textAlign: 'center' }}
          >
            <Statistic
              title={
                <Text style={{ color: 'white', fontSize: '11px', fontWeight: '500' }}>
                  With Barcodes
                </Text>
              }
              value={stats.withBarcode || 0}
              prefix={<BarcodeOutlined style={{ color: 'white', fontSize: '16px' }} />}
              valueStyle={{ 
                color: 'white', 
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            style={{ 
              borderRadius: '10px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
              border: 'none',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
            }}
            bodyStyle={{ padding: '12px', textAlign: 'center' }}
          >
            <Statistic
              title={
                <Text style={{ color: 'white', fontSize: '11px', fontWeight: '500' }}>
                  Without Barcodes
                </Text>
              }
              value={stats.withoutBarcode || 0}
              prefix={<ExclamationCircleOutlined style={{ color: 'white', fontSize: '16px' }} />}
              valueStyle={{ 
                color: 'white', 
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            style={{ 
              borderRadius: '10px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
              border: 'none',
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
            }}
            bodyStyle={{ padding: '12px', textAlign: 'center' }}
          >
            <Statistic
              title={
                <Text style={{ color: 'white', fontSize: '11px', fontWeight: '500' }}>
                  Printed Barcodes
                </Text>
              }
              value={stats.printedBarcodes || 0}
              prefix={<PrinterOutlined style={{ color: 'white', fontSize: '16px' }} />}
              valueStyle={{ 
                color: 'white', 
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Error Alert */}
      {error && (
        <Alert
          message={
            <Text strong style={{ fontSize: '12px' }}>
              Error Loading Products
            </Text>
          }
          description={
            <Text style={{ fontSize: '11px' }}>
              {error}
            </Text>
          }
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchProducts} style={{ fontSize: '11px' }}>
              Retry
            </Button>
          }
          style={{ 
            marginBottom: '16px', 
            borderRadius: '8px',
            fontSize: '12px'
          }}
        />
      )}

      {/* No Shops Warning */}
      {shopOptions.length === 0 && !fetching && (
        <Alert
          message={
            <Text strong style={{ fontSize: '12px' }}>
              No Shops Available
            </Text>
          }
          description={
            <div>
              <Text style={{ fontSize: '11px' }}>
                You need to create shops first before adding products.
              </Text>
              <Button 
                type="primary" 
                size="small" 
                onClick={fetchShops}
                loading={fetching}
                style={{ marginTop: '8px', fontSize: '11px' }}
              >
                Check for Shops
              </Button>
            </div>
          }
          type="warning"
          showIcon
          style={{ 
            marginBottom: '16px', 
            borderRadius: '8px',
            fontSize: '12px'
          }}
        />
      )}

      {/* Search and Filter Section */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FilterOutlined style={{ color: '#3498db', fontSize: '14px' }} />
            <Text strong style={{ fontSize: '14px' }}>Search & Filter</Text>
          </div>
        }
        style={{ 
          marginBottom: '16px',
          borderRadius: '10px',
          boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
          border: 'none'
        }}
        size="small"
      >
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search products, categories, barcodes..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              allowClear
              size="small"
              style={{ fontSize: '12px' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Filter by Shop"
              value={selectedShopFilter}
              onChange={handleShopFilterChange}
              options={shopFilterOptions}
              style={{ width: '100%' }}
              allowClear={false}
              size="small"
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Filter by Category"
              value={selectedCategoryFilter}
              onChange={handleCategoryFilterChange}
              options={categoryFilterOptions}
              style={{ width: '100%' }}
              allowClear={false}
              size="small"
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Barcode Type"
              value={barcodeTypeFilter}
              onChange={handleBarcodeTypeFilterChange}
              options={barcodeTypeFilterOptions}
              style={{ width: '100%' }}
              allowClear={false}
              size="small"
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Barcode Status"
              value={barcodeGeneratedFilter}
              onChange={handleBarcodeGeneratedFilterChange}
              options={[
                { value: 'all', label: 'All' },
                { value: 'with', label: 'With Barcode' },
                { value: 'without', label: 'Without Barcode' }
              ]}
              style={{ width: '100%' }}
              allowClear={false}
              size="small"
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button 
              icon={<FilterOutlined />}
              onClick={handleClearFilters}
              style={{ 
                width: '100%',
                fontSize: '12px'
              }}
              size="small"
            >
              Clear Filters
            </Button>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ 
              textAlign: 'right', 
              color: '#666', 
              fontSize: '11px',
              fontWeight: '500'
            }}>
              Showing: {filteredProducts.length} of {products.length}
            </div>
          </Col>
        </Row>
      </Card>

      {/* Products Table */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChartOutlined style={{ color: '#9b59b6', fontSize: '14px' }} />
            <Text strong style={{ fontSize: '14px' }}>
              Products ({filteredProducts.length} of {products.length})
            </Text>
          </div>
        }
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {stats.withoutBarcode > 0 && (
              <Popconfirm
                title="Generate barcodes for all products without one?"
                onConfirm={() => handleBulkGenerateBarcodes()}
                okText="Yes"
                cancelText="No"
              >
                <Button 
                  type="dashed" 
                  icon={<SyncOutlined />}
                  size="small"
                  style={{ fontSize: '11px' }}
                >
                  Generate {stats.withoutBarcode} Missing Barcodes
                </Button>
              </Popconfirm>
            )}
            {shopOptions.length > 0 && (
              <Tag 
                color="green" 
                style={{ 
                  fontSize: '10px',
                  background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
                  border: 'none',
                  color: 'white'
                }}
              >
                {shopOptions.length} shop{shopOptions.length !== 1 ? 's' : ''} available
              </Tag>
            )}
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchProducts}
              loading={fetching}
              size="small"
              style={{ fontSize: '11px' }}
            >
              Refresh
            </Button>
          </div>
        }
        style={{ 
          borderRadius: '10px',
          boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
          border: 'none'
        }}
      >
        <Table 
          columns={columns} 
          dataSource={filteredProducts} 
          rowKey="_id"
          pagination={{ 
            pageSize: 10, 
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => (
              <Text style={{ fontSize: '11px' }}>
                {range[0]}-{range[1]} of {total} items
              </Text>
            ),
            size: 'small'
          }}
          loading={fetching}
          scroll={{ x: '100%' }}
          locale={{ 
            emptyText: fetching ? 'Loading products...' : 'No products found'
          }}
          size="small"
        />
      </Card>

      {/* Add/Edit Product Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {editingProduct ? 
              <EditOutlined style={{ color: '#faad14', fontSize: '16px' }} /> : 
              <PlusOutlined style={{ color: '#2ecc71', fontSize: '16px' }} />
            }
            <Text strong style={{ fontSize: '14px' }}>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </Text>
          </div>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingProduct(null);
          form.resetFields();
        }}
        footer={null}
        width={Math.min(600, window.innerWidth * 0.95)}
        destroyOnClose
        maskClosable={!loading}
        style={{ top: 20 }}
      >
        <Form 
          form={form}
          onFinish={handleSubmit} 
          layout="vertical"
          requiredMark="optional"
          initialValues={{ 
            currentStock: 0, 
            minStockLevel: 5, 
            buyingPrice: 0, 
            sellingPrice: 0,
            barcodeType: 'INTERNAL'
          }}
        >
          <Form.Item 
            name="name" 
            label={
              <Text strong style={{ fontSize: '12px' }}>
                Product Name
              </Text>
            }
            rules={[
              { required: true, message: 'Please input product name' },
              { min: 2, message: 'Minimum 2 characters' },
              { max: 100, message: 'Maximum 100 characters' }
            ]}
          >
            <Input 
              placeholder="Enter product name" 
              disabled={loading}
              maxLength={100}
              showCount
              size="middle"
              style={{ fontSize: '12px' }}
            />
          </Form.Item>

          <Form.Item 
            name="category" 
            label={
              <Text strong style={{ fontSize: '12px' }}>
                Category
              </Text>
            }
            rules={[
              { required: true, message: 'Please input category name' },
              { min: 2, message: 'Minimum 2 characters' },
              { max: 50, message: 'Maximum 50 characters' }
            ]}
          >
            <Input 
              placeholder="Enter category name" 
              disabled={loading}
              maxLength={50}
              showCount
              size="middle"
              style={{ fontSize: '12px' }}
            />
          </Form.Item>

          {/* ✅ NEW: Barcode Section */}
          <div style={{ 
            padding: '12px', 
            background: '#f6ffed', 
            borderRadius: '6px',
            marginBottom: '16px',
            border: '1px solid #b7eb8f'
          }}>
            <Text strong style={{ fontSize: '12px', color: '#52c41a', marginBottom: '8px', display: 'block' }}>
              Barcode Information
            </Text>
            
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item 
                  name="barcodeType" 
                  label={
                    <Text strong style={{ fontSize: '12px' }}>
                      Barcode Type
                    </Text>
                  }
                >
                  <Select
                    onChange={handleBarcodeTypeChange}
                    options={barcodeTypeOptions}
                    placeholder="Select barcode type"
                    size="middle"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item 
                  name="barcode" 
                  label={
                    <Text strong style={{ fontSize: '12px' }}>
                      Barcode
                    </Text>
                  }
                  rules={[
                    { max: 50, message: 'Maximum 50 characters' }
                  ]}
                  extra={
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      Leave empty for auto-generation (Internal type only)
                    </Text>
                  }
                >
                  <Input 
                    placeholder="Enter barcode or leave empty"
                    disabled={loading}
                    maxLength={50}
                    size="middle"
                    style={{ fontSize: '12px' }}
                    suffix={
                      form.getFieldValue('barcodeType') === 'INTERNAL' && (
                        <Tooltip title="Generate barcode">
                          <SyncOutlined 
                            onClick={() => {
                              form.setFieldsValue({ barcode: generateInternalBarcode() });
                            }}
                            style={{ cursor: 'pointer', color: '#1890ff' }}
                          />
                        </Tooltip>
                      )
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item 
                name="buyingPrice" 
                label={
                  <Text strong style={{ fontSize: '12px' }}>
                    Buying Price
                  </Text>
                }
                rules={[
                  { required: true, message: 'Please input buying price' },
                  { 
                    type: 'number',
                    min: 0,
                    message: 'Price must be a positive number'
                  }
                ]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="0.00"
                  disabled={loading}
                  style={{ width: '100%', fontSize: '12px' }}
                  addonAfter="KES"
                  size="middle"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item 
                name="sellingPrice" 
                label={
                  <Text strong style={{ fontSize: '12px' }}>
                    Selling Price
                  </Text>
                }
                rules={[
                  { required: true, message: 'Please input selling price' },
                  { 
                    type: 'number',
                    min: 0,
                    message: 'Price must be a positive number'
                  }
                ]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="0.00"
                  disabled={loading}
                  style={{ width: '100%', fontSize: '12px' }}
                  addonAfter="KES"
                  size="middle"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item 
                name="currentStock" 
                label={
                  <Text strong style={{ fontSize: '12px' }}>
                    Current Stock
                  </Text>
                }
                rules={[
                  { required: true, message: 'Please input stock quantity' },
                  { 
                    type: 'number',
                    min: 0,
                    message: 'Stock cannot be negative'
                  }
                ]}
              >
                <InputNumber
                  min={0}
                  placeholder="0"
                  disabled={loading}
                  style={{ width: '100%', fontSize: '12px' }}
                  size="middle"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item 
                name="minStockLevel" 
                label={
                  <span>
                    <Text strong style={{ fontSize: '12px' }}>
                      Min Stock Level
                    </Text>
                    <Tooltip title="Alert level for low stock">
                      <InfoCircleOutlined style={{ marginLeft: '4px', color: '#999', fontSize: '12px' }} />
                    </Tooltip>
                  </span>
                }
                rules={[
                  { required: true, message: 'Please input minimum stock level' },
                  { 
                    type: 'number',
                    min: 0,
                    message: 'Must be a positive number'
                  }
                ]}
              >
                <InputNumber
                  min={0}
                  placeholder="5"
                  disabled={loading}
                  style={{ width: '100%', fontSize: '12px' }}
                  size="middle"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item 
            name="shop" 
            label={
              <Text strong style={{ fontSize: '12px' }}>
                Shop
              </Text>
            }
            rules={[{ required: true, message: 'Please select shop' }]}
            help={
              shopOptions.length === 0 ? 
                <Text style={{ fontSize: '11px', color: '#faad14' }}>
                  No shops available. Please add shops first.
                </Text> : 
                undefined
            }
          >
            <Select 
              placeholder="Select shop" 
              disabled={loading || shopOptions.length === 0}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
              options={shopOptions}
              notFoundContent={
                <Text style={{ fontSize: '11px' }}>
                  {shopOptions.length === 0 ? "No shops available" : "No shops found"}
                </Text>
              }
              size="middle"
            />
          </Form.Item>

          <div style={{ 
            textAlign: 'right', 
            paddingTop: '16px', 
            borderTop: '1px solid #f0f0f0',
            marginTop: '16px'
          }}>
            <Button 
              onClick={() => setIsModalVisible(false)} 
              style={{ marginRight: 8, fontSize: '12px' }}
              disabled={loading}
              size="middle"
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={loading}
              disabled={shopOptions.length === 0}
              size="middle"
              style={{ 
                background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                border: 'none',
                fontSize: '12px'
              }}
            >
              {editingProduct ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* View Product Modal - Updated with barcode info */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EyeOutlined style={{ color: '#3498db', fontSize: '16px' }} />
            <Text strong style={{ fontSize: '14px' }}>
              Product Details
            </Text>
          </div>
        }
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button 
            key="print" 
            type="default"
            icon={<PrinterOutlined />}
            onClick={() => {
              setIsViewModalVisible(false);
              handlePrintBarcode(selectedProduct);
            }}
            disabled={!selectedProduct?.barcode}
            style={{ fontSize: '12px' }}
            size="middle"
          >
            Print Barcode
          </Button>,
          <Button 
            key="edit" 
            type="primary" 
            onClick={() => {
              setIsViewModalVisible(false);
              handleEditProduct(selectedProduct);
            }}
            style={{ 
              background: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)',
              border: 'none',
              fontSize: '12px'
            }}
            size="middle"
          >
            Edit Product
          </Button>,
          <Button 
            key="close" 
            onClick={() => setIsViewModalVisible(false)}
            size="middle"
            style={{ fontSize: '12px' }}
          >
            Close
          </Button>
        ]}
        width={Math.min(600, window.innerWidth * 0.95)}
        style={{ top: 20 }}
      >
        {selectedProduct && (
          <Tabs defaultActiveKey="1">
            <TabPane tab="Basic Info" key="1">
              <div style={{ lineHeight: '2', fontSize: '12px' }}>
                <Divider style={{ margin: '8px 0' }}>Basic Information</Divider>
                <p>
                  <strong>Name:</strong>{' '}
                  <Text strong style={{ color: '#2c3e50', fontSize: '13px' }}>
                    {selectedProduct.name}
                  </Text>
                </p>
                <p>
                  <strong>Category:</strong>{' '}
                  <Tag color="purple" style={{ fontSize: '10px' }}>
                    {selectedProduct.category || 'Uncategorized'}
                  </Tag>
                </p>
                
                <Divider style={{ margin: '8px 0' }}>Pricing</Divider>
                <p>
                  <strong>Buying Price:</strong>{' '}
                  <Text strong style={{ color: '#3498db', fontSize: '12px' }}>
                    {formatCurrency(selectedProduct.buyingPrice)}
                  </Text>
                </p>
                <p>
                  <strong>Selling Price:</strong>{' '}
                  <Text strong style={{ color: '#2ecc71', fontSize: '12px' }}>
                    {formatCurrency(selectedProduct.minSellingPrice)}
                  </Text>
                </p>
                <p>
                  <strong>Profit Margin:</strong>{' '}
                  <Text 
                    strong 
                    style={{ 
                      color: selectedProduct.minSellingPrice > selectedProduct.buyingPrice ? '#2ecc71' : '#e74c3c',
                      fontSize: '12px'
                    }}
                  >
                    {((selectedProduct.minSellingPrice - selectedProduct.buyingPrice) / selectedProduct.buyingPrice * 100).toFixed(2)}%
                  </Text>
                </p>
                
                <Divider style={{ margin: '8px 0' }}>Stock Information</Divider>
                <p>
                  <strong>Current Stock:</strong>{' '}
                  <Badge 
                    count={selectedProduct.currentStock} 
                    style={{ 
                      backgroundColor: getStockStatus(selectedProduct).color,
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  />
                </p>
                <p>
                  <strong>Min Stock Level:</strong>{' '}
                  <Text style={{ fontSize: '12px' }}>
                    {selectedProduct.minStockLevel || 5}
                  </Text>
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  <Badge 
                    count={getStockStatus(selectedProduct).text}
                    style={{ 
                      background: getStockStatus(selectedProduct).gradient,
                      border: 'none',
                      fontSize: '10px',
                      padding: '0 8px',
                      height: '20px',
                      borderRadius: '10px',
                      color: 'white'
                    }}
                  />
                </p>
                
                <Divider style={{ margin: '8px 0' }}>Shop Information</Divider>
                <p>
                  <strong>Shop:</strong>{' '}
                  <Tag 
                    color="blue" 
                    style={{ 
                      marginLeft: '8px',
                      fontSize: '10px',
                      background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                      border: 'none',
                      color: 'white'
                    }}
                  >
                    {getShopName(selectedProduct)}
                  </Tag>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                    Shop ID: {getShopId(selectedProduct) || 'N/A'}
                  </div>
                </p>
                
                {selectedProduct.createdAt && (
                  <>
                    <Divider style={{ margin: '8px 0' }}>Timestamps</Divider>
                    <p>
                      <strong>Created:</strong>{' '}
                      <Text style={{ fontSize: '11px' }}>
                        {new Date(selectedProduct.createdAt).toLocaleString()}
                      </Text>
                    </p>
                    {selectedProduct.updatedAt && (
                      <p>
                        <strong>Last Updated:</strong>{' '}
                        <Text style={{ fontSize: '11px' }}>
                          {new Date(selectedProduct.updatedAt).toLocaleString()}
                        </Text>
                      </p>
                    )}
                  </>
                )}
              </div>
            </TabPane>
            
            <TabPane tab="Barcode Info" key="2">
              <div style={{ lineHeight: '2', fontSize: '12px' }}>
                {selectedProduct.barcode ? (
                  <>
                    <Divider style={{ margin: '8px 0' }}>Barcode Details</Divider>
                    <p>
                      <strong>Barcode:</strong>{' '}
                      <Text 
                        strong 
                        style={{ 
                          fontFamily: 'monospace',
                          fontSize: '14px',
                          color: '#1890ff',
                          background: '#f0f5ff',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}
                      >
                        {selectedProduct.barcode}
                      </Text>
                      <Button 
                        type="text" 
                        icon={<CopyOutlined />} 
                        size="small"
                        onClick={() => handleCopyBarcode(selectedProduct.barcode)}
                        style={{ marginLeft: '8px' }}
                      />
                    </p>
                    <p>
                      <strong>Type:</strong>{' '}
                      <Tag 
                        color={barcodeTypeOptions.find(opt => opt.value === selectedProduct.barcodeType)?.color || 'blue'}
                        style={{ fontSize: '10px' }}
                      >
                        {barcodeTypeOptions.find(opt => opt.value === selectedProduct.barcodeType)?.label || selectedProduct.barcodeType}
                      </Tag>
                    </p>
                    <p>
                      <strong>Generated:</strong>{' '}
                      <Tag color={selectedProduct.barcodeGenerated ? 'green' : 'orange'} style={{ fontSize: '10px' }}>
                        {selectedProduct.barcodeGenerated ? 'Yes' : 'No'}
                      </Tag>
                    </p>
                    <p>
                      <strong>Printed:</strong>{' '}
                      <Tag color={selectedProduct.barcodePrinted ? 'green' : 'orange'} style={{ fontSize: '10px' }}>
                        {selectedProduct.barcodePrinted ? 'Yes' : 'No'}
                      </Tag>
                      {selectedProduct.lastPrintedAt && (
                        <Text style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
                          ({new Date(selectedProduct.lastPrintedAt).toLocaleDateString()})
                        </Text>
                      )}
                    </p>
                    
                    <Divider style={{ margin: '8px 0' }}>Barcode Preview</Divider>
                    <div 
                      id={`barcode-preview-${selectedProduct._id}`}
                      style={{ 
                        textAlign: 'center',
                        padding: '20px',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0',
                        marginTop: '12px'
                      }}
                    >
                      <QRCode 
                        value={selectedProduct.barcode}
                        size={150}
                        style={{ marginBottom: '12px' }}
                      />
                      <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold' }}>
                        {selectedProduct.barcode}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        {selectedProduct.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                        {formatCurrency(selectedProduct.minSellingPrice)}
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                      <Button 
                        type="primary"
                        icon={<PrinterOutlined />}
                        onClick={() => printBarcodeLabel(selectedProduct)}
                        loading={printingBarcode}
                        style={{ marginRight: '8px' }}
                      >
                        Print Label
                      </Button>
                      {!selectedProduct.barcodePrinted && (
                        <Button 
                          onClick={() => handleMarkAsPrinted(selectedProduct._id)}
                        >
                          Mark as Printed
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <BarcodeOutlined style={{ fontSize: '48px', color: '#999', marginBottom: '16px' }} />
                    <Text style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                      No barcode assigned to this product
                    </Text>
                    <Button 
                      type="primary"
                      icon={<SyncOutlined />}
                      onClick={() => handleGenerateBarcode(selectedProduct._id)}
                    >
                      Generate Barcode
                    </Button>
                  </div>
                )}
              </div>
            </TabPane>
          </Tabs>
        )}
      </Modal>

      {/* Barcode Print Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PrinterOutlined style={{ color: '#722ed1', fontSize: '16px' }} />
            <Text strong style={{ fontSize: '14px' }}>
              Print Barcode Label
            </Text>
          </div>
        }
        open={barcodeModalVisible}
        onCancel={() => setBarcodeModalVisible(false)}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => setBarcodeModalVisible(false)}
            size="middle"
            style={{ fontSize: '12px' }}
          >
            Cancel
          </Button>,
          <Button 
            key="print" 
            type="primary"
            icon={<PrinterOutlined />}
            loading={printingBarcode}
            onClick={() => selectedBarcodeProduct && printBarcodeLabel(selectedBarcodeProduct)}
            size="middle"
            style={{ 
              background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
              border: 'none',
              fontSize: '12px'
            }}
          >
            Print Label
          </Button>
        ]}
        width={400}
      >
        {selectedBarcodeProduct && (
          <div>
            <div 
              id={`barcode-${selectedBarcodeProduct._id}`}
              style={{ 
                textAlign: 'center',
                padding: '20px',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #f0f0f0',
                marginBottom: '16px'
              }}
            >
              <QRCode 
                value={selectedBarcodeProduct.barcode}
                size={200}
                style={{ marginBottom: '16px' }}
              />
              <div style={{ 
                fontFamily: 'monospace', 
                fontSize: '18px', 
                fontWeight: 'bold',
                letterSpacing: '2px'
              }}>
                {selectedBarcodeProduct.barcode}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '500',
                marginTop: '8px',
                color: '#2c3e50'
              }}>
                {selectedBarcodeProduct.name}
              </div>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold',
                marginTop: '4px',
                color: '#2ecc71'
              }}>
                {formatCurrency(selectedBarcodeProduct.minSellingPrice)}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#666',
                marginTop: '4px'
              }}>
                {selectedBarcodeProduct.category} • {getShopName(selectedBarcodeProduct)}
              </div>
            </div>
            
            <div style={{ fontSize: '12px', color: '#666' }}>
              <p><strong>Printing Instructions:</strong></p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li>Ensure your printer is connected and has label paper</li>
                <li>Click "Print Label" to generate PDF</li>
                <li>Print the PDF on your label printer</li>
                <li>Apply the label to the product</li>
              </ul>
            </div>
            
            {!selectedBarcodeProduct.barcodePrinted && (
              <Alert
                message="This barcode hasn't been marked as printed"
                type="warning"
                showIcon
                style={{ marginTop: '16px' }}
                action={
                  <Button 
                    size="small" 
                    onClick={() => handleMarkAsPrinted(selectedBarcodeProduct._id)}
                  >
                    Mark as Printed
                  </Button>
                }
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductManagement;