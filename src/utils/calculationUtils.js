// src/utils/calculationUtils.js
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { RiseOutlined, FallOutlined } from '@ant-design/icons';
import React from 'react';

dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

// =============================================
// CALCULATION UTILITIES - CREDIT FUNCTIONALITY REMOVED
// =============================================

export const CalculationUtils = {
  // Safe number conversion with enhanced validation
  safeNumber: (value, fallback = 0) => {
    if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') return fallback;
    if (typeof value === 'boolean') return value ? 1 : 0;
    
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  },

  // Format currency for display with enhanced options
  formatCurrency: (amount, currency = 'KES', showSymbol = true) => {
    const value = CalculationUtils.safeNumber(amount);
    const formatted = value.toLocaleString('en-KE', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
    return showSymbol ? `${currency} ${formatted}` : formatted;
  },

  // Get color based on profit value
  getProfitColor: (profit) => {
    const value = CalculationUtils.safeNumber(profit);
    if (value > 0) return '#3f8600'; // Green
    if (value < 0) return '#cf1322'; // Red
    return '#d9d9d9'; // Gray
  },

  // Get profit icon based on profit value
  getProfitIcon: (profit) => {
    const value = CalculationUtils.safeNumber(profit);
    return value >= 0 ? <RiseOutlined /> : <FallOutlined />;
  },

  // Calculate profit from revenue and cost
  calculateProfit: (revenue, cost) => {
    const revenueNum = CalculationUtils.safeNumber(revenue);
    const costNum = CalculationUtils.safeNumber(cost);
    return revenueNum - costNum;
  },

  // Calculate profit margin percentage with enhanced validation
  calculateProfitMargin: (revenue, profit) => {
    const revenueNum = CalculationUtils.safeNumber(revenue);
    const profitNum = CalculationUtils.safeNumber(profit);
    if (revenueNum <= 0) return 0.0;
    return (profitNum / revenueNum) * 100;
  },

// Modified version of calculateCostFromItems
calculateCostFromItems: (transaction, products = []) => {
  try {
    // If cost is already provided and valid, use it
    if (transaction.cost && CalculationUtils.safeNumber(transaction.cost) > 0) {
      return CalculationUtils.safeNumber(transaction.cost);
    }
    
    if (transaction.totalCost && CalculationUtils.safeNumber(transaction.totalCost) > 0) {
      return CalculationUtils.safeNumber(transaction.totalCost);
    }

    // Calculate cost from items
    if (transaction.items && Array.isArray(transaction.items)) {
      let totalCost = 0;
      let hasActualCost = false;
      
      for (const item of transaction.items) {
        const quantity = CalculationUtils.safeNumber(item.quantity, 1);
        let itemCost = 0;
        
        // Try to get cost from different sources
        if (item.cost && CalculationUtils.safeNumber(item.cost) > 0) {
          itemCost = CalculationUtils.safeNumber(item.cost);
          hasActualCost = true;
        }
        else if (item.buyingPrice && CalculationUtils.safeNumber(item.buyingPrice) > 0) {
          itemCost = CalculationUtils.safeNumber(item.buyingPrice);
          hasActualCost = true;
        }
        else if (item.productId && products.length > 0) {
          const product = products.find(p => 
            p._id && item.productId && p._id.toString() === item.productId.toString()
          );
          
          if (product && product.buyingPrice && CalculationUtils.safeNumber(product.buyingPrice) > 0) {
            itemCost = CalculationUtils.safeNumber(product.buyingPrice);
            hasActualCost = true;
          }
        }
        
        totalCost += itemCost * quantity;
      }
      
      // If no actual costs were found, return 0 instead of estimating
      if (!hasActualCost) {
        console.log('⚠️ No actual buying prices found, returning 0 cost');
        return 0;
      }
      
      return totalCost;
    }
    
    return 0;
  } catch (error) {
    console.error('❌ Error calculating cost from items:', error);
    return 0;
  }
},

  // Calculate COGS for transactions array - SIMPLIFIED (No credit handling needed)
  calculateCOGS: (transactions, products = []) => {
    if (!Array.isArray(transactions)) return 0;
    
    console.log('🧮 COGS Calculation - Processing transactions:', transactions.length);
    
    const totalCOGS = transactions.reduce((sum, transaction) => {
      const cost = CalculationUtils.calculateCostFromItems(transaction, products);
      return sum + cost;
    }, 0);
    
    console.log('💰 FINAL COGS Calculation Result:', {
      totalTransactions: transactions.length,
      totalCOGS: totalCOGS
    });
    
    return totalCOGS;
  },

  // SIMPLIFIED: Calculate revenue - All transactions count fully
  calculateRevenue: (transactions) => {
    if (!Array.isArray(transactions)) return 0;
    
    const totalRevenue = transactions.reduce((sum, transaction) => {
      return sum + CalculationUtils.safeNumber(transaction.totalAmount);
    }, 0);
    
    return totalRevenue;
  },

  // SIMPLIFIED: Calculate transaction metrics - No credit logic
  calculateTransactionMetrics: (transaction, products = []) => {
    const items = transaction.items || [];
    const totalAmount = CalculationUtils.safeNumber(transaction.totalAmount);
    
    // Use enhanced cost calculation with products data
    const cost = CalculationUtils.calculateCostFromItems(transaction, products);
    
    // Calculate profit
    const profit = CalculationUtils.calculateProfit(totalAmount, cost);
    const profitMargin = CalculationUtils.calculateProfitMargin(totalAmount, profit);
    
    return {
      ...transaction,
      totalAmount: totalAmount,
      cost: cost,
      profit: profit,
      profitMargin: profitMargin,
      itemsCount: items.reduce((sum, item) => sum + CalculationUtils.safeNumber(item.quantity, 1), 0),
      displayDate: transaction.displayDate || new Date(transaction.saleDate || transaction.createdAt).toLocaleString('en-KE')
    };
  },

  // SIMPLIFIED: Process comprehensive data - No credit integration
  processComprehensiveData: (rawData, selectedShop) => {
    try {
      console.log('🔧 Processing comprehensive data...', {
        rawDataKeys: Object.keys(rawData),
        selectedShop
      });

      // Extract data with proper fallbacks
      const transactions = rawData.transactions || 
                         rawData.salesWithProfit || 
                         rawData.filteredTransactions || 
                         [];

      const expenses = rawData.expenses || [];
      const products = rawData.products || [];
      const shops = rawData.shops || [];
      const cashiers = rawData.cashiers || [];

      console.log('📊 Data extracted:', {
        transactions: transactions.length,
        expenses: expenses.length,
        products: products.length,
        shops: shops.length,
        cashiers: cashiers.length
      });

      // Process each transaction
      const processedTransactions = transactions.map(transaction => {
        const cost = CalculationUtils.calculateCostFromItems(transaction, products);
        const totalAmount = CalculationUtils.safeNumber(transaction.totalAmount);
        
        // Calculate profit metrics
        const profit = CalculationUtils.calculateProfit(totalAmount, cost);
        const profitMargin = CalculationUtils.calculateProfitMargin(totalAmount, profit);

        // Enhanced shop name handling
        let shopName = 'Unknown Shop';
        if (transaction.shop) {
          if (typeof transaction.shop === 'string') {
            shopName = transaction.shop;
          } else if (typeof transaction.shop === 'object' && transaction.shop.name) {
            shopName = transaction.shop.name;
          }
        } else if (transaction.shopName) {
          shopName = transaction.shopName;
        }

        // Enhanced date handling
        const saleDate = transaction.saleDate || transaction.createdAt;
        const displayDate = transaction.displayDate || 
                           (saleDate ? new Date(saleDate).toLocaleString('en-KE') : 'Date Unknown');

        return {
          ...transaction,
          // Core financial data
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          cost: parseFloat(cost.toFixed(2)),
          profit: parseFloat(profit.toFixed(2)),
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          
          // Display properties
          displayDate,
          shop: shopName,
          shopName: shopName,
          
          // Cashier info
          cashierName: transaction.cashierName || 'Unknown Cashier',
          
          // Items count
          itemsCount: CalculationUtils.safeNumber(transaction.itemsCount) || 
                     (transaction.items ? transaction.items.reduce((sum, item) => 
                       sum + CalculationUtils.safeNumber(item.quantity, 1), 0) : 0),
          
          // Metadata
          _id: transaction._id,
          transactionNumber: transaction.transactionNumber,
          paymentMethod: transaction.paymentMethod,
          customerName: transaction.customerName || 'Walk-in Customer',
          status: transaction.status || 'completed',
          _processedAt: new Date().toISOString(),
          _isValid: true
        };
      });

      // Filter by shop if specified
      const filteredTransactions = selectedShop && selectedShop !== 'all' ? 
        processedTransactions.filter(t => {
          const transactionShopId = t.shopId || t.shop;
          return transactionShopId === selectedShop;
        }) : processedTransactions;

      console.log('✅ Processed transactions:', {
        total: processedTransactions.length,
        filtered: filteredTransactions.length
      });

      // Calculate financial stats
      const financialStats = CalculationUtils.calculateFinancialStats(
        filteredTransactions, 
        expenses, 
        products
      );

      return {
        salesWithProfit: filteredTransactions,
        financialStats,
        expenses,
        products,
        shops,
        cashiers,
        summary: financialStats,
        enhancedStats: {
          financialStats,
          salesWithProfit: filteredTransactions
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in processComprehensiveData:', error);
      return CalculationUtils.getDefaultProcessedData();
    }
  },

  // SIMPLIFIED: Process single transaction - No credit management
  processSingleTransaction: (transaction, products = []) => {
    try {
      if (!transaction) return CalculationUtils.createFallbackTransaction();

      const totalAmount = CalculationUtils.safeNumber(transaction.totalAmount) || 
                         CalculationUtils.safeNumber(transaction.amount) || 0;
      
      const cost = CalculationUtils.calculateCostFromItems(transaction, products);
      
      // Calculate profit metrics
      const profit = CalculationUtils.calculateProfit(totalAmount, cost);
      const profitMargin = CalculationUtils.calculateProfitMargin(totalAmount, profit);

      // Enhanced date handling
      const saleDate = transaction.saleDate || transaction.createdAt || transaction.date;
      const displayDate = transaction.displayDate || 
                         (saleDate ? dayjs(saleDate).format('DD/MM/YYYY HH:mm') : 'Date Unknown');

      // Enhanced shop name handling
      let shopName = 'Unknown Shop';
      if (transaction.shop) {
        if (typeof transaction.shop === 'string') {
          shopName = transaction.shop;
        } else if (typeof transaction.shop === 'object' && transaction.shop.name) {
          shopName = transaction.shop.name;
        }
      }

      return {
        ...transaction,
        // Core financial data
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        cost: parseFloat(cost.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        
        // Display properties
        displayDate,
        
        // Safe shop handling
        shop: shopName,
        shopName: shopName,
        
        // Cashier info
        cashierName: transaction.cashierName || 'Unknown Cashier',
        
        // Additional metadata
        _processedAt: new Date().toISOString(),
        _isValid: true
      };
    } catch (error) {
      console.error('❌ Error processing transaction:', error, transaction);
      return CalculationUtils.createFallbackTransaction(transaction);
    }
  },

  // SIMPLIFIED: Calculate financial statistics - No credit management
  calculateFinancialStats: (transactions, expenses, products = [], serverStats = null) => {
    // Prefer server-calculated stats when available
    if (serverStats) {
      return serverStats;
    }

    const validTransactions = transactions.filter(t => t && t._isValid !== false);
    
    if (validTransactions.length === 0) {
      return CalculationUtils.getDefaultStats();
    }

    try {
      // Calculate revenue
      const totalRevenue = CalculationUtils.calculateRevenue(validTransactions);
      
      // Calculate COGS using consistent method
      const costOfGoodsSold = CalculationUtils.calculateCOGSConsistent(validTransactions, products);
      
      // Calculate profit
      const totalProfit = CalculationUtils.calculateProfit(totalRevenue, costOfGoodsSold);
      
      // Expense calculations
      const totalExpensesAmount = expenses.reduce((sum, e) => 
        sum + CalculationUtils.safeNumber(e.amount), 0
      );
      const netProfit = CalculationUtils.calculateProfit(totalProfit, totalExpensesAmount);
      
      // Calculate payment composition using the new function
      const paymentComposition = CalculationUtils.calculatePaymentComposition(validTransactions);

      console.log('💰 FINAL Financial Breakdown:', {
        totalRevenue: totalRevenue,
        totalTransactions: validTransactions.length,
        paymentComposition: paymentComposition
      });

      return {
        // Core financial metrics
        totalSales: validTransactions.length,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalExpenses: parseFloat(totalExpensesAmount.toFixed(2)),
        grossProfit: parseFloat(totalProfit.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        costOfGoodsSold: parseFloat(costOfGoodsSold.toFixed(2)),
        totalMpesaBank: parseFloat(paymentComposition.mpesa_bank.toFixed(2)),
        totalCash: parseFloat(paymentComposition.cash.toFixed(2)),
        
        // Payment composition
        paymentComposition: paymentComposition,
        
        // Additional metrics
        profitMargin: CalculationUtils.calculateProfitMargin(totalRevenue, netProfit),
        totalTransactions: validTransactions.length,
        totalItemsSold: validTransactions.reduce((sum, t) => sum + (t.itemsCount || 0), 0),
        
        // Timestamp
        timestamp: new Date().toISOString(),
        _calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error calculating financial stats:', error);
      return CalculationUtils.getDefaultStats();
    }
  },

  // SIMPLIFIED: Enhanced sales performance summary - No credit
  calculateSalesPerformanceSummary: (transactions, expenses, financialStats) => {
    try {
      const validTransactions = transactions.filter(t => t && t._isValid !== false);
      
      if (validTransactions.length === 0) {
        return CalculationUtils.getDefaultSalesPerformanceSummary();
      }

      return {
        // Sales counts
        totalSales: validTransactions.length,
        totalRevenue: financialStats.totalRevenue,
        
        // Cost analysis
        costOfGoodsSold: financialStats.costOfGoodsSold,
        
        // Profit analysis
        grossProfit: financialStats.grossProfit,
        netProfit: financialStats.netProfit,
        
        // Expense analysis
        expenses: financialStats.totalExpenses,
        revenueAfterExpenses: financialStats.totalRevenue - financialStats.totalExpenses,
        profitAfterExpenses: financialStats.netProfit,
        
        // Payment method analysis
        totalMpesa: financialStats.totalMpesaBank,
        totalBank: 0,
        totalCash: financialStats.totalCash,
        
        // Timestamp
        timestamp: new Date().toISOString(),
        _calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error calculating sales performance summary:', error);
      return CalculationUtils.getDefaultSalesPerformanceSummary();
    }
  },

  // SIMPLIFIED filtering functions for TransactionsReport
  filterTransactionsByShop: (transactions, shopId) => {
    if (!Array.isArray(transactions)) return [];
    if (!shopId || shopId === 'all') return transactions;
    
    return transactions.filter(transaction => {
      const transactionShopId = transaction.shopId || 
                               (transaction.shop && typeof transaction.shop === 'object' ? transaction.shop._id : transaction.shop);
      return transactionShopId === shopId;
    });
  },

  filterExpensesByShop: (expenses, shopId) => {
    if (!Array.isArray(expenses)) return [];
    if (!shopId || shopId === 'all') return expenses;
    
    return expenses.filter(expense => {
      const expenseShopId = expense.shopId || 
                           (expense.shop && typeof expense.shop === 'object' ? expense.shop._id : expense.shop);
      return expenseShopId === shopId;
    });
  },

  // Top products calculation
  calculateTopProducts: (transactionsData, limit = 10) => {
    if (!transactionsData || !Array.isArray(transactionsData)) {
      return [];
    }

    const productSales = {};
    const validTransactions = transactionsData.filter(t => t && t.items && Array.isArray(t.items));
    
    validTransactions.forEach(transaction => {
      if (!transaction.items) return;
      
      transaction.items.forEach(item => {
        if (!item) return;
        
        const productName = item.productName || item.name || 'Unknown Product';
        const productId = item.productId || item._id || productName;
        const key = `${productId}-${productName}`;
        
        if (!productSales[key]) {
          productSales[key] = {
            id: productId,
            name: productName,
            totalSold: 0,
            totalRevenue: 0,
            totalProfit: 0,
            totalCost: 0,
            transactions: 0
          };
        }
        
        const quantity = CalculationUtils.safeNumber(item.quantity, 1);
        const price = CalculationUtils.safeNumber(item.price || item.unitPrice || 0);
        const cost = CalculationUtils.safeNumber(item.cost || item.buyingPrice || item.unitCost || 0);
        const revenue = price * quantity;
        const itemCost = cost * quantity;
        const profit = revenue - itemCost;
        
        productSales[key].totalSold += quantity;
        productSales[key].totalRevenue += revenue;
        productSales[key].totalProfit += profit;
        productSales[key].totalCost += itemCost;
        productSales[key].transactions += 1;
      });
    });
    
    const products = Object.values(productSales)
      .map(product => ({
        ...product,
        profitMargin: CalculationUtils.calculateProfitMargin(product.totalRevenue, product.totalProfit),
        averagePrice: product.totalSold > 0 ? product.totalRevenue / product.totalSold : 0,
        averageCost: product.totalSold > 0 ? product.totalCost / product.totalSold : 0
      }));

    return products
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit)
      .map(product => ({
        ...product,
        totalRevenue: parseFloat(product.totalRevenue.toFixed(2)),
        totalProfit: parseFloat(product.totalProfit.toFixed(2)),
        totalCost: parseFloat(product.totalCost.toFixed(2)),
        profitMargin: parseFloat(product.profitMargin.toFixed(1))
      }));
  },

  // Shop performance calculation
  calculateShopPerformance: (transactions, shops = []) => {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }

    const shopSales = {};
    const validTransactions = transactions.filter(t => t && t._isValid !== false);
    
    validTransactions.forEach(sale => {
      // Enhanced shop identification
      let shopId = sale.shopId;
      let shopName = 'Unknown Shop';
      
      // Handle different shop data structures
      if (sale.shop) {
        if (typeof sale.shop === 'string') {
          shopName = sale.shop;
          shopId = shopId || sale.shop;
        } else if (typeof sale.shop === 'object') {
          shopName = sale.shop.name || 'Unknown Shop';
          shopId = shopId || sale.shop._id;
        }
      }
      
      // Find shop in provided shops array
      if (shops.length > 0 && shopId) {
        const foundShop = shops.find(s => s._id === shopId || s.name === shopName);
        if (foundShop) {
          shopName = foundShop.name;
          shopId = foundShop._id;
        }
      }
      
      if (!shopSales[shopId]) {
        shopSales[shopId] = { 
          id: shopId,
          name: shopName,
          revenue: 0, 
          transactions: 0, 
          profit: 0,
          costOfGoodsSold: 0
        };
      }
      
      const recognizedRevenue = CalculationUtils.safeNumber(sale.totalAmount || 0);
      
      shopSales[shopId].revenue += recognizedRevenue;
      shopSales[shopId].transactions += 1;
      shopSales[shopId].profit += CalculationUtils.safeNumber(sale.profit || 0);
      shopSales[shopId].costOfGoodsSold += CalculationUtils.safeNumber(sale.cost || 0);
    });
    
    return Object.values(shopSales)
      .map((data) => ({
        ...data,
        revenue: parseFloat(data.revenue.toFixed(2)),
        profit: parseFloat(data.profit.toFixed(2)),
        costOfGoodsSold: parseFloat(data.costOfGoodsSold.toFixed(2)),
        profitMargin: CalculationUtils.calculateProfitMargin(data.revenue, data.profit)
      }))
      .sort((a, b) => b.revenue - a.revenue);
  },

  // Unified COGS calculation that matches server logic
  calculateCOGSConsistent: (transactions, products = []) => {
    if (!Array.isArray(transactions)) return 0;
    
    console.log('🧮 Unified COGS Calculation - Processing:', transactions.length, 'transactions');
    
    const totalCOGS = transactions.reduce((sum, transaction) => {
      // Try to get cost from transaction first (should match server calculation)
      const transactionCost = CalculationUtils.safeNumber(transaction.cost);
      
      if (transactionCost > 0) {
        return sum + transactionCost;
      }
      
      // Fallback to item-based calculation
      const costFromItems = CalculationUtils.calculateCostFromItems(transaction, products);
      return sum + costFromItems;
    }, 0);
    
    console.log('💰 Unified COGS Result:', totalCOGS);
    return totalCOGS;
  },

  // Cashier performance calculation
  calculateCashierPerformance: (transactions, cashiers = []) => {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }

    const cashierSales = {};
    const validTransactions = transactions.filter(t => t && t._isValid !== false);
    
    validTransactions.forEach(sale => {
      const cashierName = sale.cashierName || 
                         (sale.cashier && typeof sale.cashier === 'object' ? 
                          sale.cashier.name : 'Unknown Cashier') || 
                         'Unknown Cashier';
      
      const cashierId = sale.cashierId || 
                       (sale.cashier && typeof sale.cashier === 'object' ? 
                        sale.cashier._id || sale.cashier.id : cashierName);
      
      if (!cashierSales[cashierId]) {
        cashierSales[cashierId] = { 
          id: cashierId,
          name: cashierName,
          revenue: 0, 
          transactions: 0,
          profit: 0,
          itemsSold: 0,
          performanceScore: 0,
          costOfGoodsSold: 0,
          paymentMethods: { cash: 0, mpesa_bank: 0 }
        };
      }
      
      const recognizedRevenue = CalculationUtils.safeNumber(sale.totalAmount || 0);
      
      cashierSales[cashierId].revenue += recognizedRevenue;
      cashierSales[cashierId].profit += CalculationUtils.safeNumber(sale.profit || 0);
      cashierSales[cashierId].transactions += 1;
      cashierSales[cashierId].itemsSold += CalculationUtils.safeNumber(sale.itemsCount || 0);
      cashierSales[cashierId].costOfGoodsSold += CalculationUtils.safeNumber(sale.cost || 0);
      
      // Calculate payment methods using new function
      const split = CalculationUtils.calculatePaymentSplit(sale);
      cashierSales[cashierId].paymentMethods.cash += split.cash;
      cashierSales[cashierId].paymentMethods.mpesa_bank += split.mpesa_bank;
    });
    
    return Object.values(cashierSales)
      .map((cashier) => ({
        ...cashier,
        revenue: parseFloat(cashier.revenue.toFixed(2)),
        profit: parseFloat(cashier.profit.toFixed(2)),
        costOfGoodsSold: parseFloat(cashier.costOfGoodsSold.toFixed(2)),
        profitMargin: CalculationUtils.calculateProfitMargin(cashier.revenue, cashier.profit),
        averageTransactionValue: cashier.transactions > 0 ? parseFloat((cashier.revenue / cashier.transactions).toFixed(2)) : 0,
        performanceScore: CalculationUtils.calculatePerformanceScore(cashier),
        paymentMethods: {
          cash: parseFloat(cashier.paymentMethods.cash.toFixed(2)),
          mpesa_bank: parseFloat(cashier.paymentMethods.mpesa_bank.toFixed(2)),
          total: parseFloat((cashier.paymentMethods.cash + cashier.paymentMethods.mpesa_bank).toFixed(2))
        }
      }))
      .sort((a, b) => b.performanceScore - a.performanceScore);
  },

  // Handle consistent payment split calculations
  calculatePaymentSplit: (transaction) => {
    const paymentMethod = transaction.paymentMethod;
    const totalAmount = CalculationUtils.safeNumber(transaction.totalAmount);
    
    let cash = 0;
    let mpesa_bank = 0;
    
    if (paymentMethod === 'cash') {
      cash = totalAmount;
    } else if (paymentMethod === 'mpesa_bank') {
      mpesa_bank = totalAmount;
    } else if (paymentMethod === 'cash_mpesa_bank' && transaction.paymentSplit) {
      cash = CalculationUtils.safeNumber(transaction.paymentSplit.cash);
      mpesa_bank = CalculationUtils.safeNumber(transaction.paymentSplit.mpesa_bank);
    } else if (paymentMethod === 'cash_mpesa_bank') {
      // Fallback for old data structure
      cash = CalculationUtils.safeNumber(transaction.cashAmount || 0);
      mpesa_bank = CalculationUtils.safeNumber(transaction.mpesaBankAmount || transaction.bankMpesaAmount || 0);
    } else {
      // Default fallback for other payment methods
      cash = totalAmount;
    }
    
    return {
      cash,
      mpesa_bank,
      total: cash + mpesa_bank
    };
  },

  // Calculate payment composition for transactions
  calculatePaymentComposition: (transactions) => {
    const composition = {
      cash: 0,
      mpesa_bank: 0,
      total: 0,
      transactions: transactions.length
    };
    
    transactions.forEach(transaction => {
      const split = CalculationUtils.calculatePaymentSplit(transaction);
      composition.cash += split.cash;
      composition.mpesa_bank += split.mpesa_bank;
      composition.total += split.total;
    });
    
    // Calculate percentages
    composition.cashPercentage = composition.total > 0 ? 
      (composition.cash / composition.total) * 100 : 0;
    composition.mpesaBankPercentage = composition.total > 0 ? 
      (composition.mpesa_bank / composition.total) * 100 : 0;
    
    // Format values
    composition.cash = parseFloat(composition.cash.toFixed(2));
    composition.mpesa_bank = parseFloat(composition.mpesa_bank.toFixed(2));
    composition.total = parseFloat(composition.total.toFixed(2));
    composition.cashPercentage = parseFloat(composition.cashPercentage.toFixed(1));
    composition.mpesaBankPercentage = parseFloat(composition.mpesaBankPercentage.toFixed(1));
    
    return composition;
  },

  // Default data structures
  getDefaultProcessedData: () => ({
    salesWithProfit: [],
    financialStats: CalculationUtils.getDefaultStats(),
    expenses: [],
    summary: CalculationUtils.getDefaultStats(),
    enhancedStats: {
      financialStats: CalculationUtils.getDefaultStats(),
      salesWithProfit: []
    },
    metadata: {
      processedAt: new Date().toISOString(),
      shopFilter: null,
      recordCounts: {
        transactions: 0,
        expenses: 0
      }
    }
  }),

  // Default stats
  getDefaultStats: () => ({
    // Core metrics for FinancialOverview
    totalSales: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    grossProfit: 0,
    netProfit: 0,
    costOfGoodsSold: 0,
    totalMpesaBank: 0,
    totalCash: 0,
    
    // Payment composition
    paymentComposition: {
      cash: 0,
      mpesa_bank: 0,
      total: 0,
      cashPercentage: 0,
      mpesaBankPercentage: 0,
      transactions: 0
    },
    
    // Additional metrics
    profitMargin: 0,
    totalTransactions: 0,
    totalItemsSold: 0,
    
    timestamp: new Date().toISOString(),
    _calculatedAt: new Date().toISOString()
  }),

  getDefaultSalesPerformanceSummary: () => ({
    totalSales: 0,
    totalRevenue: 0,
    expenses: 0,
    grossProfit: 0,
    netProfit: 0,
    costOfGoodsSold: 0,
    totalMpesa: 0,
    totalBank: 0,
    totalCash: 0,
    revenueAfterExpenses: 0,
    profitAfterExpenses: 0,
    timestamp: new Date().toISOString()
  }),

  createFallbackTransaction: (originalTransaction = {}) => ({
    _id: originalTransaction?._id || `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    transactionNumber: originalTransaction?.transactionNumber || `FALLBACK-${Date.now()}`,
    totalAmount: 0,
    cost: 0,
    profit: 0,
    profitMargin: 0,
    paymentMethod: 'cash',
    status: 'completed',
    customerName: 'Walk-in Customer',
    cashierName: 'Unknown Cashier',
    shop: 'Unknown Shop',
    shopName: 'Unknown Shop',
    saleDate: new Date(),
    items: [],
    itemsCount: 0,
    displayDate: dayjs().format('DD/MM/YYYY HH:mm'),
    _isValid: false,
    _isFallback: true
  }),

  // Utility function for performance score calculation
  calculatePerformanceScore: (cashier) => {
    if (!cashier) return 0;
    
    const revenueScore = Math.min((cashier.revenue || 0) / 1000, 100);
    const transactionScore = Math.min((cashier.transactions || 0) * 2, 50);
    const marginScore = Math.min((cashier.profitMargin || 0) * 2, 30);
    const itemsScore = Math.min((cashier.itemsSold || 0) / 10, 20);
    
    return revenueScore + transactionScore + marginScore + itemsScore;
  },

  // Utility function to filter data by date range
  filterDataByDateRange: (data, startDate, endDate, dateField = 'saleDate') => {
    if (!Array.isArray(data)) return [];
    
    return data.filter(item => {
      const itemDate = item[dateField] || item.createdAt || item.date;
      if (!itemDate) return false;
      
      const itemDayjs = dayjs(itemDate);
      const startDayjs = dayjs(startDate);
      const endDayjs = dayjs(endDate);
      
      return itemDayjs.isBetween(startDayjs, endDayjs, null, '[]');
    });
  },

  // Calculate payment split totals for cashier dashboard
  calculatePaymentSplitTotals: (transactions) => {
    if (!Array.isArray(transactions)) {
      return { cash: 0, bank_mpesa: 0 };
    }

    return transactions.reduce((totals, transaction) => {
      if (transaction.paymentSplit) {
        totals.cash += CalculationUtils.safeNumber(transaction.paymentSplit.cash);
        totals.bank_mpesa += CalculationUtils.safeNumber(transaction.paymentSplit.bank_mpesa);
      } else {
        // Fallback calculation based on payment method
        const amount = CalculationUtils.safeNumber(transaction.totalAmount);
        if (transaction.paymentMethod === 'cash') {
          totals.cash += amount;
        } else if (['mpesa', 'bank', 'card', 'bank_mpesa'].includes(transaction.paymentMethod)) {
          totals.bank_mpesa += amount;
        } else if (transaction.paymentMethod === 'cash_bank_mpesa') {
          // Split evenly as fallback
          const half = amount / 2;
          totals.cash += half;
          totals.bank_mpesa += half;
        }
      }
      return totals;
    }, { cash: 0, bank_mpesa: 0 });
  },

  // Validate transaction data integrity
  validateTransactionData: (transaction) => {
    const errors = [];
    
    if (!transaction) {
      errors.push('Transaction is null or undefined');
      return { isValid: false, errors };
    }
    
    // Check required fields
    if (!transaction._id && !transaction.transactionNumber) {
      errors.push('Transaction missing identifier (_id or transactionNumber)');
    }
    
    if (!transaction.totalAmount && transaction.totalAmount !== 0) {
      errors.push('Transaction missing totalAmount');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      transaction
    };
  }
};

export default CalculationUtils;