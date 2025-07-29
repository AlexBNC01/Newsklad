const http = require('http');

// Логирование переменных окружения
console.log('🔍 Test Server Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('PWD:', process.cwd());
console.log('Available ENV vars:', Object.keys(process.env).filter(key => 
  key.startsWith('JWT') || key.startsWith('DATABASE') || key === 'PORT' || key === 'NODE_ENV'
));

// Используем PORT как требует Timeweb (по умолчанию 3000)
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const response = {
    status: 'OK',
    message: 'Test server is working!',
    port: PORT,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    path: req.url,
    method: req.method,
    uptime: process.uptime(),
    envVars: {
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL
    }
  };
  
  console.log(`📡 Request: ${req.method} ${req.url}`);
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  
  res.end(JSON.stringify(response, null, 2));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 Test Server Started Successfully!
📍 Address: http://0.0.0.0:${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔌 Listening on port: ${PORT}
🎯 Server ready for connections!
⏰ Started at: ${new Date().toISOString()}
  `);
  
  console.log('✅ Server is listening on port:', server.address().port);
  console.log('✅ Server is listening on address:', server.address().address);
  console.log('✅ Server family:', server.address().family);
});

// Обработка ошибок
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down server...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down server...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

module.exports = server;