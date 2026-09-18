// src/pages/Cashier/CashierPOS.jsx
// Products grid + search + cart.
// Renders in 4 modes:
//   • Desktop left column  → hideCart=true       → products only
//   • Desktop right column → hideProducts=true   → cart only
//   • Mobile Products tab  → isMobile + hideCart → products only
//   • Mobile Cart tab      → isMobile + hideProducts → cart only
import React, { useState, useMemo } from 'react';
import {
  Card, Row, Col, Input, Button, Empty, Tag, Typography, Badge,
  Space, InputNumber, Popconfirm
} from 'antd';
import {
  ShoppingOutlined, ShoppingCartOutlined, SearchOutlined, PlusOutlined,
  DeleteOutlined, ClearOutlined, CloseOutlined, ThunderboltOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Search } = Input;

// ------------------------------------------------------------
// Local formatter (kept inline — no shared utils file needed)
// ------------------------------------------------------------
const formatCurrency = (n) =>
  `KES ${Number(n || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;

const CashierPOS = ({
  products = [],
  cart = [],
  totals = {},
  loading = {},
  isMobile = false,
  hideProducts = false,
  hideCart = false,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  onCheckout
}) => {
  const [search, setSearch] = useState('');

  // ------------------------------------------------------------
  // Filter products by search term
  // ------------------------------------------------------------
  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  // ------------------------------------------------------------
  // Products grid (shared across all modes)
  // ------------------------------------------------------------
  const productsGrid = (
    <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
      {filtered.length === 0 ? (
        <Empty description="No products" style={{ padding: '40px 0' }} />
      ) : (
        <Row gutter={[6, 6]}>
          {filtered.map(p => {
            const lowStock = p.currentStock <= (p.minStockLevel || 0);
            const out = p.currentStock <= 0;
            return (
              <Col xs={12} sm={12} md={8} lg={6} xl={4} key={p._id}>
                <Card
                  hoverable
                  onClick={() => !out && addToCart?.(p, 1)}
                  style={{
                    borderRadius: 8,
                    height: isMobile ? 130 : 140,
                    border: out
                      ? '1px solid #fecaca'
                      : lowStock
                        ? '1px solid #fed7aa'
                        : '1px solid #e2e8f0',
                    cursor: out ? 'not-allowed' : 'pointer',
                    opacity: out ? 0.6 : 1
                  }}
                  bodyStyle={{
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                  }}
                >
                  <Text
                    strong
                    ellipsis={{ rows: 2 }}
                    style={{ fontSize: 12, lineHeight: 1.2, marginBottom: 4 }}
                  >
                    {p.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {p.category || '—'}
                  </Text>
                  <div style={{ marginTop: 'auto' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6
                      }}
                    >
                      <Text strong style={{ color: '#2563eb', fontSize: 12 }}>
                        {formatCurrency(p.minSellingPrice)}
                      </Text>
                      <Tag
                        color={out ? 'red' : lowStock ? 'orange' : 'green'}
                        style={{ margin: 0, fontSize: 10 }}
                      >
                        {p.currentStock}
                      </Tag>
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      block
                      icon={<PlusOutlined />}
                      disabled={out}
                      style={{ borderRadius: 6, fontSize: 11, height: 26 }}
                    >
                      Add
                    </Button>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );

  // ------------------------------------------------------------
  // Cart panel (shared across all modes)
  // ------------------------------------------------------------
  const cartPanel = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 8
      }}
    >
      {/* Cart header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8
        }}
      >
        <Space>
          <ShoppingCartOutlined />
          <Text strong>Cart</Text>
          <Badge count={cart.length} showZero color="#10b981" />
        </Space>
        {cart.length > 0 && (
          <Popconfirm
            title="Clear cart?"
            onConfirm={clearCart}
            okText="Clear"
            okType="danger"
          >
            <Button size="small" danger icon={<ClearOutlined />}>
              Clear
            </Button>
          </Popconfirm>
        )}
      </div>

      {/* Cart items (scrollable) */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 8 }}>
        {cart.length === 0 ? (
          <Empty description="Cart is empty" style={{ marginTop: 40 }} />
        ) : (
          cart.map(item => (
            <div
              key={item.productId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: 8,
                marginBottom: 4,
                background: '#fff',
                borderRadius: 6,
                border: '1px solid #f1f5f9'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
                  {item.name}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {formatCurrency(item.price)} × {item.quantity}
                </Text>
              </div>
              <Space size={4} align="center">
                <Space.Compact size="small">
                  <Button
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() =>
                      updateCartItem?.(item.productId, item.quantity - 1)
                    }
                    disabled={item.quantity <= 1}
                  />
                  <InputNumber
                    size="small"
                    min={1}
                    max={item.stock}
                    value={item.quantity}
                    onChange={(v) => updateCartItem?.(item.productId, v)}
                    style={{ width: 52, textAlign: 'center' }}
                  />
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      updateCartItem?.(item.productId, item.quantity + 1)
                    }
                    disabled={item.quantity >= item.stock}
                  />
                </Space.Compact>
                <Text
                  strong
                  style={{
                    fontSize: 13,
                    color: '#10b981',
                    minWidth: 60,
                    textAlign: 'right'
                  }}
                >
                  {formatCurrency(item.price * item.quantity)}
                </Text>
                <Button
                  size="small"
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => removeFromCart?.(item.productId)}
                />
              </Space>
            </div>
          ))
        )}
      </div>

      {/* Cart summary + checkout */}
      <div
        style={{
          background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)',
          padding: 12,
          borderRadius: 10,
          border: '1px solid #a7f3d0'
        }}
      >
        <Row justify="space-between" style={{ marginBottom: 8 }}>
          <Text>Items:</Text>
          <Text strong>{totals.totalItems || 0}</Text>
        </Row>
        <Row justify="space-between" style={{ marginBottom: 10 }}>
          <Text>Total:</Text>
          <Title level={4} style={{ margin: 0, color: '#059669' }}>
            {formatCurrency(totals.subtotal)}
          </Title>
        </Row>
        <Button
          type="primary"
          size="large"
          block
          onClick={onCheckout}
          disabled={!cart.length || loading?.checkout}
          loading={loading?.checkout}
          icon={<ThunderboltOutlined />}
          style={{
            height: 46,
            borderRadius: 10,
            fontWeight: 700,
            background: 'linear-gradient(135deg,#059669,#10b981)',
            border: 'none'
          }}
        >
          CHECKOUT
        </Button>
      </div>
    </div>
  );

  // ============================================================
  // MODE 1 — Mobile Products tab (products only)
  // ============================================================
  if (isMobile && hideCart) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 150px)'
        }}
      >
        <Search
          placeholder="Search products…"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="large"
          prefix={<SearchOutlined />}
          style={{ marginBottom: 8 }}
        />
        {productsGrid}
      </div>
    );
  }

  // ============================================================
  // MODE 2 — Mobile Cart tab (cart only)
  // ============================================================
  if (isMobile && hideProducts) {
    return <div style={{ height: 'calc(100vh - 150px)' }}>{cartPanel}</div>;
  }

  // ============================================================
  // MODE 3 — Desktop left column (products only)
  // ============================================================
  if (!isMobile && hideCart) {
    return (
      <Card
        title={
          <Space>
            <ShoppingOutlined />
            <Text strong>Products</Text>
            <Badge count={products.length} color="#2563eb" />
          </Space>
        }
        style={{
          height: '100%',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column'
        }}
        bodyStyle={{
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden'
        }}
      >
        <Search
          placeholder="Search by name or category…"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="large"
          prefix={<SearchOutlined />}
          style={{ marginBottom: 12 }}
        />
        {productsGrid}
      </Card>
    );
  }

  // ============================================================
  // MODE 4 — Desktop right column (cart only)
  // ============================================================
  if (!isMobile && hideProducts) {
    return (
      <Card
        style={{
          height: '100%',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column'
        }}
        bodyStyle={{ padding: 0, flex: 1, overflow: 'hidden' }}
      >
        {cartPanel}
      </Card>
    );
  }

  // ============================================================
  // MODE 5 — Desktop default: side-by-side (fallback)
  // Not used by the new Dashboard (which passes hideCart/hideProducts),
  // but kept for backwards compatibility.
  // ============================================================
  return (
    <Row gutter={[12, 12]} style={{ height: '100%' }}>
      <Col xs={24} lg={14} style={{ height: '100%' }}>
        <Card
          title={
            <Space>
              <ShoppingOutlined />
              <Text strong>Products</Text>
              <Badge count={products.length} color="#2563eb" />
            </Space>
          }
          style={{
            height: '100%',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column'
          }}
          bodyStyle={{
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden'
          }}
        >
          <Search
            placeholder="Search by name or category…"
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="large"
            prefix={<SearchOutlined />}
            style={{ marginBottom: 12 }}
          />
          {productsGrid}
        </Card>
      </Col>
      <Col xs={24} lg={10} style={{ height: '100%' }}>
        <Card
          style={{
            height: '100%',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column'
          }}
          bodyStyle={{ padding: 0, flex: 1, overflow: 'hidden' }}
        >
          {cartPanel}
        </Card>
      </Col>
    </Row>
  );
};

export default CashierPOS;