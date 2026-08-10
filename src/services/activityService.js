// services/activityService.js - COMPLETE UPDATED VERSION

class ActivityService {
  constructor() {
    this.activityTimer = null;
    this.inactivityTimeout = 60 * 60 * 1000; // 60 minutes (1 hour) - no warning, direct logout
    this.checkInterval = 60 * 1000; // Check every minute
    this.lastActivity = Date.now();
    this.warningShown = false;
    this.sessionCheckInterval = null;
    this.activityHandler = null;
    this.events = null;
    this.userRole = null;
    this.activityUpdateInterval = null;
    this.isAuthenticated = false;
    this.logoutCallback = null;
  }

  // Initialize activity tracking
  init(userRole = 'cashier') {
    this.userRole = userRole;
    this.lastActivity = Date.now();
    this.warningShown = false;
    this.isAuthenticated = true;
    
    console.log(`🕒 Activity tracking initialized for ${userRole} - Auto logout after 1 hour of inactivity`);
    
    // Set up event listeners for user activity
    this.setupActivityListeners();
    
    // Start checking for inactivity
    this.startInactivityCheck();
    
    // Start session validation with backend
    this.startSessionValidation();
    
    // Start periodic activity updates to backend
    this.startActivityUpdates();
  }

  setupActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click'];
    
    this.activityHandler = () => {
      this.lastActivity = Date.now();
      this.warningShown = false;
      
      // Update backend activity (debounced)
      if (this.debouncedActivityUpdate) {
        this.debouncedActivityUpdate();
      }
    };
    
    events.forEach(event => {
      window.addEventListener(event, this.activityHandler);
    });
    
    // Store for cleanup
    this.events = events;
    
