// pages/Auth/CashierLogin.jsx - UPDATED WITH SESSION EXPIRY HANDLING
import React, { useState, useEffect } from 'react';
import { 
  Container,
  Box,
  Typography,
  Avatar,
  Paper,
  CssBaseline,
  Alert,
  Button,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  alpha,
  Slide
} from '@mui/material';
import { 
  PointOfSale,
  ArrowBack,
  Visibility,
  VisibilityOff,
  Info,
  Warning
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const CashierLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expiredMessage, setExpiredMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  // Check for expired session messages
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    // Check for expired parameter
    if (params.get('expired') === 'true') {
      setExpiredMessage('Your session expired due to inactivity. Please log in again.');
    } else if (params.get('expired') === 'inactivity') {
      setExpiredMessage('Session expired after 1 hour of inactivity. Please log in again.');
    }
    
    // Check for state message (from forced logout)
    if (location.state?.message) {
      setExpiredMessage(location.state.message);
    }
    
    // Check for termination message
    if (params.get('terminated') === 'true') {
      setExpiredMessage('Your session was terminated. Please log in again.');
    }
  }, [location]);

  // Clear auth data on component mount if there's an expired message
  useEffect(() => {
    if (expiredMessage) {
      // Clear any stale auth data
      localStorage.removeItem('cashierData');
      localStorage.removeItem('cashierToken');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      console.log('🧹 Cleared auth data due to session expiry');
    }
  }, [expiredMessage]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!credentials.email || !credentials.password) {
      setError('Please enter both email and password');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    setError('');
    setExpiredMessage(''); // Clear expired message on new login attempt
    
    try {
      console.log('🔐 Attempting login for:', credentials.email);
      
      const API_URL = 'http://localhost:5002/api/auth/cashier/login';
      
      console.log('📡 Sending request to:', API_URL);
      
      const response = await axios.post(
        API_URL,
        {
          email: credentials.email.toLowerCase().trim(),
          password: credentials.password
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );
      
      console.log('✅ Login response:', response.data);
      
      if (response.data && response.data.success) {
        const userData = response.data.user || response.data.data || response.data;
        const token = response.data.token || response.data.accessToken;
        
        console.log('✅ Login successful:', {
          name: userData.name,
          email: userData.email,
          role: userData.role
        });

        // Store authentication data
        const authData = {
          _id: userData._id || userData.id,
          name: userData.name || 'Cashier',
          email: userData.email,
          phone: userData.phone || '',
          role: userData.role || 'cashier',
          status: userData.status || 'active',
          lastLogin: userData.lastLogin || new Date().toISOString(),
          shopId: userData.shopId || userData.shop?._id || null,
          shopName: userData.shopName || userData.shop?.name || null,
          shopLocation: userData.shopLocation || userData.shop?.location || null,
          loginTime: new Date().toISOString(),
          token: token
        };
        
        // Store in localStorage
        localStorage.setItem('cashierData', JSON.stringify(authData));
        if (token) {
          localStorage.setItem('cashierToken', token);
          localStorage.setItem('token', token);
        }
        
        // Set default axios headers for future requests
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        
        console.log('✅ Authentication data stored in localStorage');
        setError('');
        
        // Navigate based on shop assignment
        if (authData.shopId) {
          navigate('/cashier/dashboard', { 
            replace: true,
            state: { 
              loginSuccess: true,
              cashierName: authData.name,
              shopId: authData.shopId,
              shopName: authData.shopName
            }
          });
        } else {
          navigate('/cashier/shops', { 
            replace: true,
            state: { 
              loginSuccess: true,
              cashierName: authData.name
            }
          });
        }
        
      } else {
        throw new Error(response.data?.message || 'Login failed - no success flag');
      }
      
    } catch (err) {
      console.error('❌ Login error details:', {
        name: err.name,
        message: err.message,
        code: err.code,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // Detailed error handling
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to the server. Please check if the backend is running.');
      } 
      else if (err.code === 'ECONNABORTED') {
        setError('Request timeout. Server might be busy. Try again.');
      }
      else if (err.response) {
        const { status, data } = err.response;
        
        switch(status) {
          case 400:
            setError(data.message || 'Invalid request format.');
            break;
          case 401:
            setError(data.message || 'Invalid email or password.');
            break;
          case 403:
            setError(data.message || 'Account is inactive. Contact administrator.');
            break;
          case 404:
            setError(data.message || 'Cashier account not found.');
            break;
          case 405:
            setError('Method not allowed. Please check API endpoint configuration.');
            break;
          case 500:
            setError('Server error. Please try again later.');
            break;
          default:
            setError(data?.message || `Login failed (Status: ${status})`);
        }
        
        if (data?.debug) {
          console.log('🔍 Server debug info:', data.debug);
        }
      } 
      else if (err.message.includes('40')) {
        setError('API endpoint not found. Please check the URL.');
      }
      else {
        setError('Unable to reach server. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ 
      ...prev, 
      [name]: value 
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleBackToMain = () => {
    navigate('/');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin(e);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Color scheme
  const colors = {
    cashier: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
      gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
    },
    background: {
      main: '#0F172A',
      light: '#1E293B',
      paper: '#334155'
    }
  };

  return (
    <Container 
      component="main" 
      maxWidth="sm"
      sx={{
        background: colors.background.main,
        minHeight: '100vh',
        padding: 3,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}
    >
      <CssBaseline />
      
      {/* Back Button */}
      <Box sx={{ 
        mb: 2,
        display: 'flex',
        justifyContent: 'flex-start'
      }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBackToMain}
          sx={{ 
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white'
            }
          }}
          disabled={loading}
        >
          Back to Main
        </Button>
      </Box>

      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1
        }}
      >
        {/* Logo/Icon */}
        <Avatar sx={{ 
          width: 70, 
          height: 70,
          background: colors.cashier.gradient,
          mb: 2,
          boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)'
        }}>
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            <PointOfSale sx={{ fontSize: 36 }} />
          )}
        </Avatar>

        {/* Title */}
        <Typography 
          variant="h4" 
          sx={{ 
            mb: 1,
            fontWeight: 'bold',
            background: colors.cashier.gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textAlign: 'center'
          }}
        >
          Cashier Login
        </Typography>

        {/* Subtitle */}
        <Typography 
          variant="body1" 
          sx={{ 
            mb: 3,
            color: 'rgba(255, 255, 255, 0.8)',
            textAlign: 'center'
          }}
        >
          Sign in to access your POS system
        </Typography>

        {/* Session Expired Alert */}
        {expiredMessage && (
          <Slide direction="down" in={!!expiredMessage} mountOnEnter unmountOnExit>
            <Alert 
              severity="info"
              icon={<Info />}
              sx={{ 
                width: '100%', 
                mb: 3,
                borderRadius: 2,
                border: `1px solid ${alpha('#2196f3', 0.3)}`,
                backgroundColor: alpha('#2196f3', 0.1),
                color: 'white',
                '& .MuiAlert-icon': {
                  color: '#2196f3'
                }
              }} 
              onClose={() => setExpiredMessage('')}
            >
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {expiredMessage}
              </Typography>
            </Alert>
          </Slide>
        )}

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error"
            icon={<Warning />}
            sx={{ 
              width: '100%', 
              mb: 3,
              borderRadius: 2,
              backgroundColor: alpha('#ef5350', 0.1),
              color: 'white',
              border: `1px solid ${alpha('#ef5350', 0.3)}`,
              '& .MuiAlert-icon': {
                color: '#ef5350'
              },
              '& .MuiAlert-message': {
                width: '100%'
              }
            }} 
            onClose={() => setError('')}
          >
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {error}
            </Typography>
          </Alert>
        )}

        {/* Login Form */}
        <Paper 
          elevation={8} 
          sx={{ 
            p: 4,
            width: '100%',
            borderRadius: 3,
            background: `linear-gradient(135deg, ${colors.background.paper} 0%, rgba(51, 65, 85, 0.9) 100%)`,
            border: `1px solid rgba(16, 185, 129, 0.2)`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}
        >
          <Box component="form" onSubmit={handleLogin} noValidate>
            {/* Email Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              name="email"
              label="Email Address"
              type="email"
              value={credentials.email}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              disabled={loading}
              autoComplete="email"
              autoFocus
              placeholder="Enter your email"
              sx={{ mb: 2 }}
              InputProps={{
                sx: { 
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(16, 185, 129, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.cashier.main,
                  }
                }
              }}
              InputLabelProps={{
                sx: {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: colors.cashier.light,
                  }
                }
              }}
            />
            
            {/* Password Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={credentials.password}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              disabled={loading}
              autoComplete="current-password"
              placeholder="Enter your password"
              InputProps={{
                sx: { 
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(16, 185, 129, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.cashier.main,
                  }
                },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={togglePasswordVisibility}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                      disabled={loading}
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.5)',
                        '&:hover': {
                          color: colors.cashier.light
                        }
                      }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              InputLabelProps={{
                sx: {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: colors.cashier.light,
                  }
                }
              }}
            />

            {/* Login Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !credentials.email || !credentials.password}
              sx={{ 
                mt: 3, 
                mb: 2,
                py: 1.5,
                background: colors.cashier.gradient,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 'bold',
                textTransform: 'none',
                '&:hover': {
                  background: colors.cashier.dark,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 25px ${colors.cashier.main}40`
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.3)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Help Text */}
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
                mt: 1
              }}
            >
              Contact administrator if you forgot your password
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default CashierLogin;