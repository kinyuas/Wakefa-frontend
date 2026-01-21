// src/services/api.js - UPDATED: TOKEN-BASED AUTHENTICATION SYSTEM
import axios from 'axios';
import { CalculationUtils } from '../utils/calculationUtils';

// Enhanced Configuration
const API_CONFIG = {
  baseURL: 'http://localhost:5002/api' || process.env.REACT_APP_API_BASE_URL,
  timeout: 15000,
  retryAttempts: 2,
  retryDelay: 1000,
  cacheTimeout: 60000,
  tokenRefreshThreshold: 300000 // 5 minutes before expiry
};

// Enhanced Error handler
const handleApiError = (error) => {
  console.error('API Error Details:', {
    status: error.response?.status,
    data: error.response?.data,
    message: error.message,
    code: error.code,
    config: error.config
  });

  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please check your connection and try again.';
  }
  
  if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
    return 'Cannot connect to server. Please check if the backend is running.';
  }
  
  if (error.response?.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  
  if (error.response?.status === 404) {
    return 'Endpoint not found. Please check if the backend server is running.';
  }
  
  if (error.response?.status === 500) {
    const serverError = error.response?.data;
    if (serverError?.error) {
      if (serverError.error.includes('validation failed')) {
        const fieldErrors = serverError.errors ? Object.values(serverError.errors).map(err => err.message) : [];
        return `Validation failed: ${fieldErrors.join(', ')}`;
      }
      return serverError.error;
    }
    return 'Server error. Please try again later.';
  }
  
  if (error.response?.status === 400 || error.response?.status === 401) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    return 'Invalid email or password. Please try again.';
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

// Enhanced Cache System
const createCache = () => {
  const cache = {
    data: {},
    timestamps: {},
    
    get: (key) => {
      const item = cache.data[key];
      const timestamp = cache.timestamps[key];
      if (item && timestamp && Date.now() - timestamp < API_CONFIG.cacheTimeout) {
        console.log(`🔄 Using cached data for: ${key}`);
        return item;
      }
      return null;
    },
    
    set: (key, data) => {
      cache.data[key] = data;
      cache.timestamps[key] = Date.now();
    },
    
    clear: (key) => {
      delete cache.data[key];
      delete cache.timestamps[key];
    },
    
    clearAll: () => {
      cache.data = {};
      cache.timestamps = {};
    },
    
    cleanup: () => {
      const now = Date.now();
      Object.keys(cache.timestamps).forEach(key => {
        if (now - cache.timestamps[key] > API_CONFIG.cacheTimeout) {
          delete cache.data[key];
          delete cache.timestamps[key];
        }
      });
    }
  };

  setInterval(() => cache.cleanup(), 300000);
  
  return cache;
};

const cache = createCache();

// ==================== TOKEN MANAGEMENT ====================

class TokenManager {
  constructor() {
    this.isRefreshing = false;
    this.refreshSubscribers = [];
  }

  // Get stored token
  getToken() {
    return localStorage.getItem('token') || 
           localStorage.getItem('adminToken') || 
           localStorage.getItem('userToken') || 
           localStorage.getItem('cashierToken');
  }

  // Get refresh token
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  // Store tokens
  storeTokens(token, refreshToken, userData) {
    console.log('🔐 Storing authentication tokens:', { 
      tokenLength: token ? token.length : 0,
      refreshTokenLength: refreshToken ? refreshToken.length : 0,
      userRole: userData?.role 
    });
    
    if (!userData) {
      throw new Error('No user data provided for token storage');
    }

    // Store user data
    const role = userData.role;
    if (role === 'admin') {
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('adminData', JSON.stringify(userData));
      if (token) {
        localStorage.setItem('adminToken', token);
        localStorage.setItem('token', token);
      }
    } else if (role === 'cashier') {
      localStorage.setItem('cashierData', JSON.stringify(userData));
      localStorage.setItem('userData', JSON.stringify(userData));
      if (token) {
        localStorage.setItem('cashierToken', token);
        localStorage.setItem('token', token);
      }
    } else {
      localStorage.setItem('userData', JSON.stringify(userData));
      if (token) {
        localStorage.setItem('userToken', token);
        localStorage.setItem('token', token);
      }
    }

    // Store refresh token
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }

    // Store token expiry (8 hours default)
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 8);
    localStorage.setItem('tokenExpiry', tokenExpiry.toISOString());
    
    // Store last login
    localStorage.setItem('lastLogin', new Date().toISOString());

    console.log('✅ Tokens stored successfully for role:', role);
  }

  // Clear all auth data
  clearAuthData() {
    localStorage.removeItem('userData');
    localStorage.removeItem('adminData');
    localStorage.removeItem('cashierData');
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userToken');
    localStorage.removeItem('cashierToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('lastLogin');
    console.log('🧹 All authentication data cleared');
  }

  // Check if token is expired
  isTokenExpired() {
    const expiry = localStorage.getItem('tokenExpiry');
    if (!expiry) return true;
    
    const expiryTime = new Date(expiry).getTime();
    const currentTime = Date.now();
    const threshold = API_CONFIG.tokenRefreshThreshold;
    
    return currentTime >= (expiryTime - threshold);
  }

  // Check if token needs refresh
  shouldRefreshToken() {
    return this.isTokenExpired() && this.getRefreshToken();
  }

  // Refresh token
  async refreshToken() {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push(resolve);
      });
    }

    this.isRefreshing = true;
    
    try {
      console.log('🔄 Refreshing access token...');
      const refreshToken = this.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${API_CONFIG.baseURL}/auth/refresh-token`, {
        refreshToken
      });

      if (response.data.success) {
        const { token, refreshToken: newRefreshToken } = response.data;
        
        // Get existing user data
        const userData = localStorage.getItem('userData');
        const parsedUserData = userData ? JSON.parse(userData) : null;
        
        // Update tokens
        this.storeTokens(token, newRefreshToken, parsedUserData);
        
        // Notify all subscribers
        this.refreshSubscribers.forEach(callback => callback(token));
        this.refreshSubscribers = [];
        
        console.log('✅ Token refreshed successfully');
        return token;
      } else {
        throw new Error(response.data.message || 'Failed to refresh token');
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      this.clearAuthData();
      window.location.href = '/login';
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  // Validate token
  async validateToken() {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await axios.get(`${API_CONFIG.baseURL}/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return response.data.success === true;
    } catch (error) {
      console.error('❌ Token validation failed:', error);
      return false;
    }
  }

  // Get current user
  getCurrentUser() {
    try {
      const userData = localStorage.getItem('userData') || 
                      localStorage.getItem('adminData') || 
                      localStorage.getItem('cashierData');
      
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  // Check if user is logged in
  isLoggedIn() {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  // Check specific role
  isRole(role) {
    const user = this.getCurrentUser();
    return user?.role === role;
  }
}

const tokenManager = new TokenManager();

// ==================== ENHANCED AXIOS INSTANCE WITH TOKEN MANAGEMENT ====================

const createApiInstance = (baseURL = API_CONFIG.baseURL, customTimeout = null) => {
  const instance = axios.create({
    baseURL,
    timeout: customTimeout || API_CONFIG.timeout,
    headers: { 
      'Content-Type': 'application/json'
    }
  });

  // Request interceptor with token management
  instance.interceptors.request.use(
    async (config) => {
      // Check if token needs refresh before request
      if (tokenManager.shouldRefreshToken() && !config.url.includes('/auth/refresh-token')) {
        try {
          const newToken = await tokenManager.refreshToken();
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
          }
        } catch (error) {
          console.error('Failed to refresh token:', error);
          // Continue with existing token or no token
        }
      }

      // Add current token
      const token = tokenManager.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add cache busting for GET requests
      if (config.method === 'get') {
        config.params = {
          ...config.params,
          _t: Date.now()
        };
      }
      
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
        hasToken: !!token,
        params: config.params
      });
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor with token refresh
  instance.interceptors.response.use(
    (response) => {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - Success`);
      return response;
    },
    async (error) => {
      const originalRequest = error.config;
      
      // Handle network errors and retries
      if ((error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR') && 
          !originalRequest._retryCount) {
        
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
        
        if (originalRequest._retryCount <= API_CONFIG.retryAttempts) {
          console.log(`🔄 Retry attempt ${originalRequest._retryCount} for: ${originalRequest.url}`);
          
          const delay = API_CONFIG.retryDelay * Math.pow(2, originalRequest._retryCount - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return instance(originalRequest);
        }
      }
      
      // Handle token expiration (401)
      if (error.response?.status === 401 && !originalRequest._retry) {
        const token = tokenManager.getToken();
        const refreshToken = tokenManager.getRefreshToken();
        
        // If we have a refresh token, try to refresh
        if (refreshToken && token) {
          originalRequest._retry = true;
          
          try {
            const newToken = await tokenManager.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return instance(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed, logging out:', refreshError);
            tokenManager.clearAuthData();
            window.location.href = '/login';
          }
        } else {
          // No refresh token, clear auth and redirect
          tokenManager.clearAuthData();
          window.location.href = '/login';
        }
      }
      
      // Handle token blacklist or invalid token
      if (error.response?.status === 401 && error.response?.data?.message?.includes('blacklisted')) {
        console.log('Token is blacklisted, logging out');
        tokenManager.clearAuthData();
        window.location.href = '/login';
      }
      
      console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        code: error.code,
        retryCount: originalRequest._retryCount
      });
      
      return Promise.reject(error);
    }
  );

  return instance;
};

const api = createApiInstance();
const quickApi = createApiInstance(API_CONFIG.baseURL, 10000);
const fastApi = createApiInstance(API_CONFIG.baseURL, 5000);

// ==================== ENHANCED AUTH API SERVICE WITH TOKEN MANAGEMENT ====================

export const authAPI = {
  // Token management
  tokenManager: tokenManager,
  
  // Set auth token for requests
  setAuthToken: (token) => {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    quickApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fastApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  // Clear auth token
  clearAuthToken: () => {
    delete api.defaults.headers.common['Authorization'];
    delete quickApi.defaults.headers.common['Authorization'];
    delete fastApi.defaults.headers.common['Authorization'];
  },

  // Admin secure code login flow
  requestSecureCode: async (emailData) => {
    try {
      const fastInstance = createApiInstance(API_CONFIG.baseURL, 8000);
      const response = await fastInstance.post('/auth/request-code', emailData);
      return response.data;
    } catch (error) {
      console.error('❌ Secure code request error:', error);
      throw new Error(handleApiError(error));
    }
  },

  verifySecureCode: async (codeData) => {
    try {
      const fastInstance = createApiInstance(API_CONFIG.baseURL, 8000);
      const response = await fastInstance.post('/auth/verify-code', codeData);
      
      const data = response.data;
      
      // Extract user data and tokens
      const user = data.user || data.data?.user || data.data || {};
      const token = data.token;
      const refreshToken = data.refreshToken;

      // Store tokens using token manager
      if (token && user) {
        tokenManager.storeTokens(token, refreshToken, user);
        authAPI.setAuthToken(token);
      }
      
      cache.clearAll();
      console.log(`✅ ${user.role} login successful with tokens`);
      return data;
    } catch (error) {
      console.error('❌ Secure code verification error:', error);
      throw new Error(handleApiError(error));
    }
  },

  // Cashier login with token generation
  cashierLogin: async (credentials) => {
    try {
      console.log('🔐 Attempting cashier login with token generation...');

      // Clear existing auth data
      tokenManager.clearAuthData();

      let response;
      let usedEndpoint = '';
      
      const loginAttempts = [
        '/auth/cashier/login',
        '/cashier/login',
        '/auth/login'
      ];

      for (const endpoint of loginAttempts) {
        try {
          console.log(`🔄 Trying login endpoint: ${endpoint}`);
          const fastInstance = createApiInstance(API_CONFIG.baseURL, 8000);
          response = await fastInstance.post(endpoint, {
            email: credentials.email,
            password: credentials.password,
            role: 'cashier'
          });
          usedEndpoint = endpoint;
          console.log(`✅ Success with endpoint: ${endpoint}`);
          break;
        } catch (endpointError) {
          console.log(`❌ Failed with endpoint ${endpoint}:`, endpointError.response?.status);
          continue;
        }
      }

      if (!response) {
        throw new Error('All login endpoints failed. Please check backend routes.');
      }

      console.log('✅ Login response received:', response.data);

      const data = response.data;
      
      if (data.success === true || data.token || data.access_token) {
        const user = data.user || data.data?.user || data.data || data;
        const token = data.token || data.access_token;
        const refreshToken = data.refreshToken;

        if (!token) {
          throw new Error('No authentication token received');
        }

        // Store tokens using token manager
        tokenManager.storeTokens(token, refreshToken, user);
        authAPI.setAuthToken(token);
        
        cache.clearAll();
        
        console.log('✅ Cashier login successful with tokens:', {
          user: { id: user.id, email: user.email, role: user.role },
          tokenReceived: !!token,
          refreshTokenReceived: !!refreshToken,
          endpointUsed: usedEndpoint
        });
        
        return {
          success: true,
          user: user,
          token: token,
          refreshToken: refreshToken,
          message: data.message || 'Login successful'
        };
      } else {
        throw new Error(data.message || 'Login failed: Invalid response structure');
      }
    } catch (error) {
      console.error('❌ Cashier login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      tokenManager.clearAuthData();
      
      let errorMessage = handleApiError(error);
      
      if (error.response?.status === 404) {
        errorMessage = 'Login service unavailable. Please contact administrator.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message.includes('All login endpoints failed')) {
        errorMessage = 'Cannot connect to authentication service. Please check if the server is running.';
      }
      
      throw new Error(errorMessage);
    }
  },

  // Token refresh
  refreshToken: async () => {
    try {
      return await tokenManager.refreshToken();
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      throw new Error(handleApiError(error));
    }
  },

  // Token validation
  validateToken: async () => {
    try {
      return await tokenManager.validateToken();
    } catch (error) {
      console.error('❌ Token validation error:', error);
      return false;
    }
  },

  // Logout with token blacklisting
  logout: async () => {
    try {
      const token = tokenManager.getToken();
      
      if (token) {
        // Call logout endpoint to blacklist token
        try {
          await api.post('/auth/logout');
          console.log('✅ Token blacklisted on server');
        } catch (error) {
          console.warn('⚠️ Server logout failed, clearing local data:', error.message);
        }
      }
      
      // Clear all local auth data
      tokenManager.clearAuthData();
      authAPI.clearAuthToken();
      cache.clearAll();
      
      console.log('✅ Logout completed - all user data cleared and tokens invalidated');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still clear local data even if server call fails
      tokenManager.clearAuthData();
      authAPI.clearAuthToken();
      cache.clearAll();
    }
  },

  // User status checks
  isCashierLoggedIn: () => {
    return tokenManager.isRole('cashier') && tokenManager.isLoggedIn();
  },

  isAdminLoggedIn: () => {
    return tokenManager.isRole('admin') && tokenManager.isLoggedIn();
  },

  getCurrentCashier: () => {
    const user = tokenManager.getCurrentUser();
    return user?.role === 'cashier' ? user : null;
  },

  getCurrentUser: () => {
    return tokenManager.getCurrentUser();
  },

  // Check if token needs refresh
  shouldRefreshToken: () => {
    return tokenManager.shouldRefreshToken();
  }
};

// ==================== OPTIMIZED TRANSACTION API SERVICE ====================

export const transactionAPI = {
  create: async (transactionData) => {
    try {
      console.log('💰 Creating transaction...');

      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.post('/transactions', transactionData);
      cache.clearAll();
      
      console.log('✅ Transaction created successfully');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      
      let errorMessage = 'Transaction failed. ';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage += 'Request timed out. Please check your connection and try again.';
      } else if (error.response?.status === 500) {
        errorMessage += 'Server error. Please try again.';
      } else {
        errorMessage += handleApiError(error);
      }
      
      throw new Error(errorMessage);
    }
  },

  getAll: async (params = {}) => {
    try {
      const cacheKey = `transactions_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await api.get('/transactions', { params });
      const data = response.data?.data || response.data;
      
      const allData = Array.isArray(data) ? data : data;
      
      cache.set(cacheKey, allData);
      return allData;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error(handleApiError(error));
    }
  },

  getById: async (id) => {
    try {
      const transactionId = typeof id === 'object' ? id._id || id.id || id.transactionId : id;
      
      if (!transactionId) {
        throw new Error('Invalid transaction ID');
      }
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }
      
      const response = await api.get(`/transactions/${transactionId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  },

  update: async (id, data) => {
    try {
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await api.put(`/transactions/${id}`, data);
      cache.clearAll();
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw new Error(handleApiError(error));
    }
  },

  delete: async (id) => {
    try {
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await api.delete(`/transactions/${id}`);
      cache.clearAll();
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw new Error(handleApiError(error));
    }
  }
};

// ==================== ENHANCED UNIFIED API SERVICE ====================

export const unifiedAPI = {
  getCombinedTransactions: async (params = {}) => {
    try {
      console.log('🚀 Fetching combined transactions...', params);
      
      const cacheKey = `combined_transactions_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached combined transactions');
        return cached;
      }
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }
      
      const response = await quickApi.get('/transactions/combined', { params });
      
      const data = response.data?.data || response.data;
      
      console.log('📊 Raw API Response Structure:', {
        hasSummary: !!data.summary,
        hasFinancialStats: !!data.financialStats,
        transactionsCount: data.transactions?.length || data.salesWithProfit?.length || 0
      });

      const transactions = data.transactions || 
                          data.salesWithProfit || 
                          data.filteredTransactions || 
                          data.comprehensiveData?.transactions || 
                          [];

      const allTransactions = transactions;

      const expenses = data.expenses || data.comprehensiveData?.expenses || [];
      const products = data.products || data.comprehensiveData?.products || [];
      const shops = data.shops || data.comprehensiveData?.shops || [];
      const cashiers = data.cashiers || data.comprehensiveData?.cashiers || [];

      const normalizedTransactions = allTransactions.map(transaction => {
        const totalAmount = CalculationUtils.safeNumber(transaction.totalAmount);
        
        return {
          ...transaction,
          totalAmount: totalAmount,
          cost: CalculationUtils.safeNumber(transaction.cost),
          profit: CalculationUtils.safeNumber(transaction.profit),
          profitMargin: CalculationUtils.safeNumber(transaction.profitMargin),
          displayDate: transaction.displayDate || 
                      new Date(transaction.saleDate || transaction.createdAt).toLocaleString('en-KE'),
          shopName: transaction.shopName || 
                   (transaction.shop && typeof transaction.shop === 'object' ? transaction.shop.name : 'Unknown Shop'),
          cashierName: transaction.cashierName || 'Unknown Cashier'
        };
      });

      console.log('📈 Normalized data counts:', {
        transactions: normalizedTransactions.length,
        expenses: expenses.length,
        products: products.length
      });

      const enhancedData = {
        transactions: normalizedTransactions,
        salesWithProfit: normalizedTransactions,
        filteredTransactions: normalizedTransactions,
        expenses: expenses,
        products: products,
        shops: shops,
        cashiers: cashiers,
        
        summary: data.summary || CalculationUtils.getDefaultStats(),
        financialStats: data.financialStats || data.summary || CalculationUtils.getDefaultStats(),
        enhancedStats: data.enhancedStats || {
          salesWithProfit: normalizedTransactions,
          financialStats: data.summary || data.financialStats || CalculationUtils.getDefaultStats()
        }
      };

      cache.set(cacheKey, enhancedData);
      console.log('✅ Combined transactions data received');
      return enhancedData;
    } catch (error) {
      console.error('❌ Error fetching combined transactions:', error);
      
      const fallbackData = {
        transactions: [],
        salesWithProfit: [],
        filteredTransactions: [],
        shops: [],
        cashiers: [],
        products: [],
        expenses: [],
        summary: CalculationUtils.getDefaultStats(),
        financialStats: CalculationUtils.getDefaultStats(),
        enhancedStats: {
          salesWithProfit: [],
          financialStats: CalculationUtils.getDefaultStats()
        },
        error: handleApiError(error)
      };
      
      console.log('🔄 Returning fallback data structure');
      return fallbackData;
    }
  },

  createTransaction: async (transactionData) => {
    try {
      console.log('💰 Creating transaction...');
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.post('/transactions', transactionData);
      cache.clearAll();
      
      console.log('✅ Transaction created successfully');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      throw new Error(handleApiError(error));
    }
  },

  getCombinedReports: async (params = {}) => {
    try {
      console.log('📊 Generating combined reports...');
      
      const cacheKey = `combined_reports_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached combined reports');
        return cached;
      }
      
      const transactionsData = await unifiedAPI.getCombinedTransactions(params);
      
      const enhancedReports = {
        ...transactionsData,
        salesSummary: transactionsData.salesSummary || {
          financialStats: transactionsData.financialStats,
          topProducts: transactionsData.performance?.topProducts || [],
          topCashiers: transactionsData.performance?.topCashiers || []
        },
        comprehensiveReport: transactionsData.comprehensiveReport || {
          summary: transactionsData.financialStats,
          transactions: transactionsData.transactions,
          expenses: transactionsData.expenses,
          products: transactionsData.products
        }
      };
      
      cache.set(cacheKey, enhancedReports);
      console.log('✅ Combined reports generated');
      return enhancedReports;
    } catch (error) {
      console.error('❌ Error generating combined reports:', error);
      
      const cacheKey = `combined_reports_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('🔄 Using stale cached reports due to error');
        return cached;
      }
      
      return {
        salesSummary: {
          financialStats: CalculationUtils.getDefaultStats(),
          topProducts: [],
          topCashiers: []
        },
        comprehensiveReport: {
          summary: CalculationUtils.getDefaultStats(),
          transactions: [],
          expenses: [],
          products: []
        },
        error: handleApiError(error)
      };
    }
  },

  getTransactionMetrics: async (params = {}) => {
    try {
      console.log('📈 Fetching transaction metrics...');
      
      const cacheKey = `transaction_metrics_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached transaction metrics');
        return cached;
      }

      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.get('/transactions/metrics', { params });
      const metrics = response.data?.data || response.data;
      
      const cleanMetrics = {
        totalSales: metrics.totalSales || { amount: 0, count: 0, description: '0 transactions' },
        totalRevenue: metrics.totalRevenue || { amount: 0, description: 'From all sales' },
        expenses: metrics.expenses || { amount: 0, description: 'Total operational costs' },
        grossProfit: metrics.grossProfit || { amount: 0, description: 'Revenue - Cost of Goods' },
        netProfit: metrics.netProfit || { amount: 0, description: 'After all expenses' },
        costOfGoodsSold: metrics.costOfGoodsSold || { amount: 0, description: 'For all sales' },
        totalMpesaBank: metrics.totalMpesaBank || { amount: 0, description: 'Digital payments' },
        totalCash: metrics.totalCash || { amount: 0, description: 'Cash payments' }
      };
      
      cache.set(cacheKey, cleanMetrics);
      console.log('✅ Transaction metrics fetched successfully');
      return cleanMetrics;
    } catch (error) {
      console.error('❌ Error fetching transaction metrics:', error);
      
      return {
        totalSales: { amount: 0, count: 0, description: '0 transactions' },
        totalRevenue: { amount: 0, description: 'From all sales' },
        expenses: { amount: 0, description: 'Total operational costs' },
        grossProfit: { amount: 0, description: 'Revenue - Cost of Goods' },
        netProfit: { amount: 0, description: 'After all expenses' },
        costOfGoodsSold: { amount: 0, description: 'For all sales' },
        totalMpesaBank: { amount: 0, description: 'Digital payments' },
        totalCash: { amount: 0, description: 'Cash payments' },
        error: handleApiError(error)
      };
    }
  },

  getCashierDashboardMetrics: async (params = {}) => {
    try {
      console.log('👤 Fetching cashier-specific dashboard metrics...');
      
      const cacheKey = `cashier_metrics_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached cashier metrics');
        return cached;
      }

      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.get('/cashier/dashboard-metrics', { params });
      const metrics = response.data?.data || response.data;
      
      const cleanMetrics = {
        totalSales: metrics.totalSales || 0,
        totalTransactions: metrics.totalTransactions || 0,
        totalCash: metrics.totalCash || 0,
        totalMpesaBank: metrics.totalMpesaBank || 0,
        itemsSold: metrics.itemsSold || 0,
        averageTransaction: metrics.averageTransaction || 0,
        profitMargin: metrics.profitMargin || 0
      };
      
      cache.set(cacheKey, cleanMetrics);
      console.log('✅ Cashier dashboard metrics fetched successfully');
      return cleanMetrics;
    } catch (error) {
      console.error('❌ Error fetching cashier dashboard metrics:', error);
      
      return {
        totalSales: 0,
        totalTransactions: 0,
        totalCash: 0,
        totalMpesaBank: 0,
        itemsSold: 0,
        averageTransaction: 0,
        profitMargin: 0,
        error: handleApiError(error)
      };
    }
  }
};

