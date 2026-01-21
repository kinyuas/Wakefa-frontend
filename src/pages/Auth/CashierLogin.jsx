import React, { useState } from 'react';
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
  IconButton
} from '@mui/material';
import { 
  PointOfSale,
  ArrowBack,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CashierLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

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
    
    try {
      console.log('🔐 Attempting login for:', credentials.email);
      
      // Direct call to the main cashier login endpoint
      const response = await axios.post(
        'http://localhost:5002/api/auth/cashier/login', 
        {
          email: credentials.email.toLowerCase().trim(),
          password: credentials.password
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true // Important for sessions/cookies
        }
      );
      
      console.log('✅ Login response:', response.data);
      
      if (response.data && response.data.success) {
        const userData = response.data.user;
        const token = response.data.token;
        
        console.log('✅ Login successful:', {
          name: userData.name,
          email: userData.email,
          role: userData.role
        });

        // Store authentication data
        const authData = {
          _id: userData._id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          role: userData.role || 'cashier',
          status: userData.status,
          lastLogin: userData.lastLogin,
          shopId: userData.shopId,
          shopName: userData.shopName,
          shopLocation: userData.shopLocation,
          loginTime: new Date().toISOString(),
          token: token
        };
        
        // Store in localStorage
        localStorage.setItem('cashierData', JSON.stringify(authData));
        localStorage.setItem('cashierToken', token);
        
        // Set default axios headers for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Show success in console
        console.log('✅ Authentication data stored in localStorage');
        
        // Clear any previous errors
        setError('');
        
        // Navigate based on shop assignment
        if (userData.shopId) {
          navigate('/cashier/dashboard', { 
            replace: true,
            state: { 
              loginSuccess: true,
              cashierName: userData.name,
              shopId: userData.shopId,
              shopName: userData.shopName
            }
          });
        } else {
          navigate('/cashier/shops', { 
            replace: true,
            state: { 
              loginSuccess: true,
              cashierName: userData.name
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
        setError('Cannot connect to the server. Make sure the backend is running on port 5002.');
        console.log('💡 Tip: Run `npm start` in your backend directory');
      } 
      else if (err.code === 'ECONNABORTED') {
        setError('Request timeout. Server might be busy. Try again.');
      }
      else if (err.response) {
        // Server responded with error status
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
          case 500:
            setError('Server error. Please try again later.');
            break;
          default:
            setError(data?.message || `Login failed (Status: ${status})`);
        }
        
        // Log additional debug info
        if (data?.debug) {
          console.log('🔍 Server debug info:', data.debug);
        }
      } 
      else {
        // Other errors (no response from server)
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

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error"
            sx={{ 
              width: '100%', 
              mb: 3,
              borderRadius: 2,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'white',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }} 
            onClose={() => setError('')}
          >
            {error}
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