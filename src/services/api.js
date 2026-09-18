// src/services/api.js - FULLY UPDATED WITH ADMIN VERIFICATION CODE LOGGING
import axios from 'axios';
import { CalculationUtils } from '../utils/calculationUtils';

// Enhanced Configuration with Environment Awareness
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5002/api',
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 1000,
  cacheTimeout: 30000,
  tokenRefreshThreshold: 300000,
  maxRetryDelay: 5000,
  developmentMode: process.env.NODE_ENV === 'development'
};

// Environment detection
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Enhanced Error handler with detailed logging (SILENT MODE)
const handleApiError = (error, context = {}, silent = false) => {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    message: error.message,
    code: error.code,
    config: {
      url: error.config?.url,
      method: error.config?.method,
      params: error.config?.params
    },
    context
  };

  // Development logging only - no notifications to user
  if (IS_DEVELOPMENT) {
    console.group('🔴 API Error Details');
    console.error('Error Object:', error);
    console.error('Error Details:', errorDetails);
    console.groupEnd();
  }

  // Return error message but don't show any notifications
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out.';
  }
  
  if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
    return 'Cannot connect to server.';
  }
  
  if (error.response?.status === 404) {
    return 'Resource not found.';
  }
  
  if (error.response?.status === 500) {
    return 'Server error.';
  }
  
  if (error.response?.status === 401) {
    return 'Session expired.';
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  return error.message || 'An error occurred.';
};

// ==================== FIXED CACHE SYSTEM ====================

const createCache = (maxSize = 100) => {
  const cacheData = new Map();
  const cacheTimestamps = new Map();
  const cacheOrder = [];
  
  let hits = 0;
  let misses = 0;
  
  const cache = {
    get: (key) => {
      try {
        const item = cacheData.get(key);
        const timestamp = cacheTimestamps.get(key);
        
        if (item && timestamp && Date.now() - timestamp < API_CONFIG.cacheTimeout) {
          const index = cacheOrder.indexOf(key);
          if (index > -1) {
            cacheOrder.splice(index, 1);
            cacheOrder.push(key);
          }
          
          hits++;
          
          if (IS_DEVELOPMENT) {
            console.log(`🔄 Cache hit for: ${key}`);
          }
          return item;
        }
        
        if (item && timestamp && Date.now() - timestamp >= API_CONFIG.cacheTimeout) {
          cache.clear(key);
        }
        
        misses++;
        return null;
      } catch (error) {
        console.warn('Cache get error:', error);
        return null;
      }
    },
    
    set: (key, data) => {
      try {
        if (cacheOrder.length >= maxSize) {
          const oldestKey = cacheOrder.shift();
          if (oldestKey) {
            cacheData.delete(oldestKey);
            cacheTimestamps.delete(oldestKey);
          }
        }
        
        cacheData.set(key, data);
        cacheTimestamps.set(key, Date.now());
        
        if (!cacheOrder.includes(key)) {
          cacheOrder.push(key);
        }
        
        if (IS_DEVELOPMENT) {
          console.log(`💾 Cache set for: ${key} (size: ${cacheOrder.length}/${maxSize})`);
        }
      } catch (error) {
        console.warn('Cache set error:', error);
      }
    },
    
    clear: (key) => {
      try {
        if (cacheData.has(key)) {
          cacheData.delete(key);
        }
        if (cacheTimestamps.has(key)) {
          cacheTimestamps.delete(key);
        }
        const index = cacheOrder.indexOf(key);
        if (index > -1) {
          cacheOrder.splice(index, 1);
        }
      } catch (error) {
        console.warn('Cache clear error:', error);
      }
    },
    
    clearAll: () => {
      try {
        cacheData.clear();
        cacheTimestamps.clear();
        cacheOrder.length = 0;
        hits = 0;
        misses = 0;
        if (IS_DEVELOPMENT) {
          console.log('🧹 Cache cleared completely');
        }
      } catch (error) {
        console.warn('Cache clearAll error:', error);
      }
    },
    
    cleanup: () => {
      try {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, timestamp] of cacheTimestamps.entries()) {
          if (now - timestamp > API_CONFIG.cacheTimeout) {
            expiredKeys.push(key);
          }
        }
        
        expiredKeys.forEach(key => cache.clear(key));
        
        if (IS_DEVELOPMENT && expiredKeys.length > 0) {
          console.log(`🧹 Cache cleanup removed ${expiredKeys.length} expired items`);
        }
      } catch (error) {
        console.warn('Cache cleanup error:', error);
      }
    },
    
    getStats: () => ({
      size: cacheOrder.length,
      maxSize,
      hits,
      misses,
      hitRate: (hits + misses) > 0 ? (hits / (hits + misses)) * 100 : 0
    }),
    
    has: (key) => cacheData.has(key)
  };

  let cleanupInterval = null;
  
  if (typeof window !== 'undefined') {
    cleanupInterval = setInterval(() => cache.cleanup(), 300000);
  }
  
  cache.destroy = () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  };
  
  return cache;
};

const cache = createCache(100);

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (cache && cache.destroy) {
      cache.destroy();
    }
  });
}

// ==================== PAYMENT UTILITIES ====================

const PaymentUtils = {
  calculatePaymentSplit: (transaction) => {
    if (!transaction) return { cash: 0, mpesa_bank: 0, total: 0 };
    
    const paymentMethod = transaction.paymentMethod || 'cash';
    const totalAmount = CalculationUtils.safeNumber(transaction.totalAmount);
    
    let cash = 0;
    let mpesa_bank = 0;
    
    if (paymentMethod === 'cash') {
      cash = totalAmount;
    } else if (paymentMethod === 'mpesa_bank') {
      mpesa_bank = totalAmount;
    } else if (paymentMethod === 'cash_mpesa_bank' && transaction.paymentSplit) {
      cash = CalculationUtils.safeNumber(transaction.paymentSplit.cash);
      mpesa_bank = CalculationUtils.safeNumber(transaction.paymentSplit.mpesa_bank);
    } else if (paymentMethod === 'cash_mpesa_bank') {
      cash = CalculationUtils.safeNumber(transaction.cashAmount || 0);
      mpesa_bank = CalculationUtils.safeNumber(transaction.mpesaBankAmount || transaction.bankMpesaAmount || 0);
    }
    
    return {
      cash,
      mpesa_bank,
      total: cash + mpesa_bank
    };
  },

  normalizePaymentMethod: (paymentMethod) => {
    if (!paymentMethod) return 'cash';
    
    const method = paymentMethod.toLowerCase().trim();
    if (method.includes('cash') && (method.includes('mpesa') || method.includes('bank'))) {
      return 'cash_mpesa_bank';
    }
    if (method.includes('mpesa') || method.includes('bank') || method.includes('digital')) {
      return 'mpesa_bank';
    }
    return method.includes('cash') ? 'cash' : 'cash';
  },

  getPaymentMethodLabel: (paymentMethod) => {
    switch(paymentMethod) {
      case 'cash':
        return 'Cash';
      case 'mpesa_bank':
        return 'M-Pesa/Bank';
      case 'cash_mpesa_bank':
        return 'Cash + M-Pesa/Bank';
      default:
        return 'Cash';
    }
  },

  calculatePaymentComposition: (transactions) => {
    if (!Array.isArray(transactions)) {
      return {
        cash: 0,
        mpesa_bank: 0,
        total: 0,
        transactions: 0,
        byMethod: {},
        cashPercentage: 0,
        mpesaBankPercentage: 0
      };
    }
    
    const composition = {
      cash: 0,
      mpesa_bank: 0,
      total: 0,
      transactions: transactions.length,
      byMethod: {
        cash: { amount: 0, count: 0 },
        mpesa_bank: { amount: 0, count: 0 },
        cash_mpesa_bank: { amount: 0, count: 0 }
      }
    };
    
    transactions.forEach(transaction => {
      if (!transaction) return;
      
      const split = PaymentUtils.calculatePaymentSplit(transaction);
      const method = PaymentUtils.normalizePaymentMethod(transaction.paymentMethod);
      
      composition.cash += split.cash;
      composition.mpesa_bank += split.mpesa_bank;
      composition.total += split.total;
      
      if (!composition.byMethod[method]) {
        composition.byMethod[method] = { amount: 0, count: 0 };
      }
      composition.byMethod[method].amount += split.total;
      composition.byMethod[method].count += 1;
    });
    
    composition.cashPercentage = composition.total > 0 ? 
      (composition.cash / composition.total) * 100 : 0;
    composition.mpesaBankPercentage = composition.total > 0 ? 
      (composition.mpesa_bank / composition.total) * 100 : 0;
    
    return composition;
  }
};

// ==================== TOKEN MANAGEMENT ====================

class TokenManager {
  constructor() {
    this.isRefreshing = false;
    this.refreshSubscribers = [];
    this.lastRefreshAttempt = 0;
    this.refreshCooldown = 30000;
  }

