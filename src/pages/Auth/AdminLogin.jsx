// pages/Auth/AdminLogin.jsx - UPDATED WITH SESSION EXPIRY HANDLING
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { 
  Container,
  Box,
  Avatar,
  Paper,
  CssBaseline,
  Alert,
  Typography,
  CircularProgress,
  Button,
  TextField,
  alpha,
  Slide
} from '@mui/material';
import { 
  AdminPanelSettings, 
  Email, 
  Security,
  ArrowBack,
  Warning,
  Info
} from '@mui/icons-material';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [expiredMessage, setExpiredMessage] = useState(null);
  const [step, setStep] = useState('email'); // 'email', 'code', 'success'
  const [formData, setFormData] = useState({
    email: '',
    secureCode: ''
  });

  // Color scheme aligned with Home.jsx
  const colors = {
    primary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
      gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
    },
    admin: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'
    },
    background: {
      main: '#0F172A',
      light: '#1E293B',
      paper: '#334155'
    }
  };

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
      setExpiredMessage('Your session was terminated by an administrator. Please log in again.');
    }
  }, [location]);

  // Function to clear all authentication data
  const clearAuthData = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('adminData');
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('lastLogin');
    console.log('🧹 Cleared all authentication data');
  };

  // Validate token on component mount
  const validateToken = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await authAPI.validateToken();
        if (response.success) {
          console.log('✅ Token is valid');
          return true;
        }
      } catch (error) {
        console.log('❌ Token validation failed, clearing auth data');
        clearAuthData();
      }
    }
    return false;
  };

  // Check if token exists and redirect if already authenticated
  useEffect(() => {
    const checkAuthentication = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('userData');
      
      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          if (user.role === 'admin') {
            console.log('🔄 Already authenticated, validating token...');
            const isValid = await validateToken();
            if (isValid) {
              const redirectPath = location.state?.from || '/admin/dashboard';
              navigate(redirectPath, { replace: true });
            }
          }
        } catch (error) {
          console.error('Error checking authentication:', error);
          clearAuthData();
        }
      }
    };
    
    checkAuthentication();
  }, [navigate, location]);

  // Handle back to main navigation
  const handleBackToMain = () => {
    navigate('/');
  };

  // Request secure code (now includes token generation on verification)
  const handleRequestCode = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      console.log('📧 Requesting secure code for:', formData.email);
      
      const response = await authAPI.requestSecureCode({
        email: formData.email
      });

      console.log('✅ Secure code response:', response);
      
      if (response.success) {
        setMessage(`Secure code sent to ${formData.email}`);
        setStep('code');
        
        // In development mode, show the code
        if (response.developmentMode && response.secureCode) {
          console.log(`🔧 [DEV] Secure code: ${response.secureCode}`);
          setMessage(`Secure code sent to ${formData.email}. Development code: ${response.secureCode}`);
        }
      } else {
        setError(response.message || 'Failed to send secure code');
      }
      
    } catch (err) {
      console.error('❌ Secure code request error:', err);
      
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data || {};
        const message = errorData.message || err.message;
        
        switch (status) {
          case 404:
            setError('No account found with this email address.');
            break;
          case 429:
            setError('Too many attempts. Please try again later.');
            break;
          case 400:
            setError(message || 'Invalid email address.');
            break;
          case 500:
            setError('Email service temporarily unavailable. Please try again later.');
            break;
          default:
            setError(message || `Error: ${status}`);
        }
      } else if (err.request) {
        setError('Server not responding. Please check your connection.');
      } else {
        setError(err.message || 'Failed to request secure code.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify secure code and login with token generation
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (!formData.secureCode || formData.secureCode.length !== 6) {
      setError('Please enter the 6-digit secure code');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      console.log('🔐 Verifying secure code for:', formData.email);
      
      const response = await authAPI.verifySecureCode({
        email: formData.email,
        code: formData.secureCode
      });

      console.log('✅ Verification response:', response);
      
      if (response.success) {
        setMessage('Login successful! Generating tokens...');
        
        // Extract user data from response
        let userData = null;
        let token = null;
        let refreshToken = null;
        
        if (response.user) {
          userData = response.user;
        } else if (response.data && response.data.user) {
          userData = response.data.user;
        } else {
          // Create user data from available info
          userData = {
            email: formData.email,
            role: 'admin',
            name: 'System Administrator',
            lastLogin: new Date().toISOString()
          };
        }

        // Extract tokens
        if (response.token) {
          token = response.token;
        }
        
        if (response.refreshToken) {
          refreshToken = response.refreshToken;
        }

        console.log('🔑 Extracted authentication data:', { 
          user: userData.email, 
          role: userData.role,
          tokenLength: token ? token.length : 0
        });

        // Verify admin role
        if (userData.role !== 'admin') {
          throw new Error('Access denied. Admin privileges required.');
        }

        // Store authentication data
        try {
          // Store user data with role-based separation
          localStorage.setItem('userData', JSON.stringify(userData));
          
          if (userData.role === 'admin') {
            localStorage.setItem('adminData', JSON.stringify(userData));
          }
          
          // Store tokens
          if (token) {
            localStorage.setItem('token', token);
            
            // Role-specific token storage
            if (userData.role === 'admin') {
              localStorage.setItem('adminToken', token);
            } else if (userData.role === 'cashier') {
              localStorage.setItem('cashierToken', token);
            }
          }
          
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
          }
          
          // Store token expiry
          const tokenExpiry = new Date();
          tokenExpiry.setHours(tokenExpiry.getHours() + 8); // 8 hours expiry
          localStorage.setItem('tokenExpiry', tokenExpiry.toISOString());
          
          // Set last login time
          localStorage.setItem('lastLogin', new Date().toISOString());
          
          console.log('🎉 Admin authentication completed successfully');
          
          // Set default headers for API calls with token
          if (token) {
            authAPI.setAuthToken(token);
          }
          
          // Add a small delay to ensure storage is processed
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Clear any expired messages
          setExpiredMessage(null);
          
          // Navigate to admin dashboard
          const redirectPath = location.state?.from || '/admin/dashboard';
          navigate(redirectPath, { 
            replace: true,
            state: { 
              loginSuccess: true,
              timestamp: Date.now(),
              adminEmail: userData.email,
              tokenSet: !!token
            }
          });
          
        } catch (storageError) {
          console.error('❌ Storage error:', storageError);
          setError('Failed to save authentication information. Please try again.');
        }
      } else {
        setError(response.message || 'Invalid secure code');
      }
      
    } catch (err) {
      console.error('❌ Code verification error:', err);
      
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data || {};
        const message = errorData.message || err.message;
        
        switch (status) {
          case 400:
            setError(message || 'Invalid or expired code.');
            break;
          case 401:
            setError('Invalid secure code. Please try again.');
            break;
          case 403:
            setError('Account is inactive. Please contact administrator.');
            break;
          case 404:
            setError('No secure code found. Please request a new one.');
            break;
          case 429:
            setError('Too many failed attempts. Please request a new code.');
            break;
          case 500:
            setError('Server error. Please try again later.');
            break;
          default:
            setError(message || `Error: ${status}`);
        }
      } else if (err.request) {
        setError('Server not responding. Please check your connection.');
      } else {
        setError(err.message || 'Failed to verify secure code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // For secure code, only allow numbers and limit to 6 digits
    if (name === 'secureCode') {
      const numericValue = value.replace(/\D/g, '').slice(0, 6);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear errors when user starts typing
    if (error) setError('');
  };

  const handleBackToEmail = () => {
    setStep('email');
    setFormData(prev => ({ ...prev, secureCode: '' }));
    setError('');
    setMessage('');
  };

  const getStepIcon = () => {
    switch (step) {
      case 'email':
        return <Email />;
      case 'code':
        return <Security />;
      default:
        return <AdminPanelSettings />;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'email':
        return 'Admin Portal Access';
      case 'code':
        return 'Enter Secure Code';
      default:
        return 'Admin Portal';
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 'email':
        return 'Enter your email to receive a secure login code';
      case 'code':
        return `Check ${formData.email} for your 6-digit code`;
      default:
        return 'Secure Administrator Access';
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
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          mx: 'auto'
        }}
      >
        {/* Header Section */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography 
            component="h1" 
            variant="h4" 
            sx={{ 
              fontWeight: 'bold',
              color: 'white',
              textShadow: '0 4px 8px rgba(0,0,0,0.3)',
              background: colors.admin.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 1
            }}
          >
            {getStepTitle()}
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: alpha('#fff', 0.8),
              fontWeight: 300
            }}
          >
            {getStepSubtitle()}
          </Typography>
        </Box>

        {/* Session Expired Alert */}
        {expiredMessage && (
          <Slide direction="down" in={!!expiredMessage} mountOnEnter unmountOnExit>
            <Alert 
              severity="info"
              icon={<Info />}
              sx={{ 
                width: '100%', 
                borderRadius: 2,
                border: `1px solid ${alpha('#2196f3', 0.3)}`,
                backgroundColor: alpha('#2196f3', 0.1),
                color: 'white',
                '& .MuiAlert-icon': {
                  color: '#2196f3'
                }
              }} 
              onClose={() => setExpiredMessage(null)}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {expiredMessage}
              </Typography>
            </Alert>
          </Slide>
        )}

        {error && (
          <Alert 
            severity="error"
            icon={<Warning />}
            sx={{ 
              width: '100%', 
              borderRadius: 2,
              border: `1px solid ${alpha('#ef5350', 0.3)}`,
              backgroundColor: alpha('#ef5350', 0.1),
              color: 'white',
              '& .MuiAlert-icon': {
                color: '#ef5350'
              }
            }} 
            onClose={() => setError(null)}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {error}
            </Typography>
          </Alert>
        )}

        {message && (
          <Alert 
            severity="success"
            sx={{ 
              width: '100%', 
              borderRadius: 2,
              border: `1px solid ${alpha('#4caf50', 0.3)}`,
              backgroundColor: alpha('#4caf50', 0.1),
              color: 'white',
              '& .MuiAlert-icon': {
                color: '#4caf50'
              }
            }} 
            onClose={() => setMessage(null)}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {message}
            </Typography>
          </Alert>
        )}

        {/* Login Form */}
        <Paper 
          elevation={8} 
          sx={{ 
            p: 4, 
            borderRadius: 3,
            width: '100%',
            background: `linear-gradient(135deg, ${colors.background.paper} 0%, ${alpha(colors.background.paper, 0.8)} 100%)`,
            border: `1px solid ${alpha(colors.admin.main, 0.2)}`,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80, 
                m: '0 auto 16px',
                background: colors.admin.gradient
              }}
            >
              {loading ? (
                <CircularProgress size={40} color="inherit" />
              ) : (
                getStepIcon()
              )}
            </Avatar>
          </Box>

          {/* Email Step */}
          {step === 'email' && (
            <Box component="form" onSubmit={handleRequestCode}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                autoComplete="email"
                autoFocus
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: alpha('#fff', 0.3),
                    },
                    '&:hover fieldset': {
                      borderColor: colors.admin.light,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: colors.admin.main,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: alpha('#fff', 0.7),
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: colors.admin.light,
                  },
                }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || !formData.email}
                sx={{ 
                  py: 1.5, 
                  borderRadius: 2,
                  background: colors.admin.gradient,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  '&:hover': {
                    background: colors.admin.dark,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 25px ${alpha(colors.admin.main, 0.4)}`,
                  },
                  '&:disabled': {
                    background: alpha(colors.admin.main, 0.5),
                  },
                  transition: 'all 0.3s ease'
                }}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Email />}
              >
                {loading ? 'SENDING CODE...' : 'SEND SECURE CODE'}
              </Button>
            </Box>
          )}

          {/* Code Verification Step */}
          {step === 'code' && (
            <Box component="form" onSubmit={handleVerifyCode}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="secureCode"
                label="6-Digit Secure Code"
                type="text"
                value={formData.secureCode}
                onChange={handleChange}
                disabled={loading}
                autoComplete="one-time-code"
                autoFocus
                inputProps={{
                  maxLength: 6,
                  pattern: '[0-9]*',
                  inputMode: 'numeric'
                }}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: alpha('#fff', 0.3),
                    },
                    '&:hover fieldset': {
                      borderColor: colors.admin.light,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: colors.admin.main,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: alpha('#fff', 0.7),
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: colors.admin.light,
                  },
                }}
              />
              
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block',
                  textAlign: 'center',
                  color: alpha('#fff', 0.6),
                  mb: 3
                }}
              >
                Enter the 6-digit code sent to {formData.email}
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  type="button"
                  variant="outlined"
                  size="large"
                  disabled={loading}
                  onClick={handleBackToEmail}
                  sx={{ 
                    flex: 1,
                    py: 1.5,
                    borderRadius: 2,
                    borderColor: alpha('#fff', 0.3),
                    color: 'white',
                    '&:hover': {
                      borderColor: colors.admin.light,
                      backgroundColor: alpha(colors.admin.light, 0.1),
                    },
                  }}
                  startIcon={<ArrowBack />}
                >
                  BACK
                </Button>
                
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || formData.secureCode.length !== 6}
                  sx={{ 
                    flex: 2,
                    py: 1.5,
                    borderRadius: 2,
                    background: colors.admin.gradient,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    '&:hover': {
                      background: colors.admin.dark,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 25px ${alpha(colors.admin.main, 0.4)}`,
                    },
                    '&:disabled': {
                      background: alpha(colors.admin.main, 0.5),
                    },
                    transition: 'all 0.3s ease'
                  }}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Security />}
                >
                  {loading ? 'VERIFYING...' : 'VERIFY CODE'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>

        {/* Token Info Panel (only show in development) */}
        {process.env.NODE_ENV === 'development' && (
          <Paper 
            elevation={2} 
            sx={{ 
              p: 2, 
              borderRadius: 2,
              width: '100%',
              background: alpha('#1E293B', 0.7),
              border: `1px solid ${alpha(colors.primary.main, 0.3)}`,
              mt: 2
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: alpha('#fff', 0.8),
                display: 'block',
                mb: 1,
                fontWeight: 'bold'
              }}
            >
              {step === 'code' && formData.secureCode && (
                <div>Code entered: {formData.secureCode}</div>
              )}
            </Typography>
          </Paper>
        )}

        {/* Footer Note */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: alpha('#fff', 0.6) }}>
            {step === 'email' 
              ? 'Secure access for authorized administrators only' 
              : 'Codes expire after 15 minutes for security'
            }
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default AdminLogin;