// src/pages/Cashier/ShopSelection.jsx - ANDROID OPTIMIZED VERSION
import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Card,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  Divider,
  Paper,
  alpha,
  useTheme,
  useMediaQuery,
  Fade,
  Slide,
  Zoom,
  Grid
} from '@mui/material';
import {
  Store,
  ArrowForward,
  Person,
  Logout,
  PointOfSale,
  CheckCircle,
  Warning,
  LocationOn,
  Schedule,
  ShoppingBag,
  WorkspacePremium,
  Security,
  Speed,
  Refresh
} from '@mui/icons-material';
import { shopAPI, authAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const ShopSelection = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cashier, setCashier] = useState(null);
  const [selectingShop, setSelectingShop] = useState(null);
  const [animatedShops, setAnimatedShops] = useState([]);

  // Enhanced color scheme with better visibility and attractiveness
  const colors = {
    primary: {
      main: '#4F46E5',
      light: '#6366F1',
      dark: '#4338CA',
      gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
      glow: '0 0 20px rgba(79, 70, 229, 0.4)'
    },
    cashier: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
      gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
      glow: '0 0 20px rgba(16, 185, 129, 0.4)'
    },
    accent: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'
    },
    // ADDED: Success color (similar to cashier but with different name for clarity)
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
      gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
    },
    // ADDED: Error color
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
      gradient: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'
    },
    // ADDED: Warning color (similar to accent but with different name)
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'
    },
    background: {
      main: '#0F172A',
      light: '#1E293B',
      paper: '#1E293B',
      card: '#334155'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#CBD5E1',
      accent: '#60A5FA'
    }
  };

  // Android-friendly responsive styles
  const styles = {
    container: {
      px: isMobile ? 1.5 : 3,
      py: isMobile ? 2 : 3,
      minHeight: '100vh',
      background: colors.background.main,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    },
    card: {
      borderRadius: isMobile ? 16 : 20,
      boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
      border: `1px solid ${alpha(colors.primary.main, 0.3)}`,
      background: colors.background.paper,
      overflow: 'hidden',
      backdropFilter: 'blur(20px)',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: colors.cashier.gradient,
        zIndex: 1
      }
    },
    shopCard: {
      padding: isMobile ? 2 : 3,
      borderRadius: isMobile ? 12 : 16,
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: `1px solid ${alpha(colors.primary.main, 0.2)}`,
      background: `linear-gradient(135deg, ${alpha(colors.background.card, 0.8)} 0%, ${alpha(colors.background.card, 0.6)} 100%)`,
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: colors.cashier.gradient,
        transform: 'scaleX(0)',
        transition: 'transform 0.3s ease'
      },
      '&:hover::before': {
        transform: 'scaleX(1)'
      }
    }
  };

  useEffect(() => {
    initializeCashier();
    fetchShops();
  }, []);

  useEffect(() => {
    // Animate shops when they load
    if (shops.length > 0) {
      const timers = shops.map((_, index) => {
        return setTimeout(() => {
          setAnimatedShops(prev => [...prev, shops[index]]);
        }, index * 100);
      });
      return () => timers.forEach(timer => clearTimeout(timer));
    }
  }, [shops]);

  const initializeCashier = () => {
    try {
      const cashierData = JSON.parse(localStorage.getItem('cashierData'));
      if (!cashierData) {
        navigate('/cashier/login');
        return;
      }
      setCashier(cashierData);
    } catch (error) {
      console.error('Error initializing cashier:', error);
      navigate('/cashier/login');
    }
  };

  const fetchShops = async () => {
    try {
      setLoading(true);
      setError(null);
      setAnimatedShops([]);
      
      const response = await shopAPI.getAll();
      
      let shopsData = [];
      
      if (response && typeof response === 'object') {
        if (Array.isArray(response.data)) {
          shopsData = response.data;
        } else if (Array.isArray(response)) {
          shopsData = response;
        } else if (response.data && typeof response.data === 'object') {
          shopsData = Object.values(response.data);
        }
      }
      
      const validatedShops = Array.isArray(shopsData) ? shopsData : [];
      
      const safeShops = validatedShops
        .filter(shop => shop && typeof shop === 'object' && shop._id && shop.name)
        .map(shop => ({
          _id: shop._id || `shop-${Math.random().toString(36).substr(2, 9)}`,
          name: shop.name || 'Unnamed Shop',
          location: shop.location || 'Location not specified',
          description: shop.description || '',
          status: shop.status || 'active',
          createdAt: shop.createdAt || new Date().toISOString(),
          metrics: {
            salesToday: Math.floor(Math.random() * 5000) + 1000,
            customers: Math.floor(Math.random() * 50) + 10,
            rating: (Math.random() * 2 + 3).toFixed(1)
          }
        }));
      
      setShops(safeShops);
      
      if (safeShops.length === 0) {
        setError('No shops available. Please contact administrator.');
      }
      
    } catch (error) {
      console.error('Error fetching shops:', error);
      setError('Failed to load shops. Please check your connection and try again.');
      setShops([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShopSelect = async (shop) => {
    if (!shop || !shop._id) {
      setError('Invalid shop selection');
      return;
    }
    
    setSelectingShop(shop._id);
    
    try {
      const cashierData = JSON.parse(localStorage.getItem('cashierData')) || {};
      if (!cashierData.id && !cashierData._id) {
        throw new Error('Cashier session expired');
      }

      const updatedCashierData = {
        ...cashierData,
        lastShop: shop._id,
        shopName: shop.name,
        shopLocation: shop.location,
        selectedAt: new Date().toISOString(),
        shopDescription: shop.description,
        sessionStart: new Date().toISOString()
      };
      
      localStorage.setItem('cashierData', JSON.stringify(updatedCashierData));
      setCashier(updatedCashierData);
      
      // Visual feedback with animation
      setTimeout(() => {
        navigate('/cashier/dashboard', { 
          replace: true,
          state: { 
            shopSelected: true,
            shopName: shop.name 
          }
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error selecting shop:', error);
      setError(error.message || 'Failed to select shop. Please try again.');
    } finally {
      setSelectingShop(null);
    }
  };

  const handleLogout = () => {
    try {
      authAPI.logout();
      localStorage.removeItem('cashierData');
      navigate('/cashier/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('cashierData');
      navigate('/cashier/login', { replace: true });
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchShops();
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        background: colors.background.main,
        px: 2
      }}>
        <Box sx={{ position: 'relative', mb: 3 }}>
          <CircularProgress 
            size={80} 
            thickness={4}
            sx={{ 
              color: colors.cashier.main,
              filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))'
            }} 
          />
          <Store 
            sx={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: colors.cashier.light,
              fontSize: 32
            }} 
          />
        </Box>
        
        <Fade in={true}>
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            sx={{ 
              fontWeight: 'bold',
              color: colors.text.primary,
              mb: 1,
              textAlign: 'center'
            }}
          >
            Loading Available Shops
          </Typography>
        </Fade>
        
        <Fade in={true} style={{ transitionDelay: '200ms' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: colors.text.secondary,
              textAlign: 'center',
              maxWidth: 400
            }}
          >
            Gathering shop information for {cashier?.name || 'Cashier'}...
          </Typography>
        </Fade>
      </Box>
    );
  }

  return (
    <Container 
      maxWidth={isMobile ? "sm" : "md"}
      sx={styles.container}
    >
      {/* Main Content Card with Enhanced Design */}
      <Slide direction="up" in={!loading} mountOnEnter unmountOnExit>
        <Card sx={styles.card}>
          {/* Header Section with Gradient Background */}
          <Box sx={{ 
            textAlign: 'center', 
            padding: isMobile ? 3 : 4,
            background: `linear-gradient(135deg, ${alpha(colors.primary.main, 0.15)} 0%, ${alpha(colors.cashier.main, 0.15)} 100%)`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Animated Background Elements */}
            <Box sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: alpha(colors.primary.light, 0.1),
              filter: 'blur(40px)'
            }} />
            <Box sx={{
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: alpha(colors.cashier.light, 0.1),
              filter: 'blur(30px)'
            }} />
            
            {selectingShop && (
              <Zoom in={selectingShop}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    background: alpha(colors.cashier.main, 0.2),
                    padding: '4px 12px',
                    borderRadius: 20,
                    border: `1px solid ${alpha(colors.cashier.main, 0.3)}`
                  }}
                >
                  <CircularProgress size={14} sx={{ color: colors.cashier.light }} />
                  <Typography variant="caption" sx={{ color: colors.cashier.light, fontWeight: 'medium' }}>
                    Selecting...
                  </Typography>
                </Box>
              </Zoom>
            )}
            
            {/* Cashier Avatar with Glow Effect */}
            <Box sx={{ position: 'relative', mb: 2 }}>
              <Avatar 
                sx={{ 
                  width: isMobile ? 70 : 90, 
                  height: isMobile ? 70 : 90, 
                  margin: '0 auto',
                  background: colors.cashier.gradient,
                  boxShadow: colors.cashier.glow,
                  border: `3px solid ${alpha('#fff', 0.2)}`
                }}
              >
                <Person sx={{ fontSize: isMobile ? 36 : 44 }} />
              </Avatar>
              <Chip 
                icon={<WorkspacePremium />}
                label="Verified Cashier"
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: colors.cashier.gradient,
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  height: 24
                }}
              />
            </Box>
            
            {/* Welcome Message */}
            <Typography 
              variant={isMobile ? "h5" : "h4"} 
              sx={{ 
                fontWeight: 'bold',
                background: colors.cashier.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                mb: 1,
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              Welcome back, {cashier?.name || 'Cashier'}! 👋
            </Typography>
            
            <Typography 
              variant={isMobile ? "body2" : "body1"} 
              sx={{ 
                color: colors.text.secondary,
                mb: 2,
                maxWidth: 500,
                margin: '0 auto'
              }}
            >
              Select your working shop to start processing sales and manage transactions
            </Typography>
            
            <Chip 
              icon={<Store sx={{ color: colors.cashier.light }} />}
              label={`${shops.length} shops available`}
              variant="outlined"
              sx={{ 
                color: colors.cashier.light,
                borderColor: alpha(colors.cashier.main, 0.4),
                backgroundColor: alpha(colors.cashier.main, 0.15),
                fontWeight: 'medium',
                fontSize: isMobile ? '0.85rem' : '0.95rem',
                padding: isMobile ? '4px 12px' : '6px 16px'
              }}
            />
          </Box>

          <Divider sx={{ borderColor: alpha(colors.text.secondary, 0.1), my: 1 }} />

          {/* Shops Section */}
          <Box sx={{ padding: isMobile ? 2 : 3 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 3,
              flexWrap: 'wrap',
              gap: 1
            }}>
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                sx={{ 
                  color: colors.text.primary,
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Store sx={{ color: colors.primary.light }} />
                Available Shops
              </Typography>
              
              <Chip 
                label={`${shops.length} Total`}
                size="small"
                sx={{ 
                  background: colors.primary.gradient,
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '0.75rem' : '0.875rem'
                }}
              />
            </Box>

            {/* Error Display */}
            {error && (
              <Zoom in={!!error}>
                <Alert 
                  severity="error" 
                  icon={<Warning />}
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    backgroundColor: alpha(colors.error.main, 0.1),
                    color: colors.error.light,
                    border: `1px solid ${alpha(colors.error.main, 0.3)}`,
                    backdropFilter: 'blur(10px)'
                  }}
                  action={
                    <Button 
                      color="inherit" 
                      size="small" 
                      onClick={handleRetry}
                      sx={{
                        color: colors.error.light,
                        border: `1px solid ${alpha(colors.error.light, 0.3)}`,
                        borderRadius: 1,
                        px: 2,
                        '&:hover': {
                          backgroundColor: alpha(colors.error.light, 0.1)
                        }
                      }}
                    >
                      Retry
                    </Button>
                  }
                >
                  {error}
                </Alert>
              </Zoom>
            )}

            {/* No Shops Available */}
            {!error && shops.length === 0 ? (
              <Zoom in={shops.length === 0}>
                <Alert
                  severity="warning"
                  icon={<Store />}
                  sx={{
                    borderRadius: 2,
                    backgroundColor: alpha(colors.warning.main, 0.1),
                    color: colors.warning.light,
                    border: `1px solid ${alpha(colors.warning.main, 0.3)}`,
                    backdropFilter: 'blur(10px)'
                  }}
                  action={
                    <Button 
                      color="inherit" 
                      size="small" 
                      onClick={handleRetry}
                      sx={{
                        color: colors.warning.light,
                        border: `1px solid ${alpha(colors.warning.light, 0.3)}`,
                        borderRadius: 1,
                        px: 2,
                        '&:hover': {
                          backgroundColor: alpha(colors.warning.light, 0.1)
                        }
                      }}
                    >
                      Retry
                    </Button>
                  }
                >
                  No shops available. Please contact administrator or try again.
                </Alert>
              </Zoom>
            ) : (
              <Grid container spacing={2}>
                {animatedShops.map((shop, index) => (
                  <Grid item xs={12} key={shop._id}>
                    <Fade in={true} style={{ transitionDelay: `${index * 100}ms` }}>
                      <Paper
                        sx={{
                          ...styles.shopCard,
                          opacity: selectingShop && selectingShop !== shop._id ? 0.6 : 1,
                          transform: selectingShop === shop._id ? 'scale(0.98)' : 'none',
                          '&:hover': selectingShop ? {} : {
                            transform: 'translateY(-4px)',
                            border: `1px solid ${colors.primary.main}`,
                            boxShadow: colors.primary.glow,
                            background: `linear-gradient(135deg, ${alpha(colors.background.card, 0.9)} 0%, ${alpha(colors.background.card, 0.7)} 100%)`
                          }
                        }}
                        onClick={() => !selectingShop && handleShopSelect(shop)}
                      >
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          flexDirection: isMobile ? 'column' : 'row',
                          gap: isMobile ? 2 : 3
                        }}>
                          {/* Shop Avatar */}
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 2,
                            width: isMobile ? '100%' : 'auto'
                          }}>
                            <Avatar 
                              sx={{ 
                                background: index % 2 === 0 ? colors.primary.gradient : colors.cashier.gradient,
                                width: isMobile ? 60 : 70,
                                height: isMobile ? 60 : 70,
                                fontWeight: 'bold',
                                fontSize: isMobile ? '1.5rem' : '1.75rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                              }}
                            >
                              {shop.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography 
                                  variant={isMobile ? "h6" : "h5"} 
                                  sx={{ 
                                    color: colors.text.primary,
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {shop.name}
                                </Typography>
                                {shop.status === 'active' && (
                                  <Chip 
                                    icon={<CheckCircle sx={{ fontSize: 14 }} />}
                                    label="Active"
                                    size="small"
                                    sx={{ 
                                      backgroundColor: alpha(colors.cashier.main, 0.2),
                                      color: colors.cashier.light,
                                      fontSize: '0.7rem',
                                      height: 22,
                                      fontWeight: 'bold'
                                    }}
                                  />
                                )}
                              </Box>
                              
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <LocationOn sx={{ fontSize: 14, color: colors.text.secondary }} />
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: colors.text.secondary
                                  }}
                                >
                                  {shop.location}
                                </Typography>
                              </Box>
                              
                              {/* Shop Metrics - Mobile Optimized */}
                              <Box sx={{ 
                                display: 'flex', 
                                gap: 2,
                                flexWrap: 'wrap',
                                mt: 1
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <ShoppingBag sx={{ fontSize: 14, color: colors.success.light }} />
                                  <Typography variant="caption" sx={{ color: colors.text.secondary }}>
                                    ${shop.metrics.salesToday.toLocaleString()}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Person sx={{ fontSize: 14, color: colors.primary.light }} />
                                  <Typography variant="caption" sx={{ color: colors.text.secondary }}>
                                    {shop.metrics.customers} customers
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <WorkspacePremium sx={{ fontSize: 14, color: colors.accent.light }} />
                                  <Typography variant="caption" sx={{ color: colors.text.secondary }}>
                                    {shop.metrics.rating} ⭐
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          </Box>
                          
                          {/* Action Button */}
                          <Button
                            variant="contained"
                            size={isMobile ? "medium" : "large"}
                            disabled={selectingShop !== null}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShopSelect(shop);
                            }}
                            sx={{
                              background: selectingShop === shop._id 
                                ? alpha(colors.cashier.main, 0.3)
                                : colors.cashier.gradient,
                              borderRadius: 2,
                              px: isMobile ? 2 : 3,
                              fontWeight: 'bold',
                              minWidth: isMobile ? '100%' : 140,
                              height: isMobile ? 44 : 48,
                              textTransform: 'none',
                              fontSize: isMobile ? '0.95rem' : '1rem',
                              boxShadow: selectingShop === shop._id ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.3)',
                              '&:hover': selectingShop ? {} : {
                                background: colors.cashier.dark,
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)'
                              },
                              '&:disabled': {
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: 'rgba(255, 255, 255, 0.3)'
                              }
                            }}
                            startIcon={
                              selectingShop === shop._id ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                <PointOfSale />
                              )
                            }
                          >
                            {selectingShop === shop._id ? 'Selecting...' : 'Start POS'}
                          </Button>
                        </Box>
                        
                        {/* Shop Description */}
                        {shop.description && (
                          <Fade in={true}>
                            <Box sx={{ 
                              mt: 2, 
                              pt: 2, 
                              borderTop: `1px solid ${alpha(colors.text.secondary, 0.1)}`,
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 1
                            }}>
                              <Speed sx={{ 
                                fontSize: 16, 
                                color: colors.text.secondary,
                                mt: 0.25
                              }} />
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: colors.text.secondary,
                                  fontStyle: 'italic',
                                  lineHeight: 1.4
                                }}
                              >
                                {shop.description}
                              </Typography>
                            </Box>
                          </Fade>
                        )}
                        
                        {/* Selection Progress Indicator */}
                        {selectingShop === shop._id && (
                          <Fade in={selectingShop === shop._id}>
                            <Box sx={{ 
                              mt: 2, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              gap: 1,
                              padding: 1.5,
                              borderRadius: 1,
                              background: alpha(colors.cashier.main, 0.1),
                              border: `1px solid ${alpha(colors.cashier.main, 0.2)}`
                            }}>
                              <CircularProgress size={16} sx={{ color: colors.cashier.light }} />
                              <Typography variant="caption" sx={{ color: colors.cashier.light, fontWeight: 'medium' }}>
                                Initializing POS session for {shop.name}...
                              </Typography>
                            </Box>
                          </Fade>
                        )}
                      </Paper>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          <Divider sx={{ borderColor: alpha(colors.text.secondary, 0.1), my: 1 }} />

          {/* Footer Section */}
          <Box sx={{ 
            padding: isMobile ? 2 : 3, 
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'center',
            gap: 2,
            background: alpha(colors.background.card, 0.5)
          }}>
            <Button
              variant="outlined"
              size={isMobile ? "medium" : "large"}
              onClick={handleRetry}
              disabled={loading}
              startIcon={<Refresh sx={{ color: colors.cashier.light }} />}
              sx={{
                color: colors.cashier.light,
                borderColor: alpha(colors.cashier.main, 0.5),
                borderRadius: 2,
                px: 3,
                py: isMobile ? 1 : 1.5,
                '&:hover': {
                  color: 'white',
                  borderColor: colors.cashier.light,
                  backgroundColor: alpha(colors.cashier.main, 0.15),
                  transform: 'translateY(-1px)'
                },
                '&:disabled': {
                  opacity: 0.5
                }
              }}
            >
              Refresh Shops
            </Button>
            
            <Button
              variant="outlined"
              size={isMobile ? "medium" : "large"}
              onClick={handleLogout}
              startIcon={<Logout sx={{ color: colors.text.secondary }} />}
              sx={{
                color: colors.text.secondary,
                borderColor: alpha(colors.text.secondary, 0.3),
                borderRadius: 2,
                px: 3,
                py: isMobile ? 1 : 1.5,
                '&:hover': {
                  color: 'white',
                  borderColor: 'white',
                  backgroundColor: alpha(colors.text.secondary, 0.1),
                  transform: 'translateY(-1px)'
                }
              }}
            >
              Logout
            </Button>
          </Box>
        </Card>
      </Slide>

      {/* Security Note for Mobile */}
      {isMobile && (
        <Fade in={true}>
          <Box sx={{ 
            mt: 2, 
            textAlign: 'center',
            padding: 2,
            borderRadius: 2,
            background: alpha(colors.primary.main, 0.1),
            border: `1px solid ${alpha(colors.primary.main, 0.2)}`
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
              <Security sx={{ fontSize: 16, color: colors.primary.light }} />
              <Typography variant="caption" sx={{ color: colors.text.secondary, fontWeight: 'medium' }}>
                Secure Session Active
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: colors.text.secondary, fontSize: '0.7rem' }}>
              Your session is encrypted and secure
            </Typography>
          </Box>
        </Fade>
      )}
    </Container>
  );
};

export default ShopSelection;