// ==================== OPTIMIZED BASIC CRUD APIs ====================

const createBasicAPI = (endpoint) => ({
  getAll: async (params = {}) => {
    try {
      console.log(`📋 Fetching ${endpoint}...`);
      
      const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log(`✅ Using cached ${endpoint}`);
        return cached;
      }

      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await fastApi.get(`/${endpoint}`, { params });
      const data = response.data?.data || response.data;
      const items = Array.isArray(data) ? data : [];

      console.log(`✅ ${endpoint} fetched successfully:`, items.length, 'items');
      
      cache.set(cacheKey, items);
      return items;
    } catch (error) {
      console.error(`❌ Error fetching ${endpoint}:`, error);
      
      if (error.response?.status === 404) {
        console.error(`${endpoint} endpoint not found. Please check backend routes.`);
        return [];
      }
      
      const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      return cached || [];
    }
  },

  getById: async (id) => {
    try {
      console.log(`🔍 Fetching ${endpoint} by ID:`, id);
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await api.get(`/${endpoint}/${id}`);
      console.log(`✅ ${endpoint} fetched successfully`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`❌ Error fetching ${endpoint}:`, error);
      
      let errorMessage = handleApiError(error);
      if (error.response?.status === 404) {
        errorMessage = `${endpoint} not found with ID: ${id}`;
      }
      
      throw new Error(errorMessage);
    }
  },

  create: async (data) => {
    try {
      console.log(`🆕 Creating ${endpoint}:`, data);
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.post(`/${endpoint}`, data);
      cache.clearAll();
      console.log(`✅ ${endpoint} created successfully`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`❌ Error creating ${endpoint}:`, error);
      
      let errorMessage = handleApiError(error);
      if (error.response?.status === 404) {
        errorMessage = `${endpoint} creation endpoint not found. Please check backend routes.`;
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || `Invalid ${endpoint} data provided`;
      } else if (error.response?.status === 500) {
        errorMessage = `Server error while creating ${endpoint}. Please try again.`;
      }
      
      throw new Error(errorMessage);
    }
  },

  update: async (id, data) => {
    try {
      console.log(`✏️ Updating ${endpoint} ID:`, id, 'with data:', data);
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await api.put(`/${endpoint}/${id}`, data);
      cache.clearAll();
      console.log(`✅ ${endpoint} updated successfully`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`❌ Error updating ${endpoint}:`, error);
      
      let errorMessage = handleApiError(error);
      if (error.response?.status === 404) {
        errorMessage = `${endpoint} not found with ID: ${id}`;
      }
      
      throw new Error(errorMessage);
    }
  },

  delete: async (id) => {
    try {
      console.log(`🗑️ Deleting ${endpoint} ID:`, id);
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await api.delete(`/${endpoint}/${id}`);
      cache.clearAll();
      console.log(`✅ ${endpoint} deleted successfully`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`❌ Error deleting ${endpoint}:`, error);
      
      let errorMessage = handleApiError(error);
      if (error.response?.status === 404) {
        errorMessage = `${endpoint} not found with ID: ${id}`;
      } else if (error.response?.status === 409) {
        errorMessage = `Cannot delete ${endpoint} - it may be in use by other records`;
      }
      
      throw new Error(errorMessage);
    }
  }
});

