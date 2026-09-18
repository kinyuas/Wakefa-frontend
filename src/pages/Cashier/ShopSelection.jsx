// src/pages/Cashier/ShopSelection.jsx — Clean rewrite (dedupe + auto-select single shop)
import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Box, Card, Button, Typography, CircularProgress,
  Alert, Avatar, Chip, Divider, Paper, alpha, useTheme, useMediaQuery, Fade
} from '@mui/material';
import {
  Store, Person, Logout, PointOfSale, CheckCircle,
  Warning, LocationOn, WorkspacePremium, Refresh
} from '@mui/icons-material';
import { shopAPI, authAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

// ============================================================
// THEME COLORS
// ============================================================
const C = {
  primary: { main: '#4F46E5', light: '#818CF8', gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' },
  cashier: { main: '#10B981', light: '#34D399', dark: '#059669', gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)' },
  error:   { main: '#EF4444', light: '#F87171' },
  warning: { main: '#F59E0B', light: '#FBBF24' },
  bg:      { main: '#0F172A', paper: '#1E293B', card: '#334155' },
  text:    { primary: '#FFFFFF', secondary: '#CBD5E1' }
};

const ShopSelection = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cashier, setCashier] = useState(null);
  const [selectingId, setSelectingId] = useState(null);
  const [autoSelected, setAutoSelected] = useState(false);

  // 🔒 Guard so auto-select doesn't fire twice in StrictMode
  const autoSelectFired = useRef(false);

  // ============================================================
  // INIT
  // ============================================================
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cashierData');
      if (!raw) return navigate('/cashier/login');
      const data = JSON.parse(raw);
      if (!data?._id && !data?.id) return navigate('/cashier/login');
      setCashier(data);
    } catch {
      navigate('/cashier/login');
    }
  }, [navigate]);

  // ============================================================
  // FETCH SHOPS (dedupe by _id)
  // ============================================================
  const fetchShops = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await shopAPI.getAll();

      // Normalize response → array
      let raw = [];
      if (Array.isArray(response)) raw = response;
      else if (Array.isArray(response?.data)) raw = response.data;
      else if (response?.data && typeof response.data === 'object') raw = Object.values(response.data);
      else if (Array.isArray(response?.shops)) raw = response.shops;

      // Clean + dedupe strictly by _id
      const map = new Map();
      for (const s of raw) {
        if (!s || typeof s !== 'object' || !s._id || !s.name) continue;
        const id = String(s._id);
        if (map.has(id)) continue;                // ← eliminates duplicates entirely
        map.set(id, {
          _id: id,
          name: String(s.name).trim(),
          location: String(s.location || 'Location not specified').trim(),
          description: String(s.description || '').trim(),
          status: s.status || 'active',
          createdAt: s.createdAt || new Date().toISOString()
        });
      }

      const unique = Array.from(map.values());
      // Sort alphabetically for a predictable UI
      unique.sort((a, b) => a.name.localeCompare(b.name));

      setShops(unique);

      if (unique.length === 0) {
        setError('No shops available. Please contact your administrator.');
      }
    } catch (err) {
      console.error('❌ Failed to load shops:', err);
      setError('Failed to load shops. Please check your connection and try again.');
      setShops([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShops(); }, []);

  // ============================================================
  // AUTO-SELECT when there is exactly ONE shop
  // ============================================================
  useEffect(() => {
    if (loading) return;
    if (shops.length !== 1) return;
    if (autoSelectFired.current) return;
    if (!cashier) return;

    autoSelectFired.current = true;
    setAutoSelected(true);
    console.log('🎯 Only one shop — auto-selecting:', shops[0].name);

    // Short delay so the user sees the "auto-selecting" state
    setTimeout(() => handleShopSelect(shops[0], { silent: true }), 900);
  }, [loading, shops, cashier]);

  // ============================================================
  // SELECT SHOP
  // ============================================================
  const handleShopSelect = async (shop, { silent = false } = {}) => {
    if (!shop?._id || selectingId) return;

    setSelectingId(shop._id);
    try {
      const raw = localStorage.getItem('cashierData');
      const cashierData = raw ? JSON.parse(raw) : {};
      if (!cashierData?._id && !cashierData?.id) throw new Error('Session expired');

      const updated = {
        ...cashierData,
        lastShop: shop._id,
        shopName: shop.name,
        shopLocation: shop.location,
        shopDescription: shop.description,
        selectedAt: new Date().toISOString(),
        sessionStart: new Date().toISOString()
      };

      localStorage.setItem('cashierData', JSON.stringify(updated));
      setCashier(updated);

      if (!silent) {
        // Small UX delay for the "Selecting…" spinner
        setTimeout(() => navigate('/cashier/dashboard', { replace: true }), 500);
      } else {
        navigate('/cashier/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Error selecting shop:', err);
      setError(err.message || 'Failed to select shop. Please try again.');
      setSelectingId(null);
    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================
  const handleLogout = () => {
    try { authAPI.logout(); } catch {}
    localStorage.removeItem('cashierData');
    localStorage.removeItem('cashierToken');
    localStorage.removeItem('token');
    navigate('/cashier/login', { replace: true });
  };

  // ============================================================
  // LOADING SCREEN
  // ============================================================
  if (loading) {
    return (
      <Box sx={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', flexDirection: 'column',
        background: C.bg.main, px: 2, gap: 2
      }}>
        <Box sx={{ position: 'relative' }}>
          <CircularProgress size={70} thickness={4} sx={{ color: C.cashier.main }} />
          <Store sx={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            color: C.cashier.light, fontSize: 28
          }} />
        </Box>
        <Typography variant="h6" sx={{ color: C.text.primary, fontWeight: 600 }}>
          Loading shops…
        </Typography>
        <Typography variant="body2" sx={{ color: C.text.secondary }}>
          Preparing your workspace{cashier?.name ? `, ${cashier.name}` : ''}
        </Typography>
      </Box>
    );
  }

  // ============================================================
  // AUTO-SELECT SCREEN (single shop)
  // ============================================================
  if (autoSelected && shops.length === 1) {
    const shop = shops[0];
    return (
      <Box sx={{
        minHeight: '100vh', background: C.bg.main,
        display: 'flex', justifyContent: 'center', alignItems: 'center', px: 2
      }}>
        <Card sx={{
          maxWidth: 420, width: '100%', p: 4, textAlign: 'center',
          borderRadius: 4, background: C.bg.paper,
          border: `1px solid ${alpha(C.cashier.main, 0.3)}`,
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}>
          <Avatar sx={{
            width: 80, height: 80, mx: 'auto', mb: 2,
            background: C.cashier.gradient, boxShadow: `0 0 30px ${alpha(C.cashier.main, 0.4)}`
          }}>
            <Store sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
            Opening {shop.name}
          </Typography>
          <Typography variant="body2" sx={{ color: C.text.secondary, mb: 3 }}>
            You have one shop, so we're taking you straight in.
          </Typography>
          <CircularProgress size={28} sx={{ color: C.cashier.light }} />
        </Card>
      </Box>
    );
  }

  // ============================================================
  // MAIN UI
  // ============================================================
  return (
    <Container maxWidth={isMobile ? 'sm' : 'md'} sx={{
      minHeight: '100vh', background: C.bg.main,
      px: isMobile ? 2 : 3, py: isMobile ? 3 : 4,
      display: 'flex', flexDirection: 'column', justifyContent: 'center'
    }}>
      <Card sx={{
        borderRadius: isMobile ? 3 : 4,
        background: C.bg.paper,
        border: `1px solid ${alpha(C.primary.main, 0.3)}`,
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        position: 'relative',
        '&::before': {
          content: '""', position: 'absolute', top: 0, left: 0, right: 0,
          height: 4, background: C.cashier.gradient
        }
      }}>
        {/* ---------- HEADER ---------- */}
        <Box sx={{
          textAlign: 'center', px: isMobile ? 2 : 4, pt: isMobile ? 3 : 4, pb: 2,
          background: `linear-gradient(135deg, ${alpha(C.primary.main, 0.15)} 0%, ${alpha(C.cashier.main, 0.15)} 100%)`
        }}>
          <Avatar sx={{
            width: isMobile ? 64 : 76, height: isMobile ? 64 : 76,
            mx: 'auto', mb: 1.5, background: C.cashier.gradient,
            boxShadow: `0 0 24px ${alpha(C.cashier.main, 0.35)}`
          }}>
            <Person sx={{ fontSize: isMobile ? 32 : 38 }} />
          </Avatar>
          <Chip
            icon={<WorkspacePremium sx={{ fontSize: 14 }} />}
            label="Verified Cashier"
            size="small"
            sx={{
              background: C.cashier.gradient, color: '#fff',
              fontWeight: 700, fontSize: '0.7rem', mb: 1.5, height: 22
            }}
          />
          <Typography variant={isMobile ? 'h6' : 'h5'} sx={{
            color: '#fff', fontWeight: 800, mb: 0.5
          }}>
            Welcome back, {cashier?.name || 'Cashier'} 👋
          </Typography>
          <Typography variant="body2" sx={{
            color: C.text.secondary, mb: 1.5,
            maxWidth: 460, mx: 'auto'
          }}>
            {shops.length === 1
              ? 'Taking you to your shop…'
              : 'Select a shop to start processing sales.'}
          </Typography>
          <Chip
            icon={<Store sx={{ fontSize: 14, color: C.cashier.light }} />}
            label={`${shops.length} ${shops.length === 1 ? 'shop' : 'shops'} available`}
            variant="outlined"
            sx={{
              color: C.cashier.light,
              borderColor: alpha(C.cashier.main, 0.4),
              backgroundColor: alpha(C.cashier.main, 0.12),
              fontWeight: 600
            }}
          />
        </Box>

        <Divider sx={{ borderColor: alpha(C.text.secondary, 0.1), my: 0 }} />

        {/* ---------- BODY ---------- */}
        <Box sx={{ p: isMobile ? 2 : 3 }}>
          {/* Error */}
          {error && (
            <Fade in>
              <Alert
                severity="error"
                icon={<Warning />}
                sx={{
                  mb: 3, borderRadius: 2,
                  backgroundColor: alpha(C.error.main, 0.1),
                  color: C.error.light,
                  border: `1px solid ${alpha(C.error.main, 0.3)}`,
                  '& .MuiAlert-icon': { color: C.error.light }
                }}
                action={
                  <Button size="small" onClick={fetchShops}
                    sx={{ color: C.error.light, border: `1px solid ${alpha(C.error.light, 0.3)}` }}>
                    Retry
                  </Button>
                }
              >
                {error}
              </Alert>
            </Fade>
          )}

          {/* Empty state */}
          {!error && shops.length === 0 && (
            <Alert
              severity="warning"
              icon={<Store />}
              sx={{
                borderRadius: 2,
                backgroundColor: alpha(C.warning.main, 0.1),
                color: C.warning.light,
                border: `1px solid ${alpha(C.warning.main, 0.3)}`,
                '& .MuiAlert-icon': { color: C.warning.light }
              }}
              action={
                <Button size="small" onClick={fetchShops}
                  sx={{ color: C.warning.light, border: `1px solid ${alpha(C.warning.light, 0.3)}` }}>
                  Retry
                </Button>
              }
            >
              No shops available. Please contact your administrator.
            </Alert>
          )}

          {/* Shops list */}
          {shops.length > 0 && (
            <>
              <Box sx={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', mb: 2
              }}>
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} sx={{
                  color: '#fff', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 1
                }}>
                  <Store sx={{ color: C.primary.light, fontSize: 20 }} />
                  Available Shops
                </Typography>
                <Chip
                  label={`${shops.length} Total`}
                  size="small"
                  sx={{
                    background: C.primary.gradient, color: '#fff',
                    fontWeight: 700, fontSize: '0.75rem'
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {shops.map((shop, i) => {
                  const isSelecting = selectingId === shop._id;
                  const disabled = selectingId && !isSelecting;

                  return (
                    <Paper
                      key={shop._id}
                      elevation={0}
                      onClick={() => !selectingId && handleShopSelect(shop)}
                      sx={{
                        p: isMobile ? 1.8 : 2.4,
                        borderRadius: 2.5,
                        cursor: selectingId ? 'default' : 'pointer',
                        opacity: disabled ? 0.55 : 1,
                        transform: isSelecting ? 'scale(0.99)' : 'none',
                        border: `1px solid ${alpha(C.primary.main, isSelecting ? 0.6 : 0.2)}`,
                        background: isSelecting
                          ? alpha(C.cashier.main, 0.12)
                          : `linear-gradient(135deg, ${alpha(C.bg.card, 0.85)} 0%, ${alpha(C.bg.card, 0.65)} 100%)`,
                        transition: 'all .25s cubic-bezier(.4,0,.2,1)',
                        '&:hover': selectingId ? {} : {
                          transform: 'translateY(-3px)',
                          borderColor: C.primary.main,
                          boxShadow: `0 8px 24px ${alpha(C.primary.main, 0.25)}`
                        }
                      }}
                    >
                      <Box sx={{
                        display: 'flex', alignItems: 'center',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: isMobile ? 1.5 : 2
                      }}>
                        {/* Left: avatar + name */}
                        <Box sx={{
                          display: 'flex', alignItems: 'center', gap: 1.6,
                          width: isMobile ? '100%' : 'auto', flex: 1, minWidth: 0
                        }}>
                          <Avatar sx={{
                            background: i % 2 === 0 ? C.primary.gradient : C.cashier.gradient,
                            width: isMobile ? 48 : 56, height: isMobile ? 48 : 56,
                            fontWeight: 800, fontSize: isMobile ? '1.25rem' : '1.5rem',
                            flexShrink: 0
                          }}>
                            {shop.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{
                              display: 'flex', alignItems: 'center',
                              gap: 1, flexWrap: 'wrap', mb: 0.3
                            }}>
                              <Typography
                                variant={isMobile ? 'subtitle1' : 'h6'}
                                sx={{
                                  color: '#fff', fontWeight: 700,
                                  whiteSpace: 'nowrap', overflow: 'hidden',
                                  textOverflow: 'ellipsis', maxWidth: '100%'
                                }}
                              >
                                {shop.name}
                              </Typography>
                              {shop.status === 'active' && (
                                <Chip
                                  icon={<CheckCircle sx={{ fontSize: 12 }} />}
                                  label="Active"
                                  size="small"
                                  sx={{
                                    backgroundColor: alpha(C.cashier.main, 0.2),
                                    color: C.cashier.light,
                                    fontWeight: 700, fontSize: '0.65rem', height: 20
                                  }}
                                />
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                              <LocationOn sx={{ fontSize: 13, color: C.text.secondary }} />
                              <Typography variant="body2" sx={{
                                color: C.text.secondary, fontSize: '0.8rem'
                              }}>
                                {shop.location}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Right: action button */}
                        <Button
                          variant="contained"
                          disabled={Boolean(selectingId)}
                          onClick={(e) => { e.stopPropagation(); handleShopSelect(shop); }}
                          startIcon={isSelecting ? <CircularProgress size={16} color="inherit" /> : <PointOfSale />}
                          sx={{
                            background: isSelecting
                              ? alpha(C.cashier.main, 0.3)
                              : C.cashier.gradient,
                            borderRadius: 2,
                            px: 2.5,
                            fontWeight: 700,
                            textTransform: 'none',
                            minWidth: isMobile ? '100%' : 130,
                            height: isMobile ? 42 : 44,
                            boxShadow: isSelecting ? 'none' : `0 4px 12px ${alpha(C.cashier.main, 0.3)}`,
                            '&:hover': selectingId ? {} : {
                              background: C.cashier.dark,
                              transform: 'translateY(-1px)',
                              boxShadow: `0 6px 18px ${alpha(C.cashier.main, 0.4)}`
                            },
                            '&:disabled': {
                              background: 'rgba(255,255,255,0.08)',
                              color: 'rgba(255,255,255,0.4)'
                            }
                          }}
                        >
                          {isSelecting ? 'Selecting…' : 'Start POS'}
                        </Button>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </>
          )}
        </Box>

        <Divider sx={{ borderColor: alpha(C.text.secondary, 0.1) }} />

        {/* ---------- FOOTER ---------- */}
        <Box sx={{
          p: isMobile ? 2 : 2.5,
          display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'center', gap: 1.5,
          background: alpha(C.bg.card, 0.5)
        }}>
          <Button
            variant="outlined"
            onClick={fetchShops}
            disabled={loading}
            startIcon={<Refresh />}
            sx={{
              color: C.cashier.light,
              borderColor: alpha(C.cashier.main, 0.5),
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                borderColor: C.cashier.light,
                backgroundColor: alpha(C.cashier.main, 0.12)
              }
            }}
          >
            Refresh Shops
          </Button>
          <Button
            variant="outlined"
            onClick={handleLogout}
            startIcon={<Logout />}
            sx={{
              color: C.text.secondary,
              borderColor: alpha(C.text.secondary, 0.3),
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                color: '#fff',
                borderColor: '#fff',
                backgroundColor: alpha(C.text.secondary, 0.1)
              }
            }}
          >
            Logout
          </Button>
        </Box>
      </Card>
    </Container>
  );
};

export default ShopSelection;