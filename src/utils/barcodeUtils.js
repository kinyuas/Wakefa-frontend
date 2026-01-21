// utils/barcodeUtils.js

export const generateInternalBarcode = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `IN${timestamp}${random}`;
};

export const generateEAN13 = () => {
  const prefix = '89';
  const random = Math.floor(1000000000 + Math.random() * 9000000000).toString().slice(0, 10);
  let barcode = prefix + random;
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(barcode[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return barcode + checkDigit;
};

export const generateUPC = () => {
  const random = Math.floor(10000000000 + Math.random() * 90000000000).toString().slice(0, 11);
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += parseInt(random[i]) * (i % 2 === 0 ? 3 : 1);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return random + checkDigit;
};

export const isValidBarcode = (barcode, type = 'INTERNAL') => {
  if (!barcode) return false;
  
  switch (type) {
    case 'EAN13':
      return /^\d{13}$/.test(barcode);
    case 'UPC':
      return /^\d{12}$/.test(barcode);
    case 'CODE128':
      return /^[A-Za-z0-9\-\.\$\/\+\%]+$/.test(barcode);
    case 'CODE39':
      return /^[A-Z0-9\-\.\$\+\%\/\s]+$/.test(barcode);
    default:
      return barcode.length > 0 && barcode.length <= 50;
  }
};