// Enhanced Product API with barcode functionality
export const productAPI = {
  ...createBasicAPI('products'),
  
  searchByBarcode: async (barcode, shop) => {
    try {
      console.log(`🔍 Searching product by barcode: ${barcode}, shop: ${shop}`);
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await api.get('/products/search/barcode', { params: { barcode, shop } });
      console.log('✅ Product found by barcode');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error searching product by barcode:', error);
      throw new Error(handleApiError(error));
    }
  },

  generateBarcode: async (productId, data) => {
    try {
      console.log(`🎫 Generating barcode for product ID: ${productId}`);
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await api.post(`/products/${productId}/generate-barcode`, data);
      cache.clearAll();
      console.log('✅ Barcode generated successfully');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error generating barcode:', error);
      throw new Error(handleApiError(error));
    }
  },

  bulkGenerateBarcodes: async (data) => {
    try {
      console.log('🎫 Bulk generating barcodes');
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await api.post('/products/bulk-generate-barcodes', data);
      cache.clearAll();
      console.log('✅ Barcodes generated successfully');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error bulk generating barcodes:', error);
      throw new Error(handleApiError(error));
    }
  },

  markBarcodePrinted: async (productId) => {
    try {
      console.log(`🏷️ Marking barcode as printed for product ID: ${productId}`);
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await api.post(`/products/${productId}/mark-printed`);
      cache.clearAll();
      console.log('✅ Barcode marked as printed');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error marking barcode as printed:', error);
      throw new Error(handleApiError(error));
    }
  }
};