    console.log(`👂 Activity listeners attached for events: ${events.join(', ')}`);
  }

  // Debounced activity update to prevent too many API calls
  debouncedActivityUpdate = this.debounce(() => {
    this.updateBackendActivity();
  }, 30000); // Update every 30 seconds max

  async updateBackendActivity() {
    if (!this.isAuthenticated) return;
    
    try {
      const token = localStorage.getItem('token') || 
                    localStorage.getItem('cashierToken') || 
                    localStorage.getItem('adminToken');
      
      if (!token) {
        console.log('⚠️ No token found for activity update');
        return;
      }
      
      const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5002/api';
      
      const response = await fetch(`${API_URL}/auth/activity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: this.userRole,
          timestamp: Date.now()
        })
      });
      
      if (response.status === 401) {
        const data = await response.json();
        if (data.code === 'SESSION_EXPIRED' || data.reason === 'inactivity') {
          // Session expired, force logout
          this.forceLogout(data.message || 'Session expired due to inactivity');
        }
      } else if (response.ok) {
        const data = await response.json();
        
        // Update token if server returned a new one
        if (data.token) {
          this.updateStoredToken(data.token);
        }
      }
    } catch (error) {
      console.error('❌ Failed to update activity:', error);
      // Don't logout on network errors - let the local timer handle it
    }
  }

  updateStoredToken(newToken) {
    try {
      // Update token in localStorage
      if (this.userRole === 'admin') {
        localStorage.setItem('adminToken', newToken);
        localStorage.setItem('token', newToken);
      } else if (this.userRole === 'cashier') {
        localStorage.setItem('cashierToken', newToken);
        localStorage.setItem('token', newToken);
      }
      
      console.log('🔄 Token refreshed via activity update');
    } catch (error) {
      console.error('❌ Failed to update token:', error);
    }
  }

  startInactivityCheck() {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }
    
    this.activityTimer = setInterval(() => {
      if (!this.isAuthenticated) return;
      
      const inactiveTime = Date.now() - this.lastActivity;
      
      // Log inactivity status for debugging
      if (inactiveTime > this.inactivityTimeout - 60000) { // Last minute
        console.log(`⏰ Inactivity: ${Math.round(inactiveTime / 1000)}s / ${Math.round(this.inactivityTimeout / 1000)}s`);
      }
      
      // Check if exceeded timeout - DIRECT LOGOUT, NO WARNING
      if (inactiveTime > this.inactivityTimeout) {
        console.log(`🚪 Auto-logout after ${Math.round(inactiveTime / 1000)} seconds of inactivity`);
        this.forceLogout('Logged out after 1 hour of inactivity');
      }
    }, this.checkInterval);
  }

  startSessionValidation() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    
    // Check with backend every 5 minutes
    this.sessionCheckInterval = setInterval(async () => {
      if (!this.isAuthenticated) return;
      await this.validateSession();
    }, 5 * 60 * 1000);
  }

  startActivityUpdates() {
    if (this.activityUpdateInterval) {
      clearInterval(this.activityUpdateInterval);
    }
    
    // Send activity updates every 2 minutes
    this.activityUpdateInterval = setInterval(() => {
      if (!this.isAuthenticated) return;
      this.updateBackendActivity();
    }, 2 * 60 * 1000);
  }

  async validateSession() {
    try {
      const token = localStorage.getItem('token') || 
                    localStorage.getItem('cashierToken') || 
                    localStorage.getItem('adminToken');
      
      if (!token) {
        this.forceLogout('No valid session found');
        return;
      }
      
      const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5002/api';
      
      const response = await fetch(`${API_URL}/auth/validate-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          if (data.code === 'SESSION_EXPIRED' || data.reason === 'inactivity') {
            this.forceLogout(data.message || 'Session expired due to inactivity');
          } else {
            this.forceLogout('Session invalid, please login again');
          }
        }
      }
    } catch (error) {
      console.error('❌ Session validation error:', error);
      // Don't logout on network errors - let local timer handle it
    }
  }

  forceLogout(reason = 'Session expired') {
    if (!this.isAuthenticated) return; // Prevent multiple logout calls
    
    console.log(`🚪 Forcing logout: ${reason}`);
    this.isAuthenticated = false;
    
    // Clear all timers
    this.cleanup();
    
    // Get user role before clearing
    const userRole = this.userRole || 
                    (localStorage.getItem('adminData') ? 'admin' : 
                    (localStorage.getItem('cashierData') ? 'cashier' : null));
    
    // Determine redirect path
    let redirectPath = '/';
    if (userRole === 'admin') {
      redirectPath = '/admin/login';
    } else if (userRole === 'cashier') {
      redirectPath = '/cashier/login';
    }
    
    // Clear all auth data
    this.clearAllAuthData();
    
    // Dispatch logout event for components
    const logoutEvent = new CustomEvent('force-logout', {
      detail: { 
        reason,
        role: userRole,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(logoutEvent);
    
    // Call custom logout callback if set
    if (this.logoutCallback) {
      this.logoutCallback(reason, redirectPath);
    } else {
      // Default redirect
      setTimeout(() => {
        window.location.href = `${redirectPath}?expired=inactivity&reason=${encodeURIComponent(reason)}`;
      }, 100);
    }
  }

  clearAllAuthData() {
    const itemsToRemove = [
      'userData', 'adminData', 'cashierData',
      'token', 'adminToken', 'cashierToken', 'userToken',
      'refreshToken', 'tokenExpiry', 'lastLogin',
      'selectedShop', 'lastShop'
    ];
    
    itemsToRemove.forEach(item => localStorage.removeItem(item));
    
    // Clear any session storage items
    sessionStorage.clear();
    
    console.log('🧹 All authentication data cleared');
  }

  cleanup() {
    // Remove event listeners
    if (this.activityHandler && this.events && Array.isArray(this.events)) {
      this.events.forEach(event => {
        window.removeEventListener(event, this.activityHandler);
      });
    }
    
    // Clear timers
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
    
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    
    if (this.activityUpdateInterval) {
      clearInterval(this.activityUpdateInterval);
      this.activityUpdateInterval = null;
    }
    
    // Reset state
    this.activityHandler = null;
    this.events = null;
    this.warningShown = false;
    this.isAuthenticated = false;
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Record activity manually
  recordActivity() {
    this.lastActivity = Date.now();
    this.warningShown = false;
  }

  // Check if session is still valid
  async checkSession() {
    const inactiveTime = Date.now() - this.lastActivity;
    
    // Check if session is still valid (less than 1 hour)
    if (inactiveTime < this.inactivityTimeout) {
      return true;
    }
    
    // Try to validate with backend
    try {
      const token = localStorage.getItem('token') || 
                    localStorage.getItem('cashierToken') || 
                    localStorage.getItem('adminToken');
      
      if (!token) return false;
      
      const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5002/api';
      
      const response = await fetch(`${API_URL}/auth/validate-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Set custom logout callback
  setLogoutCallback(callback) {
    this.logoutCallback = callback;
  }

  // Get remaining time in seconds
  getRemainingTime() {
    const inactiveTime = Date.now() - this.lastActivity;
    const remainingMs = Math.max(0, this.inactivityTimeout - inactiveTime);
    return Math.floor(remainingMs / 1000);
  }

  // Manually stop tracking (for logout)
  stop() {
    this.isAuthenticated = false;
    this.cleanup();
  }
}

export default new ActivityService();