  getToken() {
    try {
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('adminToken') || 
                   localStorage.getItem('cashierToken') || 
                   localStorage.getItem('userToken');
      
      if (token && token.startsWith('Bearer ')) {
        return token.replace('Bearer ', '');
      }
      
      return token;
    } catch (error) {
      console.warn('Error getting token:', error);
      return null;
    }
  }

  getRefreshToken() {
    try {
      return localStorage.getItem('refreshToken');
    } catch (error) {
      console.warn('Error getting refresh token:', error);
      return null;
    }
  }

  storeTokens(token, refreshToken, userData) {
    try {
      if (!userData || !userData.role) {
        console.error('Invalid user data for token storage:', userData);
        throw new Error('Invalid user data provided');
      }

      const role = userData.role;
      const tokenKey = `${role}Token`;
      const dataKey = `${role}Data`;
      
      this.clearAuthData();
      
      if (token) {
        localStorage.setItem(tokenKey, token);
        localStorage.setItem('token', token);
      }
      
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      localStorage.setItem(dataKey, JSON.stringify(userData));
      localStorage.setItem('userData', JSON.stringify(userData));
      
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 8);
      localStorage.setItem('tokenExpiry', tokenExpiry.toISOString());
      localStorage.setItem('lastLogin', new Date().toISOString());
      
      if (IS_DEVELOPMENT) {
        console.log('🔐 Tokens stored for role:', role, {
          tokenLength: token?.length || 0,
          user: { id: userData._id, email: userData.email, role }
        });
      }
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  }

  clearAuthData() {
    try {
      const itemsToRemove = [
        'userData', 'adminData', 'cashierData',
        'token', 'adminToken', 'cashierToken', 'userToken',
        'refreshToken', 'tokenExpiry', 'lastLogin'
      ];
      
      itemsToRemove.forEach(item => {
        try {
          localStorage.removeItem(item);
        } catch (e) {
          console.warn(`Error removing ${item}:`, e);
        }
      });
      
      if (IS_DEVELOPMENT) {
        console.log('🧹 All authentication data cleared');
      }
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  isTokenExpired() {
    try {
      const expiry = localStorage.getItem('tokenExpiry');
      if (!expiry) return true;
      
      const expiryTime = new Date(expiry).getTime();
      const currentTime = Date.now();
      
      return currentTime >= expiryTime;
    } catch (error) {
      console.warn('Error checking token expiry:', error);
      return true;
    }
  }

  shouldRefreshToken() {
    try {
      if (this.isRefreshing) return false;
      
      const now = Date.now();
      if (now - this.lastRefreshAttempt < this.refreshCooldown) {
        return false;
      }
      
      const threshold = API_CONFIG.tokenRefreshThreshold;
      const expiry = localStorage.getItem('tokenExpiry');
      if (!expiry || !this.getRefreshToken()) return false;
      
      const expiryTime = new Date(expiry).getTime();
      const currentTime = Date.now();
      
      return currentTime >= (expiryTime - threshold) || this.isTokenExpired();
    } catch (error) {
      console.warn('Error checking refresh token:', error);
      return false;
    }
  }

  async refreshToken() {
    try {
      const now = Date.now();
      if (now - this.lastRefreshAttempt < this.refreshCooldown) {
        console.log('⏸️ Token refresh in cooldown period');
        return this.getToken();
      }
      
      if (this.isRefreshing) {
        return new Promise((resolve) => {
          this.refreshSubscribers.push(resolve);
        });
      }

      this.isRefreshing = true;
      this.lastRefreshAttempt = now;
      
      console.log('🔄 Refreshing access token...');
      const refreshToken = this.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${API_CONFIG.baseURL}/auth/refresh-token`, {
        refreshToken
      }, {
        timeout: 30000
      });

      if (response.data.success) {
        const { token, refreshToken: newRefreshToken } = response.data;
        const userData = this.getCurrentUser();
        
        if (!userData) {
          throw new Error('No user data found during token refresh');
        }
        
        this.storeTokens(token, newRefreshToken, userData);
        
        this.refreshSubscribers.forEach(callback => callback(token));
        this.refreshSubscribers = [];
        
        console.log('✅ Token refreshed successfully');
        return token;
      } else {
        throw new Error(response.data.message || 'Failed to refresh token');
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      
      setTimeout(() => {
        this.clearAuthData();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }, 100);
      
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  async validateToken() {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await axios.get(`${API_CONFIG.baseURL}/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });

      return response.data.valid === true || response.data.success === true;
    } catch (error) {
      console.error('❌ Token validation failed:', error);
      return false;
    }
  }

