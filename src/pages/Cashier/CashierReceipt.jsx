// src/pages/Cashier/CashierReceipt.jsx
// Receipt renderer (forwardRef so parent can capture) + Share modal.
import React, { forwardRef } from 'react';
import { Modal, Button, Space, Divider, Alert, Typography } from 'antd';
import {
  WhatsAppOutlined, MailOutlined, FilePdfOutlined,
  FileImageOutlined, PrinterOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const fmt = (n) =>
  `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ----------------------------------------------------------------
// RECEIPT BODY
// ----------------------------------------------------------------
const CashierReceipt = forwardRef(({ transaction, shop, companyInfo, isMobile }, ref) => {
  const items = Array.isArray(transaction?.items) ? transaction.items : [];
  const isCash = transaction?.paymentMethod === 'cash';
  const isSplit = transaction?.paymentMethod === 'cash_mpesa_bank';
  const isDigital = transaction?.paymentMethod === 'mpesa_bank';

  const paymentLabel = isCash ? 'CASH' : isSplit ? 'SPLIT (CASH + M-PESA/BANK)' : isDigital ? 'M-PESA / BANK' : 'CASH';
  const paymentColor = isCash ? '#059669' : isDigital ? '#2563eb' : '#7c3aed';

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : '80mm',
        margin: '0 auto',
        padding: 14,
        background: '#fff',
        border: '2px solid #e2e8f0',
        borderRadius: 8,
        fontFamily: "'Courier New', monospace",
        fontSize: isMobile ? 11 : 12,
        lineHeight: 1.45,
        color: '#0f172a'
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#2563eb' }}>{companyInfo.name}</div>
        <div style={{ fontSize: 11 }}>{shop?.name || companyInfo.branch}</div>
        <div style={{ fontSize: 10, color: '#64748b' }}>{shop?.location || companyInfo.address}</div>
        <div style={{ fontSize: 10, color: '#2563eb' }}>{companyInfo.phone}</div>
        <div style={{ fontSize: 10, fontStyle: 'italic', color: '#059669' }}>{companyInfo.slogan}</div>
      </div>

      <Divider style={{ margin: '8px 0', borderColor: '#cbd5e1' }} />

      {/* Meta */}
      <div style={{ marginBottom: 10 }}>
        <Row label="Receipt No" value={transaction?.receiptNumber || '—'} bold valueColor="#2563eb" />
        <Row label="Date" value={dayjs(transaction?.saleDate).format('DD/MM/YYYY HH:mm')} />
        <Row label="Cashier" value={transaction?.cashierName || 'Cashier'} />
        <Row label="Customer" value={transaction?.customerName || 'Walk-in Customer'} />
        <Row label="Payment" value={paymentLabel} bold valueColor={paymentColor} />
      </div>

      <Divider style={{ margin: '8px 0', borderColor: '#cbd5e1' }} />

      {/* Items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? 10 : 11 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #2563eb' }}>
            <th style={{ textAlign: 'left', padding: '4px 0' }}>ITEM</th>
            <th style={{ textAlign: 'center', padding: '4px 0' }}>QTY</th>
            <th style={{ textAlign: 'right', padding: '4px 0' }}>PRICE</th>
            <th style={{ textAlign: 'right', padding: '4px 0' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => {
            // ✅ Use the product name that we resolved in the dashboard
            const name = it.productName || it.name || 'Unknown Item';
            const qty = it.quantity || 1;
            const price = it.price || it.unitPrice || 0;
            const total = it.totalPrice || price * qty;
            return (
              <tr key={idx} style={{ borderBottom: '1px dashed #e2e8f0' }}>
                <td style={{ padding: '5px 0', fontWeight: 600 }}>{name}</td>
                <td style={{ textAlign: 'center', padding: '5px 0' }}>{qty}</td>
                <td style={{ textAlign: 'right', padding: '5px 0' }}>{fmt(price)}</td>
                <td style={{ textAlign: 'right', padding: '5px 0', fontWeight: 700 }}>{fmt(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Divider style={{ margin: '8px 0', borderColor: '#cbd5e1' }} />

      {/* Totals */}
      <div style={{ marginBottom: 10 }}>
        <Row
          label="TOTAL"
          value={fmt(transaction?.totalAmount)}
          bold
          valueColor="#059669"
          valueFontSize={15}
        />

        {transaction?.paymentSplit && (transaction.paymentSplit.cash > 0 || transaction.paymentSplit.mpesa_bank > 0) && (
          <div style={{ marginTop: 8, fontSize: 11, color: '#475569' }}>
            {transaction.paymentSplit.cash > 0 && (
              <Row label="Cash" value={fmt(transaction.paymentSplit.cash)} />
            )}
            {transaction.paymentSplit.mpesa_bank > 0 && (
              <Row label="M-Pesa / Bank" value={fmt(transaction.paymentSplit.mpesa_bank)} />
            )}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '8px 0', background: '#f0fdf4', borderRadius: 4, fontSize: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>{items.length} Items • {transaction?.itemsCount || 0} Units</div>
        <div style={{ color: '#059669' }}>Quality Guaranteed ✓</div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 9, color: '#64748b', paddingTop: 8, borderTop: '1px dashed #cbd5e1' }}>
        <div>Customer Service: {companyInfo.phone}</div>
        <div>{companyInfo.email}</div>
        <div style={{ fontStyle: 'italic' }}>Thank you for shopping with us!</div>
      </div>
    </div>
  );
});

const Row = ({ label, value, bold, valueColor, valueFontSize }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
    <span style={{ fontWeight: bold ? 700 : 400 }}>{label}:</span>
    <span style={{
      fontWeight: bold ? 800 : 500,
      color: valueColor || 'inherit',
      fontSize: valueFontSize || 'inherit'
    }}>{value}</span>
  </div>
);

// ----------------------------------------------------------------
// SHARE MODAL
// ----------------------------------------------------------------
const ShareModal = ({ open, onClose, onWhatsApp, onEmail, onPDF, onImage, onPrint, isMobile }) => (
  <Modal
    title="Share Receipt"
    open={open}
    onCancel={onClose}
    footer={null}
    width={isMobile ? '92%' : 420}
    centered
  >
    <Space direction="vertical" style={{ width: '100%' }}>
      <Alert
        message="Choose a share method"
        description="Send or save this receipt in one click."
        type="info" showIcon
        style={{ marginBottom: 8, borderRadius: 8 }}
      />
      <Button
        type="primary" block size="large" icon={<WhatsAppOutlined />}
        onClick={onWhatsApp}
        style={{ height: 48, background: '#25D366', borderColor: '#25D366', borderRadius: 10 }}
      >
        WhatsApp
      </Button>
      <Button block size="large" icon={<MailOutlined />} onClick={onEmail} style={{ height: 48, borderRadius: 10 }}>
        Email
      </Button>
      <Button block size="large" icon={<FilePdfOutlined />} onClick={onPDF} style={{ height: 48, borderRadius: 10 }}>
        Download PDF
      </Button>
      <Button block size="large" icon={<FileImageOutlined />} onClick={onImage} style={{ height: 48, borderRadius: 10 }}>
        Download Image
      </Button>
      <Button block size="large" icon={<PrinterOutlined />} onClick={onPrint} style={{ height: 48, borderRadius: 10 }}>
        Print
      </Button>

      <Divider style={{ margin: '12px 0' }} />
      <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
        <InfoCircleOutlined /> The receipt includes all transaction details.
      </Text>
    </Space>
  </Modal>
);

CashierReceipt.ShareModal = ShareModal;
export default CashierReceipt;