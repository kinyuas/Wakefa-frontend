// src/pages/Cashier/CashierStats.jsx
// Overview tab: today's summary + payment composition + top products (with names) + recent sales.
import React, { useMemo, useState } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Typography, Space, Tag,
  Empty, List, Badge, Button, Tabs, Segmented
} from 'antd';
import {
  DollarOutlined, PhoneOutlined, BankOutlined,
  ShoppingCartOutlined, RiseOutlined, BarChartOutlined,
  ReloadOutlined, TrophyOutlined, HistoryOutlined, AppstoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const fmt = (n) =>
  `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CashierStats = ({
  dailyStats = {},
  transactions = [],
  loading = false,
  refresh,
  isMobile = false
}) => {
  const [tab, setTab] = useState('summary');

  // ---- Payment composition ----
  const cash = dailyStats.cashAmount || 0;
  const digital = dailyStats.bankMpesaAmount || 0;
  const total = cash + digital;
  const cashPct = total > 0 ? (cash / total) * 100 : 0;
  const digitalPct = total > 0 ? (digital / total) * 100 : 0;
  const avgSale = (dailyStats.totalTransactions || 0) > 0
    ? (dailyStats.totalSales || 0) / dailyStats.totalTransactions
    : 0;

  // ---- Aggregate top products from today's transactions ----
  const topProducts = useMemo(() => {
    const map = new Map();
    (transactions || []).forEach(tx => {
      (tx.items || []).forEach(it => {
        const name = it.productName || it.name || 'Unknown Item';
        const key = name.toLowerCase();
        const existing = map.get(key) || {
          name,
          quantity: 0,
          revenue: 0,
          profit: 0
        };
        existing.quantity += Number(it.quantity) || 0;
        existing.revenue += Number(it.totalPrice) || (Number(it.price) * (Number(it.quantity) || 0));
        existing.profit += Number(it.profit) || 0;
        map.set(key, existing);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);
  }, [transactions]);

  // ---- Recent transactions (last 6) ----
  const recent = useMemo(() => {
    return [...(transactions || [])]
      .sort((a, b) => new Date(b.saleDate || b.createdAt) - new Date(a.saleDate || a.createdAt))
      .slice(0, 6);
  }, [transactions]);

  // ---- Renderers ----
  const summaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Statistic
            title="Sales"
            value={dailyStats.totalSales || 0}
            prefix="KES"
            valueStyle={{ color: '#059669', fontSize: 18 }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Transactions"
            value={dailyStats.totalTransactions || 0}
            valueStyle={{ color: '#2563eb', fontSize: 18 }}
            prefix={<ShoppingCartOutlined />}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Items"
            value={dailyStats.cashierItemsSold || dailyStats.totalItems || 0}
            valueStyle={{ color: '#7c3aed', fontSize: 18 }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Avg. Sale"
            value={avgSale}
            prefix="KES"
            precision={0}
            valueStyle={{ color: '#ea580c', fontSize: 18 }}
          />
        </Col>
      </Row>

      <Card
        size="small"
        title={<Space><DollarOutlined /><Text strong style={{ fontSize: 13 }}>Payment Split</Text></Space>}
        bodyStyle={{ padding: 10 }}
        style={{ borderRadius: 8 }}
      >
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text strong style={{ color: '#059669', fontSize: 12 }}>
              <DollarOutlined /> Cash
            </Text>
            <Text strong style={{ fontSize: 12 }}>{cashPct.toFixed(1)}%</Text>
          </div>
          <Progress percent={cashPct} strokeColor="#10b981" strokeWidth={8} showInfo={false} />
          <Text type="secondary" style={{ fontSize: 11 }}>{fmt(cash)}</Text>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text strong style={{ color: '#2563eb', fontSize: 12 }}>
              <PhoneOutlined /> M-Pesa / Bank
            </Text>
            <Text strong style={{ fontSize: 12 }}>{digitalPct.toFixed(1)}%</Text>
          </div>
          <Progress percent={digitalPct} strokeColor="#2563eb" strokeWidth={8} showInfo={false} />
          <Text type="secondary" style={{ fontSize: 11 }}>{fmt(digital)}</Text>
        </div>

        <div style={{
          marginTop: 10, paddingTop: 8,
          borderTop: '1px dashed #cbd5e1',
          display: 'flex', justifyContent: 'space-between'
        }}>
          <Text strong style={{ fontSize: 12 }}>Total</Text>
          <Text strong style={{ color: '#0f172a', fontSize: 14 }}>{fmt(total)}</Text>
        </div>
      </Card>
    </div>
  );

  const productsContent = (
    <div>
      {topProducts.length === 0 ? (
        <Empty description="No products sold today" style={{ marginTop: 30 }} />
      ) : (
        <List
          size="small"
          dataSource={topProducts}
          renderItem={(p, idx) => (
            <List.Item style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 10 }}>
                <Badge
                  count={idx + 1}
                  style={{
                    backgroundColor: idx === 0 ? '#f59e0b'
                      : idx === 1 ? '#94a3b8'
                        : idx === 2 ? '#b45309'
                          : '#e2e8f0',
                    color: idx < 3 ? '#fff' : '#475569',
                    fontWeight: 700
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 12, display: 'block' }} ellipsis>
                    {p.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {fmt(p.revenue)} · {p.quantity} sold
                  </Text>
                </div>
                <Tag color="green" style={{ margin: 0, fontSize: 10 }}>
                  ×{p.quantity}
                </Tag>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  const recentContent = (
    <div>
      {recent.length === 0 ? (
        <Empty description="No transactions yet" style={{ marginTop: 30 }} />
      ) : (
        <List
          size="small"
          dataSource={recent}
          renderItem={(tx) => {
            const itemCount = tx.items?.length || tx.itemsCount || 0;
            const firstName = tx.items?.[0]?.productName || tx.items?.[0]?.name;
            const label = itemCount === 1 && firstName
              ? firstName
              : `${itemCount} item${itemCount === 1 ? '' : 's'}`;
            return (
              <List.Item style={{ padding: '8px 0' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 12 }} ellipsis>
                      {label}
                    </Text>
                    <Text strong style={{ fontSize: 12, color: '#10b981' }}>
                      {fmt(tx.totalAmount)}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      {dayjs(tx.saleDate || tx.createdAt).format('HH:mm')}
                    </Text>
                    <Tag
                      color={
                        tx.paymentMethod === 'cash' ? 'green'
                          : tx.paymentMethod === 'mpesa_bank' ? 'blue'
                            : 'purple'
                      }
                      style={{ margin: 0, fontSize: 9, lineHeight: '14px', padding: '0 4px' }}
                    >
                      {(tx.paymentMethod || 'cash').toUpperCase().replace('_', '+')}
                    </Tag>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );

  // ---- Wrapper: stack panels vertically on desktop (right column is narrow),
  //      use segmented tabs on mobile ----
  return (
    <Card
      size="small"
      title={
        <Space>
          <BarChartOutlined />
          <Text strong style={{ fontSize: 13 }}>Today's Overview</Text>
        </Space>
      }
      extra={
        refresh && (
          <Button
            size="small"
            type="text"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={refresh}
          />
        )
      }
      bodyStyle={{ padding: 10, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}
      style={{ borderRadius: 10 }}
    >
      {/* Summary always visible at the top */}
      {summaryContent}

      <div style={{ margin: '12px 0 8px' }}>
        <Segmented
          block
          value={tab}
          onChange={setTab}
          options={[
            {
              label: (
                <span style={{ fontSize: 12 }}>
                  <TrophyOutlined /> Top
                </span>
              ),
              value: 'summary'
            },
            {
              label: (
                <span style={{ fontSize: 12 }}>
                  <HistoryOutlined /> Recent
                </span>
              ),
              value: 'recent'
            }
          ]}
        />
      </div>

      <Card
        size="small"
        title={
          tab === 'summary'
            ? <Space><TrophyOutlined /><Text strong style={{ fontSize: 12 }}>Top Products Today</Text></Space>
            : <Space><HistoryOutlined /><Text strong style={{ fontSize: 12 }}>Recent Sales</Text></Space>
        }
        bodyStyle={{ padding: 8 }}
        style={{ borderRadius: 8 }}
      >
        {tab === 'summary' ? productsContent : recentContent}
      </Card>
    </Card>
  );
};

export default CashierStats;