  getCurrentUser() {
    try {
      const userData = localStorage.getItem('userData');
      if (!userData) return null;
      
      return JSON.parse(userData);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  isLoggedIn() {
    try {
      const token = this.getToken();
      const user = this.getCurrentUser();
      const hasToken = !!token;
      const hasUser = !!user;
      
      if (IS_DEVELOPMENT && hasToken && !hasUser) {
        console.warn('⚠️ Token exists but no user data found');
      }
      
      return hasToken && hasUser;
    } catch (error) {
      console.warn('Error checking login status:', error);
      return false;
    }
  }

  isRole(role) {
    try {
      const user = this.getCurrentUser();
      return user?.role === role;
    } catch (error) {
      return false;
    }
  }
}

const tokenManager = new TokenManager();

// ==================== ENHANCED AXIOS INSTANCE ====================

const createApiInstance = (baseURL = API_CONFIG.baseURL, customTimeout = null) => {
  const instance = axios.create({
    baseURL,
    timeout: customTimeout || API_CONFIG.timeout,
    headers: { 
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    // ✅ FIX: Only 2xx are treated as success. Everything else throws.
    validateStatus: (status) => status >= 200 && status < 300
  });

  instance.interceptors.request.use(
    async (config) => {
      try {
        if (config.method === 'get' && !config.params?.nocache) {
          config.params = {
            ...config.params,
            _: Date.now()
          };
        }
        
        if (tokenManager.shouldRefreshToken && tokenManager.shouldRefreshToken() && 
            !config.url.includes('/auth/refresh-token') &&
            !config.headers['X-Skip-Token-Refresh']) {
          try {
            const newToken = await tokenManager.refreshToken();
            if (newToken) {
              config.headers.Authorization = `Bearer ${newToken}`;
            }
          } catch (error) {
            console.warn('Token refresh during request failed:', error.message);
          }
        }
        
        const token = tokenManager.getToken();
        if (token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        if (IS_DEVELOPMENT) {
          console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
            hasAuth: !!config.headers.Authorization,
            params: config.params
          });
        }
      } catch (error) {
        console.warn('Request interceptor error:', error);
      }
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response) => {
      if (IS_DEVELOPMENT) {
        console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
      }
      return response;
    },
    async (error) => {
      const originalRequest = error.config;
      
      if ((error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR') && 
          !originalRequest?._retryCount) {
        
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
        
        if (originalRequest._retryCount <= API_CONFIG.retryAttempts) {
          const delay = Math.min(
            API_CONFIG.retryDelay * Math.pow(2, originalRequest._retryCount - 1),
            API_CONFIG.maxRetryDelay
          );
          
          console.log(`🔄 Retry ${originalRequest._retryCount}/${API_CONFIG.retryAttempts} for ${originalRequest.url} in ${delay}ms`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return instance(originalRequest);
        }
      }
      
      if (error.response?.status === 401 && !originalRequest?._retry) {
        const refreshToken = tokenManager.getRefreshToken();
        
        if (refreshToken) {
          originalRequest._retry = true;
          
          try {
            const newToken = await tokenManager.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return instance(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed, logging out:', refreshError);
            tokenManager.clearAuthData();
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }
        } else {
          tokenManager.clearAuthData();
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
      
      if (error.response?.status === 401 && 
          error.response?.data?.message?.toLowerCase().includes('blacklist')) {
        console.log('Token is blacklisted, logging out');
        tokenManager.clearAuthData();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      
      console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response?.status,
        message: error.response?.data?.message || error.response?.data?.error || error.message,
        code: error.code
      });
      
      return Promise.reject(error);
    }
  );

  return instance;
};

const api = createApiInstance();
const quickApi = createApiInstance(API_CONFIG.baseURL, 30000);
const fastApi = createApiInstance(API_CONFIG.baseURL, 5000);

// ==================== SILENT API METHODS ====================

export const silentAPI = {
  getCombinedTransactions: async (params = {}) => {
    try {
      console.log('🔇 Silent fetch: combined transactions');
      const response = await quickApi.get('/transactions/combined', { params });
      return response.data?.data || response.data;
    } catch (error) {
      console.log('Silent API call failed (suppressed):', error.message);
      return { 
        transactions: [], 
        salesWithProfit: [],
        filteredTransactions: [],
        financialStats: getDefaultStats(),
        summary: getDefaultStats()
      };
    }
  },

  getShops: async (params = {}) => {
    try {
      console.log('🔇 Silent fetch: shops');
      const response = await fastApi.get('/shops', { params });
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.log('Silent shops fetch failed (suppressed):', error.message);
      return [];
    }
  },

  getTransactions: async (params = {}) => {
    try {
      console.log('🔇 Silent fetch: transactions');
      const response = await api.get('/transactions', { params });
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : data;
    } catch (error) {
      console.log('Silent transactions fetch failed (suppressed):', error.message);
      return [];
    }
  },

  getCashiers: async (params = {}) => {
    try {
      console.log('🔇 Silent fetch: cashiers');
      const response = await fastApi.get('/cashiers', { params });
      const cashiersData = response.data?.data || response.data;
      return Array.isArray(cashiersData) ? cashiersData : [];
    } catch (error) {
      console.log('Silent cashiers fetch failed (suppressed):', error.message);
      return [];
    }
  },

  getProducts: async (params = {}) => {
    try {
      console.log('🔇 Silent fetch: products');
      const response = await fastApi.get('/products', { params });
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.log('Silent products fetch failed (suppressed):', error.message);
      return [];
    }
  },

  getExpenses: async (params = {}) => {
    try {
      console.log('🔇 Silent fetch: expenses');
      const response = await fastApi.get('/expenses', { params });
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.log('Silent expenses fetch failed (suppressed):', error.message);
      return [];
    }
  },

  getPaymentComposition: async (params = {}) => {
    try {
      console.log('🔇 Silent fetch: payment composition');
      const response = await quickApi.get('/analytics/payment-composition', { params });
      const compositionData = response.data?.data || response.data;
      
      return {
        cash: CalculationUtils.safeNumber(compositionData.cash || 0),
        mpesa_bank: CalculationUtils.safeNumber(compositionData.mpesa_bank || 0),
        total: CalculationUtils.safeNumber(compositionData.total || 0),
        transactions: CalculationUtils.safeNumber(compositionData.transactions || 0),
        cashPercentage: CalculationUtils.safeNumber(compositionData.cashPercentage || 0),
        mpesaBankPercentage: CalculationUtils.safeNumber(compositionData.mpesaBankPercentage || 0),
        byDateArray: Array.isArray(compositionData.byDateArray) ? compositionData.byDateArray : []
      };
    } catch (error) {
      console.log('Silent payment composition fetch failed (suppressed):', error.message);
      return {
        cash: 0,
        mpesa_bank: 0,
        total: 0,
        transactions: 0,
        cashPercentage: 0,
        mpesaBankPercentage: 0,
        byDateArray: []
      };
    }
  },

  getAllDashboardData: async (params = {}) => {
    try {
      console.log('🔇 Silent fetch: all dashboard data');
      const [transactions, shops, cashiers, products, expenses] = await Promise.allSettled([
        silentAPI.getCombinedTransactions(params),
        silentAPI.getShops(params),
        silentAPI.getCashiers(params),
        silentAPI.getProducts(params),
        silentAPI.getExpenses(params)
      ]);

      return {
        transactions: transactions.status === 'fulfilled' ? transactions.value : [],
        shops: shops.status === 'fulfilled' ? shops.value : [],
        cashiers: cashiers.status === 'fulfilled' ? cashiers.value : [],
        products: products.status === 'fulfilled' ? products.value : [],
        expenses: expenses.status === 'fulfilled' ? expenses.value : [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.log('Silent dashboard data fetch failed (suppressed):', error.message);
      return {
        transactions: [],
        shops: [],
        cashiers: [],
        products: [],
        expenses: [],
        timestamp: new Date().toISOString()
      };
    }
  }
};

// ==================== AUTH API SERVICE ====================

export const authAPI = {
  tokenManager: tokenManager,
  
  setAuthToken: (token) => {
    try {
      const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      api.defaults.headers.common['Authorization'] = bearerToken;
      quickApi.defaults.headers.common['Authorization'] = bearerToken;
      fastApi.defaults.headers.common['Authorization'] = bearerToken;
    } catch (error) {
      console.warn('Error setting auth token:', error);
    }
  },

  clearAuthToken: () => {
    try {
      delete api.defaults.headers.common['Authorization'];
      delete quickApi.defaults.headers.common['Authorization'];
      delete fastApi.defaults.headers.common['Authorization'];
    } catch (error) {
      console.warn('Error clearing auth token:', error);
    }
  },

  requestSecureCode: async (emailData) => {
    try {
      console.log('📧 Requesting secure code for:', emailData.email);
      console.log('📤 Request payload:', emailData);
      
      const response = await fastApi.post('/auth/request-code', emailData);
      
      console.log('📥 Secure code response:', response.data);
      
      if (IS_DEVELOPMENT || process.env.NODE_ENV === 'development') {
        if (response.data.code) {
          console.log('🔐 ADMIN VERIFICATION CODE:', response.data.code);
          console.log('📋 Use this code to complete verification');
        } else if (response.data.data && response.data.data.code) {
          console.log('🔐 ADMIN VERIFICATION CODE:', response.data.data.code);
          console.log('📋 Use this code to complete verification');
        } else if (response.data.message && response.data.message.includes('code')) {
          const codeMatch = response.data.message.match(/\b\d{6}\b/);
          if (codeMatch) {
            console.log('🔐 ADMIN VERIFICATION CODE:', codeMatch[0]);
            console.log('📋 Use this code to complete verification');
          }
        } else {
          console.log('⚠️ Could not extract verification code from response:', response.data);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Secure code request error:', error);
      
      if (error.response && error.response.data) {
        console.log('⚠️ Error response data:', error.response.data);
        
        if (IS_DEVELOPMENT) {
          if (error.response.data.code) {
            console.log('🔐 ADMIN VERIFICATION CODE (from error):', error.response.data.code);
          } else if (error.response.data.data && error.response.data.data.code) {
            console.log('🔐 ADMIN VERIFICATION CODE (from error):', error.response.data.data.code);
          }
        }
      }
      
      throw new Error(handleApiError(error, { endpoint: 'request-code' }, true));
    }
  },

  verifySecureCode: async (codeData) => {
    try {
      console.log('🔐 Verifying secure code for:', codeData.email);
      console.log('📤 Verification payload:', { ...codeData, code: '***' });
      
      const response = await fastApi.post('/auth/verify-code', codeData);
      const data = response.data;
      
      console.log('📥 Verification response:', { 
        success: data.success,
        hasUser: !!data.user,
        hasToken: !!(data.token || data.access_token)
      });
      
      const user = data.user || data.data?.user || data.data || {};
      const token = data.token || data.access_token;
      const refreshToken = data.refreshToken;

      if (token && user) {
        tokenManager.storeTokens(token, refreshToken, user);
        authAPI.setAuthToken(token);
      }
      
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      
      console.log(`✅ ${user.role} login successful`);
      return data;
    } catch (error) {
      console.error('❌ Secure code verification error:', error);
      throw new Error(handleApiError(error, { endpoint: 'verify-code' }, true));
    }
  },

  getTestVerificationCode: (email) => {
    if (IS_DEVELOPMENT) {
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('🧪 TEST ADMIN VERIFICATION CODE for', email, ':', testCode);
      console.log('📋 Use this code for testing (development only)');
      return testCode;
    }
    return null;
  },

  adminLogin: async (credentials) => {
    try {
      console.log('🔐 Attempting admin login...');
      
      tokenManager.clearAuthData();
      
      const response = await fastApi.post('/auth/admin/login', {
        email: credentials.email,
        password: credentials.password,
        role: 'admin'
      });
      
      const data = response.data;
      
      if (data.success || data.token) {
        const user = data.user || data.data?.user || data.data || {};
        const token = data.token || data.access_token;
        const refreshToken = data.refreshToken;
        
        if (!token) {
          throw new Error('No authentication token received');
        }
        
        if (!user.role) {
          user.role = 'admin';
        }
        
        tokenManager.storeTokens(token, refreshToken, user);
        authAPI.setAuthToken(token);
        
        if (cache && cache.clearAll) {
          cache.clearAll();
        }
        
        console.log('✅ Admin login successful:', {
          user: { id: user._id, email: user.email, role: user.role }
        });
        
        return {
          success: true,
          user,
          token,
          refreshToken,
          message: data.message || 'Login successful'
        };
      } else {
        throw new Error(data.message || 'Invalid response structure');
      }
    } catch (error) {
      console.error('❌ Admin login error:', error);
      tokenManager.clearAuthData();
      
      let errorMessage = handleApiError(error, { endpoint: 'admin-login' }, true);
      
      throw new Error(errorMessage);
    }
  },

  cashierLogin: async (credentials) => {
    try {
      console.log('🔐 Attempting cashier login...');
      
      tokenManager.clearAuthData();
      
      const loginEndpoints = [
        '/auth/cashier/login',
        '/cashier/login',
        '/auth/login'
      ];
      
      let response;
      let usedEndpoint = '';
      
      for (const endpoint of loginEndpoints) {
        try {
          console.log(`🔄 Trying endpoint: ${endpoint}`);
          response = await fastApi.post(endpoint, {
            email: credentials.email,
            password: credentials.password,
            role: 'cashier'
          });
          usedEndpoint = endpoint;
          break;
        } catch (endpointError) {
          console.log(`❌ Endpoint ${endpoint} failed:`, endpointError.response?.status);
          continue;
        }
      }
      
      if (!response) {
        throw new Error('All login endpoints failed');
      }
      
      const data = response.data;
      
      if (data.success || data.token) {
        const user = data.user || data.data?.user || data.data || {};
        const token = data.token || data.access_token;
        const refreshToken = data.refreshToken;
        
        if (!token) {
          throw new Error('No authentication token received');
        }
        
        if (!user.role) {
          user.role = 'cashier';
        }
        
        tokenManager.storeTokens(token, refreshToken, user);
        authAPI.setAuthToken(token);
        
        if (cache && cache.clearAll) {
          cache.clearAll();
        }
        
        console.log('✅ Cashier login successful:', {
          user: { id: user._id, email: user.email, role: user.role },
          endpoint: usedEndpoint
        });
        
        return {
          success: true,
          user,
          token,
          refreshToken,
          message: data.message || 'Login successful'
        };
      } else {
        throw new Error(data.message || 'Invalid response structure');
      }
    } catch (error) {
      console.error('❌ Cashier login error:', error);
      tokenManager.clearAuthData();
      
      let errorMessage = handleApiError(error, { endpoint: 'cashier-login' }, true);
      
      if (error.message.includes('All login endpoints failed')) {
        errorMessage = 'Authentication service unavailable.';
      }
      
      throw new Error(errorMessage);
    }
  },

  refreshToken: async () => {
    try {
      return await tokenManager.refreshToken();
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      throw new Error(handleApiError(error, { endpoint: 'refresh-token' }, true));
    }
  },

  validateToken: async () => {
    try {
      return await tokenManager.validateToken();
    } catch (error) {
      console.error('❌ Token validation error:', error);
      return false;
    }
  },

  logout: async () => {
    try {
      const token = tokenManager.getToken();
      
      if (token) {
        try {
          await api.post('/auth/logout', {}, {
            headers: { 'X-Skip-Token-Refresh': true }
          });
          console.log('✅ Token invalidated on server');
        } catch (error) {
          console.warn('⚠️ Server logout failed, clearing local data:', error.message);
        }
      }
      
      tokenManager.clearAuthData();
      authAPI.clearAuthToken();
      
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      
      console.log('✅ Logout completed');
    } catch (error) {
      console.error('❌ Logout error:', error);
      tokenManager.clearAuthData();
      authAPI.clearAuthToken();
    }
  },

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

  shouldRefreshToken: () => {
    return tokenManager.shouldRefreshToken();
  }
};

// ==================== CASHIER API ====================

export const cashierAPI = {
  getAll: async (params = {}) => {
    try {
      console.log('📋 Fetching cashiers...');
      
      const cacheKey = `cashiers_all_${JSON.stringify(params)}`;
      
      let cached = null;
      try {
        cached = cache?.get(cacheKey);
      } catch (cacheError) {
        console.warn('Cache error:', cacheError);
      }
      
      if (cached) {
        console.log('✅ Using cached cashiers');
        return cached;
      }

      const response = await fastApi.get('/cashiers', { params });
      const cashiersData = response.data?.data || response.data;
      const cashiers = Array.isArray(cashiersData) ? cashiersData : [];

      console.log('✅ Cashiers fetched:', cashiers.length);
      
      try {
        cache?.set(cacheKey, cashiers);
      } catch (cacheError) {
        console.warn('Cache set error:', cacheError);
      }
      
      return cashiers;
    } catch (error) {
      console.error('❌ Error fetching cashiers:', error);
      
      try {
        const cacheKey = `cashiers_all_${JSON.stringify(params)}`;
        const cached = cache?.get(cacheKey);
        if (cached) {
          console.log('🔄 Using stale cached cashiers after error');
          return cached;
        }
      } catch (cacheError) {
        console.warn('Cache error on fallback:', cacheError);
      }
      
      return [];
    }
  },

  getById: async (id) => {
    try {
      console.log('🔍 Fetching cashier:', id);
      
      const response = await api.get(`/cashiers/${id}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching cashier:', error);
      throw new Error(handleApiError(error, { cashierId: id }, true));
    }
  },

  create: async (data) => {
    try {
      console.log('🆕 Creating cashier:', data.email);
      
      const response = await quickApi.post('/cashiers', data);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      console.log('✅ Cashier created');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error creating cashier:', error);
      throw new Error(handleApiError(error, {}, true));
    }
  },

  update: async (id, data) => {
    try {
      console.log('✏️ Updating cashier:', id);
      
      const response = await api.put(`/cashiers/${id}`, data);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      console.log('✅ Cashier updated');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error updating cashier:', error);
      throw new Error(handleApiError(error, { cashierId: id }, true));
    }
  },

  delete: async (id) => {
    try {
      console.log('🗑️ Deleting cashier:', id);
      
      const response = await api.delete(`/cashiers/${id}`);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      console.log('✅ Cashier deleted');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error deleting cashier:', error);
      throw new Error(handleApiError(error, { cashierId: id }, true));
    }
  },

  getAnalytics: async (cashierId, params = {}) => {
    try {
      console.log('📊 Fetching cashier analytics:', cashierId);
      
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.shopId) queryParams.append('shopId', params.shopId);
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);
      
      const url = `/cashiers/${cashierId}/analytics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await quickApi.get(url);
      const analyticsData = response.data?.data || response.data;
      
      console.log('✅ Cashier analytics fetched');
      return {
        success: true,
        data: analyticsData,
        message: 'Analytics fetched successfully'
      };
    } catch (error) {
      console.error('❌ Error fetching cashier analytics:', error);
      
      return {
        success: false,
        data: null,
        message: handleApiError(error, { cashierId }, true),
        error: handleApiError(error, {}, true)
      };
    }
  },

  searchCashiers: async (searchTerm, filters = {}) => {
    try {
      console.log('🔍 Searching cashiers:', searchTerm);
      
      const params = { search: searchTerm, ...filters };
      const cashiers = await cashierAPI.getAll(params);
      return cashiers;
    } catch (error) {
      console.error('❌ Error searching cashiers:', error);
      return [];
    }
  },

  getCashierStats: async (params = {}) => {
    try {
      console.log('📊 Getting cashier statistics...');
      
      const cashiers = await cashierAPI.getAll(params);
      
      return {
        totalCashiers: cashiers.length,
        activeCashiers: cashiers.filter(c => c.status === 'active').length,
        inactiveCashiers: cashiers.filter(c => c.status === 'inactive').length,
        totalShops: [...new Set(cashiers.map(c => c.shopId).filter(Boolean))].length,
        recentLogins: cashiers.filter(c => c.lastLogin && 
          new Date(c.lastLogin) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
      };
    } catch (error) {
      console.error('❌ Error getting cashier stats:', error);
      
      return {
        totalCashiers: 0,
        activeCashiers: 0,
        inactiveCashiers: 0,
        totalShops: 0,
        recentLogins: 0
      };
    }
  }
};

// ==================== CASHIER ANALYTICS API ====================

export const cashierAnalyticsAPI = {
  getCashierAnalytics: async (cashierId, params = {}) => {
    try {
      console.log('📊 Getting cashier analytics:', cashierId);
      
      const response = await cashierAPI.getAnalytics(cashierId, params);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.message || 'Failed to fetch analytics');
    } catch (error) {
      console.error('❌ Error in cashierAnalyticsAPI:', error);
      
      return {
        cashier: null,
        metrics: {
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          totalTransactions: 0,
          totalItemsSold: 0,
          profitMargin: 0,
          performanceScore: 0,
          paymentMethods: { cash: 0, mpesa_bank: 0 },
          digitalPaymentRatio: 0,
          cashPaymentRatio: 0,
          averageTransactionValue: 0
        },
        dailyPerformance: [],
        topProducts: [],
        recentTransactions: [],
        period: {
          start: params.startDate || new Date().toISOString().split('T')[0],
          end: params.endDate || new Date().toISOString().split('T')[0],
          timeRange: params.timeRange || '30d'
        }
      };
    }
  },

  getPaymentComposition: async (params = {}) => {
    try {
      console.log('💰 Fetching payment composition...');
      
      const cacheKey = `payment_composition_${JSON.stringify(params)}`;
      
      let cached = null;
      try {
        cached = cache?.get(cacheKey);
      } catch (cacheError) {
        console.warn('Cache error:', cacheError);
      }
      
      if (cached) {
        console.log('✅ Using cached payment composition');
        return cached;
      }

      const response = await quickApi.get('/analytics/payment-composition', { params });
      const compositionData = response.data?.data || response.data;
      
      const enhancedComposition = {
        cash: CalculationUtils.safeNumber(compositionData.cash || compositionData.totals?.cash || 0),
        mpesa_bank: CalculationUtils.safeNumber(compositionData.mpesa_bank || compositionData.bankMpesa || compositionData.totals?.mpesa_bank || 0),
        total: CalculationUtils.safeNumber(compositionData.total || compositionData.totals?.total || 0),
        transactions: CalculationUtils.safeNumber(compositionData.transactions || compositionData.totals?.transactions || 0),
        cashPercentage: CalculationUtils.safeNumber(compositionData.cashPercentage || compositionData.percentages?.cash || 0),
        mpesaBankPercentage: CalculationUtils.safeNumber(compositionData.mpesaBankPercentage || compositionData.percentages?.mpesa_bank || 0),
        byDateArray: Array.isArray(compositionData.byDateArray) ? compositionData.byDateArray : 
                    Array.isArray(compositionData.byDate) ? compositionData.byDate : [],
        byCashierArray: Array.isArray(compositionData.byCashierArray) ? compositionData.byCashierArray : 
                       Array.isArray(compositionData.byCashier) ? compositionData.byCashier : [],
        byShopArray: Array.isArray(compositionData.byShopArray) ? compositionData.byShopArray : 
                    Array.isArray(compositionData.byShop) ? compositionData.byShop : [],
        byDate: compositionData.byDate || {},
        byCashier: compositionData.byCashier || {},
        byShop: compositionData.byShop || {}
      };
      
      if (!enhancedComposition.cashPercentage && enhancedComposition.total > 0) {
        enhancedComposition.cashPercentage = (enhancedComposition.cash / enhancedComposition.total) * 100;
      }
      if (!enhancedComposition.mpesaBankPercentage && enhancedComposition.total > 0) {
        enhancedComposition.mpesaBankPercentage = (enhancedComposition.mpesa_bank / enhancedComposition.total) * 100;
      }
      
      try {
        cache?.set(cacheKey, enhancedComposition);
      } catch (cacheError) {
        console.warn('Cache set error:', cacheError);
      }
      
      console.log('✅ Payment composition fetched');
      
      return enhancedComposition;
    } catch (error) {
      console.error('❌ Error fetching payment composition:', error);
      
      return {
        cash: 0,
        mpesa_bank: 0,
        total: 0,
        transactions: 0,
        cashPercentage: 0,
        mpesaBankPercentage: 0,
        byDateArray: [],
        byCashierArray: [],
        byShopArray: [],
        byDate: {},
        byCashier: {},
        byShop: {},
        error: handleApiError(error, {}, true)
      };
    }
  },

  getCashiersWithMetrics: async (params = {}) => {
    try {
      console.log('👥 Fetching cashiers with metrics...');
      
      const cacheKey = `cashiers_with_metrics_${JSON.stringify(params)}`;
      
      let cached = null;
      try {
        cached = cache?.get(cacheKey);
      } catch (cacheError) {
        console.warn('Cache error:', cacheError);
      }
      
      if (cached) {
        console.log('✅ Using cached cashiers with metrics');
        return cached;
      }

      const response = await quickApi.get('/cashiers-with-metrics', { params });
      const cashiersData = response.data?.data || response.data;
      
      const enhancedCashiers = Array.isArray(cashiersData) ? cashiersData.map(cashier => {
        const metrics = cashier.metrics || {};
        
        return {
          ...cashier,
          metrics: {
            totalTransactions: CalculationUtils.safeNumber(metrics.totalTransactions || 0),
            totalRevenue: CalculationUtils.safeNumber(metrics.totalRevenue || 0),
            totalProfit: CalculationUtils.safeNumber(metrics.totalProfit || 0),
            totalItemsSold: CalculationUtils.safeNumber(metrics.totalItemsSold || 0),
            paymentMethods: metrics.paymentMethods || { cash: 0, mpesa_bank: 0 },
            digitalPaymentRatio: CalculationUtils.safeNumber(metrics.digitalPaymentRatio || 0),
            profitMargin: CalculationUtils.safeNumber(metrics.profitMargin || 0),
            averageTransaction: CalculationUtils.safeNumber(metrics.averageTransaction || 0),
            performanceScore: CalculationUtils.safeNumber(metrics.performanceScore || 0)
          }
        };
      }) : [];
      
      try {
        cache?.set(cacheKey, enhancedCashiers);
      } catch (cacheError) {
        console.warn('Cache set error:', cacheError);
      }
      
      console.log('✅ Cashiers with metrics fetched:', enhancedCashiers.length);
      
      return enhancedCashiers;
    } catch (error) {
      console.error('❌ Error fetching cashiers with metrics:', error);
      
      if (error.response?.status === 404) {
        console.log('⚠️ Endpoint not found');
        return [];
      }
      
      try {
        const cacheKey = `cashiers_with_metrics_${JSON.stringify(params)}`;
        const cached = cache?.get(cacheKey);
        if (cached) {
          console.log('🔄 Using stale cached cashiers with metrics after error');
          return cached;
        }
      } catch (cacheError) {
        console.warn('Cache error on fallback:', cacheError);
      }
      
      return [];
    }
  },

  getCashierPerformanceSummary: async (cashierId, params = {}) => {
    try {
      console.log('📈 Getting cashier performance summary:', cashierId);
      
      const [analytics, paymentComposition] = await Promise.all([
        cashierAnalyticsAPI.getCashierAnalytics(cashierId, params),
        cashierAnalyticsAPI.getPaymentComposition({ ...params, cashierId })
      ]);
      
      const summary = {
        cashier: analytics.cashier,
        metrics: analytics.metrics,
        paymentComposition: paymentComposition,
        period: analytics.period,
        recentTransactions: analytics.recentTransactions?.slice(0, 10) || [],
        topProducts: analytics.topProducts?.slice(0, 5) || []
      };
      
      console.log('✅ Performance summary generated');
      return summary;
    } catch (error) {
      console.error('❌ Error generating summary:', error);
      
      return {
        cashier: null,
        metrics: {
          totalRevenue: 0,
          totalProfit: 0,
          totalTransactions: 0,
          totalItemsSold: 0,
          profitMargin: 0,
          performanceScore: 0,
          paymentMethods: { cash: 0, mpesa_bank: 0 },
          digitalPaymentRatio: 0,
          cashPaymentRatio: 0
        },
        paymentComposition: {
          cash: 0,
          mpesa_bank: 0,
          cashPercentage: 0,
          mpesaBankPercentage: 0
        },
        recentTransactions: [],
        topProducts: [],
        period: {
          start: params.startDate || new Date().toISOString().split('T')[0],
          end: params.endDate || new Date().toISOString().split('T')[0],
          timeRange: params.timeRange || '30d'
        },
        error: handleApiError(error, {}, true)
      };
    }
  }
};

// ==================== SHOP API (UPDATED WITH DEBUG LOGS) ====================

export const shopAPI = {
  getAll: async (params = {}) => {
    try {
      console.log('📋 Fetching shops...');
      
      const cacheKey = `shops_${JSON.stringify(params)}`;
      
      let cached = null;
      try {
        cached = cache?.get(cacheKey);
      } catch (cacheError) {
        console.warn('Cache error:', cacheError);
      }
      
      if (cached) {
        console.log('✅ Using cached shops');
        return cached;
      }

      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
        try {
          await authAPI.refreshToken();
        } catch (refreshError) {
          console.warn('Token refresh failed:', refreshError);
        }
      }

      const response = await fastApi.get('/shops', { params });
      const data = response.data?.data || response.data;
      const shops = Array.isArray(data) ? data : [];
      
      console.log('✅ Shops fetched:', shops.length);
      
      try {
        cache?.set(cacheKey, shops);
      } catch (cacheError) {
        console.warn('Cache set error:', cacheError);
      }
      
      return shops;
    } catch (error) {
      console.error('❌ Error fetching shops:', error);
      
      try {
        const cacheKey = `shops_${JSON.stringify(params)}`;
        const cached = cache?.get(cacheKey);
        if (cached) {
          console.log('🔄 Using stale cached shops after error');
          return cached;
        }
      } catch (cacheError) {
        console.warn('Cache error on fallback:', cacheError);
      }
      
      return [];
    }
  },

  getById: async (id) => {
    try {
      console.log('🔍 Fetching shop:', id);
      
      const response = await api.get(`/shops/${id}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching shop:', error);
      throw new Error(handleApiError(error, { shopId: id }, true));
    }
  },

  create: async (data) => {
    try {
      console.log('🆕 Creating shop with data:', data);
      
      const response = await quickApi.post('/shops', data);
      
      // ✅ DEBUG LOGS: See exactly what came back
      console.log('📥 Full POST response:', response);
      console.log('📥 Response data:', response.data);
      console.log('📥 Response status:', response.status);
      console.log('📥 Response config URL:', response.config?.url);
      
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      console.log('✅ Shop created successfully');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error creating shop:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response status:', error.response?.status);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error config URL:', error.config?.url);
      console.error('❌ Error config baseURL:', error.config?.baseURL);
      
      throw new Error(handleApiError(error, {}, true));
    }
  },

  update: async (id, data) => {
    try {
      console.log('✏️ Updating shop:', id);
      
      const response = await api.put(`/shops/${id}`, data);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      console.log('✅ Shop updated');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error updating shop:', error);
      throw new Error(handleApiError(error, { shopId: id }, true));
    }
  },

  delete: async (id) => {
    try {
      console.log('🗑️ Deleting shop:', id);
      
      const response = await api.delete(`/shops/${id}`);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      console.log('✅ Shop deleted');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error deleting shop:', error);
      throw new Error(handleApiError(error, { shopId: id }, true));
    }
  }
};

// ==================== TRANSACTION API ====================

export const transactionAPI = {
  create: async (transactionData) => {
    try {
      console.log('💰 Creating transaction...');
      
      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.post('/transactions', transactionData);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      
      console.log('✅ Transaction created');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      
      let errorMessage = 'Transaction failed. ';
      errorMessage += handleApiError(error, {}, true);
      
      throw new Error(errorMessage);
    }
  },

  getAll: async (params = {}) => {
    try {
      const cacheKey = `transactions_${JSON.stringify(params)}`;
      
      let cached = null;
      try {
        cached = cache?.get(cacheKey);
      } catch (cacheError) {
        console.warn('Cache error:', cacheError);
      }
      
      if (cached) return cached;

      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await api.get('/transactions', { params });
      const data = response.data?.data || response.data;
      
      const allData = Array.isArray(data) ? data : data;
      
      try {
        cache?.set(cacheKey, allData);
      } catch (cacheError) {
        console.warn('Cache set error:', cacheError);
      }
      
      return allData;
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      
      try {
        const cacheKey = `transactions_${JSON.stringify(params)}`;
        const cached = cache?.get(cacheKey);
        if (cached) {
          return cached;
        }
      } catch (cacheError) {
        console.warn('Cache error on fallback:', cacheError);
      }
      
      throw new Error(handleApiError(error, {}, true));
    }
  },

  getById: async (id) => {
    try {
      const transactionId = typeof id === 'object' ? id._id || id.id || id.transactionId : id;
      
      if (!transactionId) {
        throw new Error('Invalid transaction ID');
      }
      
      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }
      
      const response = await api.get(`/transactions/${transactionId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching transaction:', error);
      return null;
    }
  },

  update: async (id, data) => {
    try {
      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await api.put(`/transactions/${id}`, data);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error updating transaction:', error);
      throw new Error(handleApiError(error, {}, true));
    }
  },

  delete: async (id) => {
    try {
      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await api.delete(`/transactions/${id}`);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error deleting transaction:', error);
      throw new Error(handleApiError(error, {}, true));
    }
  }
};

// ==================== UNIFIED API ====================

export const unifiedAPI = {
  getCombinedTransactions: async (params = {}) => {
    try {
      console.log('🚀 Fetching combined transactions...');
      
      const cacheKey = `combined_transactions_${JSON.stringify(params)}`;
      
      let cached = null;
      try {
        cached = cache?.get(cacheKey);
      } catch (cacheError) {
        console.warn('Cache error:', cacheError);
      }
      
      if (cached) {
        console.log('✅ Using cached combined transactions');
        return cached;
      }
      
      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }
      
      const response = await quickApi.get('/transactions/combined', { params });
      
      const data = response.data?.data || response.data;

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
        const paymentSplit = PaymentUtils.calculatePaymentSplit(transaction);
        
        return {
          ...transaction,
          totalAmount,
          cost: CalculationUtils.safeNumber(transaction.cost),
          profit: CalculationUtils.safeNumber(transaction.profit),
          profitMargin: CalculationUtils.safeNumber(transaction.profitMargin),
          displayDate: transaction.displayDate || 
                      new Date(transaction.saleDate || transaction.createdAt).toLocaleString('en-KE'),
          shopName: transaction.shopName || 
                   (transaction.shop && typeof transaction.shop === 'object' ? transaction.shop.name : 'Unknown Shop'),
          cashierName: transaction.cashierName || 'Unknown Cashier',
          paymentMethod: PaymentUtils.normalizePaymentMethod(transaction.paymentMethod || 'cash'),
          paymentSplit
        };
      });

      console.log('📈 Normalized data:', {
        transactions: normalizedTransactions.length,
        expenses: expenses.length,
        products: products.length
      });

      const paymentComposition = PaymentUtils.calculatePaymentComposition(normalizedTransactions);

      const enhancedData = {
        transactions: normalizedTransactions,
        salesWithProfit: normalizedTransactions,
        filteredTransactions: normalizedTransactions,
        expenses,
        products,
        shops,
        cashiers,
        
        summary: data.summary || CalculationUtils.getDefaultStats(),
        financialStats: data.financialStats || data.summary || CalculationUtils.getDefaultStats(),
        enhancedStats: data.enhancedStats || {
          salesWithProfit: normalizedTransactions,
          financialStats: data.summary || data.financialStats || CalculationUtils.getDefaultStats()
        },
        paymentComposition
      };

      try {
        cache?.set(cacheKey, enhancedData);
      } catch (cacheError) {
        console.warn('Cache set error:', cacheError);
      }
      
      console.log('✅ Combined transactions loaded');
      return enhancedData;
    } catch (error) {
      console.error('❌ Error fetching combined transactions:', error);
      
      try {
        const cacheKey = `combined_transactions_${JSON.stringify(params)}`;
        const cached = cache?.get(cacheKey);
        if (cached) {
          console.log('🔄 Using stale cached combined transactions after error');
          return cached;
        }
      } catch (cacheError) {
        console.warn('Cache error on fallback:', cacheError);
      }
      
      return {
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
        paymentComposition: {
          cash: 0,
          mpesa_bank: 0,
          total: 0,
          transactions: 0,
          cashPercentage: 0,
          mpesaBankPercentage: 0
        },
        error: handleApiError(error, {}, true)
      };
    }
  },

  createTransaction: async (transactionData) => {
    try {
      console.log('💰 Creating transaction...');
      
      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.post('/transactions', transactionData);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      
      console.log('✅ Transaction created');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      throw new Error(handleApiError(error, {}, true));
    }
  },

  getCombinedReports: async (params = {}) => {
    try {
      console.log('📊 Generating combined reports...');
      
      const cacheKey = `combined_reports_${JSON.stringify(params)}`;
      
      let cached = null;
      try {
        cached = cache?.get(cacheKey);
      } catch (cacheError) {
        console.warn('Cache error:', cacheError);
      }
      
      if (cached) {
        console.log('✅ Using cached reports');
        return cached;
      }
      
      const transactionsData = await unifiedAPI.getCombinedTransactions(params);
      
      const enhancedReports = {
        ...transactionsData,
        salesSummary: transactionsData.salesSummary || {
          financialStats: transactionsData.financialStats,
          topProducts: transactionsData.performance?.topProducts || [],
          topCashiers: transactionsData.performance?.topCashiers || [],
          paymentComposition: transactionsData.paymentComposition
        },
        comprehensiveReport: transactionsData.comprehensiveReport || {
          summary: transactionsData.financialStats,
          transactions: transactionsData.transactions,
          expenses: transactionsData.expenses,
          products: transactionsData.products,
          paymentComposition: transactionsData.paymentComposition
        }
      };
      
      try {
        cache?.set(cacheKey, enhancedReports);
      } catch (cacheError) {
        console.warn('Cache set error:', cacheError);
      }
      
      console.log('✅ Reports generated');
      return enhancedReports;
    } catch (error) {
      console.error('❌ Error generating reports:', error);
      
      try {
        const cacheKey = `combined_reports_${JSON.stringify(params)}`;
        const cached = cache?.get(cacheKey);
        if (cached) {
          console.log('🔄 Using stale cached reports');
          return cached;
        }
      } catch (cacheError) {
        console.warn('Cache error on fallback:', cacheError);
      }
      
      return {
        salesSummary: {
          financialStats: CalculationUtils.getDefaultStats(),
          topProducts: [],
          topCashiers: [],
          paymentComposition: {
            cash: 0,
            mpesa_bank: 0,
            total: 0,
            transactions: 0,
            cashPercentage: 0,
            mpesaBankPercentage: 0
          }
        },
        comprehensiveReport: {
          summary: CalculationUtils.getDefaultStats(),
          transactions: [],
          expenses: [],
          products: [],
          paymentComposition: {
            cash: 0,
            mpesa_bank: 0,
            total: 0,
            transactions: 0,
            cashPercentage: 0,
            mpesaBankPercentage: 0
          }
        },
        error: handleApiError(error, {}, true)
      };
    }
  },

  getTransactionMetrics: async (params = {}) => {
    try {
      console.log('📈 Fetching transaction metrics...');
      
      const cacheKey = `transaction_metrics_${JSON.stringify(params)}`;
      
      let cached = null;
      try {
        cached = cache?.get(cacheKey);
      } catch (cacheError) {
        console.warn('Cache error:', cacheError);
      }
      
      if (cached) {
        console.log('✅ Using cached metrics');
        return cached;
      }

      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
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
        totalMpesaBank: metrics.totalMpesaBank || { amount: 0, description: 'Digital payments (M-Pesa/Bank)' },
        totalCash: metrics.totalCash || { amount: 0, description: 'Cash payments' }
      };
      
      try {
        cache?.set(cacheKey, cleanMetrics);
      } catch (cacheError) {
        console.warn('Cache set error:', cacheError);
      }
      
      console.log('✅ Metrics fetched');
      return cleanMetrics;
    } catch (error) {
      console.error('❌ Error fetching metrics:', error);
      
      return {
        totalSales: { amount: 0, count: 0, description: '0 transactions' },
        totalRevenue: { amount: 0, description: 'From all sales' },
        expenses: { amount: 0, description: 'Total operational costs' },
        grossProfit: { amount: 0, description: 'Revenue - Cost of Goods' },
        netProfit: { amount: 0, description: 'After all expenses' },
        costOfGoodsSold: { amount: 0, description: 'For all sales' },
        totalMpesaBank: { amount: 0, description: 'Digital payments (M-Pesa/Bank)' },
        totalCash: { amount: 0, description: 'Cash payments' },
        error: handleApiError(error, {}, true)
      };
    }
  },

  getCashierDashboardMetrics: async (params = {}) => {
    try {
      console.log('👤 Fetching cashier dashboard metrics...');
      
      const cacheKey = `cashier_metrics_${JSON.stringify(params)}`;
      
      let cached = null;
      try {
        cached = cache?.get(cacheKey);
      } catch (cacheError) {
        console.warn('Cache error:', cacheError);
      }
      
      if (cached) {
        console.log('✅ Using cached cashier metrics');
        return cached;
      }

      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
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
        profitMargin: metrics.profitMargin || 0,
        digitalPaymentRatio: metrics.digitalPaymentRatio || 0,
        cashPaymentRatio: metrics.cashPaymentRatio || 0
      };
      
      try {
        cache?.set(cacheKey, cleanMetrics);
      } catch (cacheError) {
        console.warn('Cache set error:', cacheError);
      }
      
      console.log('✅ Cashier metrics fetched');
      return cleanMetrics;
    } catch (error) {
      console.error('❌ Error fetching cashier metrics:', error);
      
      return {
        totalSales: 0,
        totalTransactions: 0,
        totalCash: 0,
        totalMpesaBank: 0,
        itemsSold: 0,
        averageTransaction: 0,
        profitMargin: 0,
        digitalPaymentRatio: 0,
        cashPaymentRatio: 0,
        error: handleApiError(error, {}, true)
      };
    }
  }
};

// ==================== PRODUCT API ====================

export const productAPI = {
  getAll: async (params = {}) => {
    try {
      console.log('📋 Fetching products...');
      
      const cacheKey = `products_${JSON.stringify(params)}`;
      
      let cached = null;
      try {
        cached = cache?.get(cacheKey);
      } catch (cacheError) {
        console.warn('Cache error:', cacheError);
      }
      
      if (cached) {
        console.log('✅ Using cached products');
        return cached;
      }

      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await fastApi.get('/products', { params });
      const data = response.data?.data || response.data;
      const products = Array.isArray(data) ? data : [];

      console.log('✅ Products fetched:', products.length);
      
      try {
        cache?.set(cacheKey, products);
      } catch (cacheError) {
        console.warn('Cache set error:', cacheError);
      }
      
      return products;
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      
      if (error.response?.status === 404) {
        console.error('Products endpoint not found');
        return [];
      }
      
      try {
        const cacheKey = `products_${JSON.stringify(params)}`;
        const cached = cache?.get(cacheKey);
        if (cached) {
          return cached;
        }
      } catch (cacheError) {
        console.warn('Cache error on fallback:', cacheError);
      }
      
      return [];
    }
  },

  getById: async (id) => {
    try {
      console.log('🔍 Fetching product:', id);
      
      const response = await api.get(`/products/${id}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching product:', error);
      throw new Error(handleApiError(error, { productId: id }, true));
    }
  },

  create: async (data) => {
    try {
      console.log('🆕 Creating product:', data.name);
      
      const response = await quickApi.post('/products', data);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      console.log('✅ Product created');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error creating product:', error);
      throw new Error(handleApiError(error, {}, true));
    }
  },

  update: async (id, data) => {
    try {
      console.log('✏️ Updating product:', id);
      
      const response = await api.put(`/products/${id}`, data);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      console.log('✅ Product updated');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error updating product:', error);
      throw new Error(handleApiError(error, { productId: id }, true));
    }
  },

  delete: async (id) => {
    try {
      console.log('🗑️ Deleting product:', id);
      
      const response = await api.delete(`/products/${id}`);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      console.log('✅ Product deleted');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      throw new Error(handleApiError(error, { productId: id }, true));
    }
  },

  searchByBarcode: async (barcode, shop) => {
    try {
      console.log(`🔍 Searching product by barcode: ${barcode}, shop: ${shop}`);
      
      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const cleanBarcode = barcode.toString().trim();
      
      const response = await api.get('/products/search/barcode', { 
        params: { 
          barcode: cleanBarcode, 
          shop: shop || 'all' 
        } 
      });
      
      console.log('✅ Product found via API:', response.data);
      
      if (response.data && response.data.success) {
        return response.data;
      } else if (response.data && response.data.data) {
        return {
          success: true,
          data: response.data.data
        };
      } else if (response.data && response.data._id) {
        return {
          success: true,
          data: response.data
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Error searching product by barcode:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Product not found');
      }
      
      throw new Error(error.response?.data?.message || 'Failed to search product');
    }
  },

  getStats: async (params = {}) => {
    try {
      console.log('📊 Fetching product stats...');
      
      const cacheKey = `product_stats_${JSON.stringify(params)}`;
      
      let cached = null;
      try {
        cached = cache?.get(cacheKey);
      } catch (cacheError) {
        console.warn('Cache error:', cacheError);
      }
      
      if (cached) {
        console.log('✅ Using cached product stats');
        return cached;
      }

      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.get('/products/stats/overview', { params });
      const stats = response.data?.data || response.data;
      
      try {
        cache?.set(cacheKey, stats);
      } catch (cacheError) {
        console.warn('Cache set error:', cacheError);
      }
      
      console.log('✅ Product stats fetched');
      return stats;
    } catch (error) {
      console.error('❌ Error fetching product stats:', error);
      
      return {
        overview: { totalProducts: 0, outOfStock: 0, lowStock: 0, inStock: 0 },
        categories: [],
        barcodeStats: { totalWithBarcode: 0, totalWithoutBarcode: 0 },
        stockAnalysis: { reorderNeeded: 0, zeroStock: 0 }
      };
    }
  }
};

// ==================== EXPENSE API ====================

export const expenseAPI = {
  getAll: async (params = {}) => {
    try {
      console.log('📋 Fetching expenses...');
      
      const cacheKey = `expenses_${JSON.stringify(params)}`;
      
      let cached = null;
      try {
        cached = cache?.get(cacheKey);
      } catch (cacheError) {
        console.warn('Cache error:', cacheError);
      }
      
      if (cached) {
        console.log('✅ Using cached expenses');
        return cached;
      }

      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await fastApi.get('/expenses', { params });
      const data = response.data?.data || response.data;
      const expenses = Array.isArray(data) ? data : [];

      console.log('✅ Expenses fetched:', expenses.length);
      
      try {
        cache?.set(cacheKey, expenses);
      } catch (cacheError) {
        console.warn('Cache set error:', cacheError);
      }
      
      return expenses;
    } catch (error) {
      console.error('❌ Error fetching expenses:', error);
      
      if (error.response?.status === 404) {
        console.error('Expenses endpoint not found');
        return [];
      }
      
      try {
        const cacheKey = `expenses_${JSON.stringify(params)}`;
        const cached = cache?.get(cacheKey);
        if (cached) {
          return cached;
        }
      } catch (cacheError) {
        console.warn('Cache error on fallback:', cacheError);
      }
      
      return [];
    }
  },

  getById: async (id) => {
    try {
      console.log('🔍 Fetching expense:', id);
      
      const response = await api.get(`/expenses/${id}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching expense:', error);
      throw new Error(handleApiError(error, { expenseId: id }, true));
    }
  },

  create: async (data) => {
    try {
      console.log('🆕 Creating expense:', data.description);
      
      const response = await quickApi.post('/expenses', data);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      console.log('✅ Expense created');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error creating expense:', error);
      throw new Error(handleApiError(error, {}, true));
    }
  },

  update: async (id, data) => {
    try {
      console.log('✏️ Updating expense:', id);
      
      const response = await api.put(`/expenses/${id}`, data);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      console.log('✅ Expense updated');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error updating expense:', error);
      throw new Error(handleApiError(error, { expenseId: id }, true));
    }
  },

  delete: async (id) => {
    try {
      console.log('🗑️ Deleting expense:', id);
      
      const response = await api.delete(`/expenses/${id}`);
      if (cache && cache.clearAll) {
        cache.clearAll();
      }
      console.log('✅ Expense deleted');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error deleting expense:', error);
      throw new Error(handleApiError(error, { expenseId: id }, true));
    }
  },

  getStats: async (params = {}) => {
    try {
      console.log('📊 Fetching expense stats...');
      
      const cacheKey = `expense_stats_${JSON.stringify(params)}`;
      
      let cached = null;
      try {
        cached = cache?.get(cacheKey);
      } catch (cacheError) {
        console.warn('Cache error:', cacheError);
      }
      
      if (cached) {
        console.log('✅ Using cached expense stats');
        return cached;
      }

      if (authAPI.shouldRefreshToken && authAPI.shouldRefreshToken()) {
        await authAPI.refreshToken();
      }

      const response = await quickApi.get('/expenses/stats/overview', { params });
      const stats = response.data?.data || response.data;
      
      try {
        cache?.set(cacheKey, stats);
      } catch (cacheError) {
        console.warn('Cache set error:', cacheError);
      }
      
      console.log('✅ Expense stats fetched');
      return stats;
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
  }
};

// ==================== REPORT API ====================

export const reportAPI = {
  getDashboardData: async (filters = {}) => {
    try {
      console.log('📈 Fetching dashboard data...');
      
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
      
      console.log('✅ Dashboard data loaded');
      return dashboardData;
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      throw new Error(handleApiError(error, {}, true));
    }
  },

  getCashierDashboard: async (filters = {}) => {
    try {
      console.log('👤 Fetching cashier dashboard...');
      
      const [metrics, transactions] = await Promise.all([
        unifiedAPI.getCashierDashboardMetrics(filters),
        unifiedAPI.getCombinedTransactions(filters)
      ]);
      
      const dashboardData = {
        ...metrics,
        recentTransactions: transactions.transactions?.slice(0, 10) || [],
        loadedAt: new Date().toISOString(),
        paymentComposition: transactions.paymentComposition || {
          cash: 0,
          mpesa_bank: 0,
          total: 0,
          transactions: 0,
          cashPercentage: 0,
          mpesaBankPercentage: 0
        }
      };
      
      console.log('✅ Cashier dashboard loaded');
      return dashboardData;
    } catch (error) {
      console.error('❌ Error loading cashier dashboard:', error);
      
      return {
        totalSales: 0,
        totalTransactions: 0,
        totalCash: 0,
        totalMpesaBank: 0,
        recentTransactions: [],
        paymentComposition: {
          cash: 0,
          mpesa_bank: 0,
          total: 0,
          transactions: 0,
          cashPercentage: 0,
          mpesaBankPercentage: 0
        },
        error: handleApiError(error, {}, true)
      };
    }
  }
};

// ==================== MAIN API SERVICE ====================

const apiService = {
  // Core APIs
  auth: authAPI,
  transactions: transactionAPI,
  products: productAPI,
  shops: shopAPI,
  cashiers: cashierAPI,
  expenses: expenseAPI,
  reports: reportAPI,
  cashierAnalytics: cashierAnalyticsAPI,
  unified: unifiedAPI,
  silent: silentAPI,
  
  // Utilities
  handleApiError,
  cache,
  tokenManager,
  PaymentUtils,
  
  // Cache management
  clearCache: () => {
    if (cache && cache.clearAll) {
      cache.clearAll();
    }
  },
  getCacheStats: () => {
    if (cache && cache.getStats) {
      return cache.getStats();
    }
    return { size: 0, maxSize: 100, hits: 0, misses: 0, hitRate: 0 };
  },
  
  // Health check
  healthCheck: async () => {
    try {
      const response = await fastApi.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        success: false,
        status: 'unhealthy',
        error: handleApiError(error, {}, true)
      };
    }
  },
  
  // Initialize API
  initialize: () => {
    try {
      const token = tokenManager.getToken();
      if (token) {
        authAPI.setAuthToken(token);
        console.log('🔑 API initialized with token');
      } else {
        console.log('🔑 API initialized without token');
      }
    } catch (error) {
      console.warn('API initialization error:', error);
    }
  },
  
  // Test endpoints
  testEndpoints: async () => {
    const endpoints = [
      '/cashiers',
      '/cashiers/123/analytics',
      '/analytics/payment-composition',
      '/health'
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const response = await fastApi.get(endpoint);
        results[endpoint] = {
          status: 'online',
          statusCode: response.status
        };
      } catch (error) {
        results[endpoint] = {
          status: 'offline',
          statusCode: error.response?.status,
          error: error.message
        };
      }
    }
    
    return results;
  },
  
  // Enhanced cashier analytics
  getEnhancedCashierAnalytics: async (cashierId, params = {}) => {
    try {
      console.log('🎯 Getting enhanced analytics:', cashierId);
      
      const response = await cashierAPI.getAnalytics(cashierId, params);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.message || 'Failed to fetch analytics');
    } catch (error) {
      console.error('❌ Error in enhanced analytics:', error);
      
      return {
        cashier: null,
        metrics: {
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          totalTransactions: 0,
          totalItemsSold: 0,
          profitMargin: 0,
          performanceScore: 0,
          paymentMethods: { cash: 0, mpesa_bank: 0 },
          digitalPaymentRatio: 0,
          cashPaymentRatio: 0,
          averageTransactionValue: 0
        },
        dailyPerformance: [],
        topProducts: [],
        recentTransactions: [],
        period: {
          start: params.startDate || new Date().toISOString().split('T')[0],
          end: params.endDate || new Date().toISOString().split('T')[0],
          timeRange: params.timeRange || '30d'
        }
      };
    }
  },
  
  // All cashiers with analytics
  getAllCashiersWithAnalytics: async (params = {}) => {
    try {
      console.log('👥 Getting all cashiers with analytics...');
      
      const [cashiers, cashiersWithMetrics] = await Promise.all([
        cashierAPI.getAll(params),
        cashierAnalyticsAPI.getCashiersWithMetrics(params)
      ]);
      
      const enhancedCashiers = cashiers.map(cashier => {
        const cashierMetrics = cashiersWithMetrics.find(c => c._id === cashier._id);
        return {
          ...cashier,
          metrics: cashierMetrics?.metrics || {
            totalTransactions: 0,
            totalRevenue: 0,
            totalProfit: 0,
            totalItemsSold: 0,
            paymentMethods: { cash: 0, mpesa_bank: 0 },
            digitalPaymentRatio: 0,
            profitMargin: 0,
            averageTransaction: 0,
            performanceScore: 0
          }
        };
      });
      
      return enhancedCashiers;
    } catch (error) {
      console.error('❌ Error getting cashiers with analytics:', error);
      return cashierAPI.getAll(params);
    }
  },
  
  // Direct axios methods
  get: async (url, config = {}) => {
    try {
      return await api.get(url, config);
    } catch (error) {
      console.error(`❌ GET failed for ${url}:`, error);
      throw error;
    }
  },

  post: async (url, data, config = {}) => {
    try {
      return await api.post(url, data, config);
    } catch (error) {
      console.error(`❌ POST failed for ${url}:`, error);
      throw error;
    }
  },

  put: async (url, data, config = {}) => {
    try {
      return await api.put(url, data, config);
    } catch (error) {
      console.error(`❌ PUT failed for ${url}:`, error);
      throw error;
    }
  },

  delete: async (url, config = {}) => {
    try {
      return await api.delete(url, config);
    } catch (error) {
      console.error(`❌ DELETE failed for ${url}:`, error);
      throw error;
    }
  }
};

// Initialize API on import
apiService.initialize();

export default apiService;
export { handleApiError };

// Default stats helper
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
  totalMpesaBank: 0,
  digitalPaymentRatio: 0,
  cashPaymentRatio: 0
});