export const shopAPI = createBasicAPI('shops');
export const cashierAPI = createBasicAPI('cashiers');

// Enhanced expense API
export const expenseAPI = {
  ...createBasicAPI('expenses'),
  
  getStats: async (params = {}) => {
    try {
      console.log('📊 Fetching expense stats...');
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.get('/expenses/stats/overview', { params });
      console.log('✅ Expense stats fetched successfully');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching expense stats:', error);
      
      return {
        overview: { 
          totalExpenses: 0, 
          totalAmount: 0, 
          averageExpense: 0, 
          minExpense: 0, 
          maxExpense: 0,
          expensesCount: 0
        },
        byCategory: [],
        byPaymentMethod: [],
        byShop: [],
        recentExpenses: [],
        trends: {
          daily: [],
          weekly: [],
          monthly: []
        }
      };
    }
  },

  getByDateRange: async (startDate, endDate) => {
    try {
      console.log('📅 Fetching expenses by date range...');
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.get('/expenses', {
        params: { startDate, endDate }
      });
      const data = response.data?.data || response.data;
      console.log('✅ Date range expenses fetched successfully:', data?.length || 0, 'items');
      return data;
    } catch (error) {
      console.error('❌ Error fetching expenses by date range:', error);
      return [];
    }
  }
};

