
// // ==================== SERVER STARTUP ====================

// if (require.main === module) {
//   const PORT = process.env.PORT || 5002;
  
//   const startServer = async () => {
//     try {
//       console.log('🔄 Attempting to connect to database...');
      
//       try {
//         const connection = await connectDB();
//         console.log('✅ Database connection established successfully');
//         console.log(`🔗 Database state: ${connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
//       } catch (dbError) {
//         console.log('⚠️ Database connection will be established on first request');
//         console.log('📝 Database connection error:', dbError.message);
//       }
      
//       app.listen(PORT, '0.0.0.0', () => {
//         console.log('\n' + '='.repeat(60));
//         console.log(`🚀 COMPLETE SUPERMARKET MANAGEMENT SERVER STARTED SUCCESSFULLY!`);
//         console.log('='.repeat(60));
//         console.log(`📡 Port: ${PORT}`);
//         console.log(`🌐 Local: http://localhost:${PORT}`);
//         console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
//         console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
//         console.log(`🔐 Test endpoint: http://localhost:${PORT}/api/test`);
//         console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
//         console.log(`📊 Cashier Analytics: ENABLED & CONSISTENT WITH SHOP MANAGEMENT`);
//         console.log(`💰 Payment Composition: ENABLED`);
//         console.log(`📈 Performance Metrics: ENABLED`);
//         console.log(`🏪 Shop Management: ENABLED`);
//         console.log(`📦 Product Management: ENABLED`);
//         console.log(`💳 Transaction Processing: ENABLED`);
//         console.log(`💰 Expense Tracking: ENABLED`);
//         console.log(`🔐 Authentication: ENABLED`);
//         console.log(`🎫 Barcode Management: ENABLED`);
//         console.log(`📝 Audit Logging: ENABLED`);
//         console.log(`🔄 Real-time Updates: ENABLED`);
//         console.log('='.repeat(60) + '\n');
//       });
      
//     } catch (error) {
//       console.error('❌ Failed to start server:', error);
//       process.exit(1);
//     }
//   };
  
//   startServer();
// }

// module.exports = {
//   app,
//   connectDB,
//   TokenManager,
//   CalculationUtils,
//   AnalyticsService,
//   models: cachedModels
// };