// ==================== OPTIMIZED REPORT API SERVICE ====================

export const reportAPI = {
  getDashboardData: async (filters = {}) => {
    try {
      console.log('📈 Fetching complete dashboard data...');
      
      const transactionsData = await unifiedAPI.getCombinedTransactions(filters);
      
      const dashboardData = {
        ...transactionsData,
        loadedAt: new Date().toISOString(),
        dataSources: {
          transactions: transactionsData.transactions?.length || 0,
          shops: transactionsData.shops?.length || 0,
          cashiers: transactionsData.cashiers?.length || 0,
          products: transactionsData.products?.length || 0,
          expenses: transactionsData.expenses?.length || 0
        }
      };
      
      console.log('✅ Enhanced dashboard data loaded successfully');
      return dashboardData;
    } catch (error) {
      console.error('❌ Error loading enhanced dashboard data:', error);
      
      try {
        const transactionsData = await unifiedAPI.getCombinedTransactions(filters);
        
        return {
          ...transactionsData,
          loadedAt: new Date().toISOString(),
          dataSources: {
            transactions: transactionsData.transactions?.length || 0,
            shops: transactionsData.shops?.length || 0,
            cashiers: transactionsData.cashiers?.length || 0,
            products: transactionsData.products?.length || 0,
            expenses: transactionsData.expenses?.length || 0
          },
          error: 'Partial data loaded due to server issues'
        };
      } catch (fallbackError) {
        throw new Error(handleApiError(error));
      }
    }
  },

  getCashierDashboard: async (filters = {}) => {
    try {
      console.log('👤 Fetching cashier dashboard data...');
      
      const [metrics, transactions] = await Promise.all([
        unifiedAPI.getCashierDashboardMetrics(filters),
        unifiedAPI.getCombinedTransactions(filters)
      ]);
      
      const dashboardData = {
        ...metrics,
        recentTransactions: transactions.transactions?.slice(0, 10) || [],
        loadedAt: new Date().toISOString()
      };
      
      console.log('✅ Cashier dashboard data loaded successfully');
      return dashboardData;
    } catch (error) {
      console.error('❌ Error loading cashier dashboard data:', error);
      
      return {
        totalSales: 0,
        totalTransactions: 0,
        totalCash: 0,
        totalMpesaBank: 0,
        recentTransactions: [],
        error: handleApiError(error)
      };
    }
  }
};

// ==================== CASHIER ANALYTICS API ====================

export const cashierAnalyticsAPI = {
  getCashierAnalytics: async (cashierId, params = {}) => {
    try {
      console.log('📊 Fetching cashier analytics...', { cashierId, params });
      
      const cacheKey = `cashier_analytics_${cashierId}_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached cashier analytics');
        return cached;
      }

      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.get(`/cashiers/${cashierId}/analytics`, { params });
      const analyticsData = response.data?.data || response.data;
      
      cache.set(cacheKey, analyticsData);
      console.log('✅ Cashier analytics fetched successfully');
      return analyticsData;
    } catch (error) {
      console.error('❌ Error fetching cashier analytics:', error);
      
      return {
        cashier: null,
        metrics: {
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          totalTransactions: 0,
          totalItemsSold: 0,
          profitMargin: 0,
          averageTransactionValue: 0
        },
        dailyPerformance: [],
        topProducts: [],
        period: {
          start: new Date().toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
          timeRange: '7d'
        },
        error: handleApiError(error)
      };
    }
  },

  getCashierPerformance: async (cashierId, params = {}) => {
    try {
      console.log('📈 Fetching cashier performance summary...', { cashierId, params });
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.get(`/cashiers/${cashierId}/performance`, { params });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching cashier performance:', error);
      throw new Error(handleApiError(error));
    }
  },

  getCashierTransactions: async (cashierId, params = {}) => {
    try {
      console.log('📋 Fetching cashier transactions...', { cashierId, params });
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.get(`/cashiers/${cashierId}/transactions`, { params });
      const data = response.data?.data || response.data;
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching cashier transactions:', error);
      throw new Error(handleApiError(error));
    }
  },

  getCashiersWithMetrics: async (params = {}) => {
    try {
      console.log('👥 Fetching cashiers with metrics...', { params });
      
      // Check token status before request
      if (authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.get('/cashiers-with-metrics', { params });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching cashiers with metrics:', error);
      throw new Error(handleApiError(error));
    }
  }
};

// ==================== MAIN API SERVICE ====================

const apiService = {
  unified: unifiedAPI,
  auth: authAPI,
  transactions: transactionAPI,
  products: productAPI,
  shops: shopAPI,
  cashiers: cashierAPI,
  expenses: expenseAPI,
  reports: reportAPI,
  cashierAnalytics: cashierAnalyticsAPI,
  
  handleApiError,
  cache,
  tokenManager,
  
  clearCache: () => cache.clearAll(),
  getCacheStats: () => ({
    size: Object.keys(cache.data).length,
    keys: Object.keys(cache.data)
  }),

  // Health check with token validation
  healthCheck: async () => {
    try {
      const response = await fastApi.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        success: false,
        status: 'unhealthy',
        error: handleApiError(error)
      };
    }
  },

  // Initialize API with token
  initialize: () => {
    const token = tokenManager.getToken();
    if (token) {
      authAPI.setAuthToken(token);
      console.log('🔑 API initialized with existing token');
    } else {
      console.log('🔑 API initialized without token');
    }
  }
};

// Initialize API on import
apiService.initialize();

export default apiService;
export { handleApiError };

export const getDefaultStats = () => ({
  totalRevenue: 0,
  totalSales: 0,
  totalExpenses: 0,
  netProfit: 0,
  costOfGoodsSold: 0,
  grossProfit: 0,
  profitMargin: 0,
  totalItemsSold: 0,
  totalCash: 0,
  totalMpesaBank: 0
});