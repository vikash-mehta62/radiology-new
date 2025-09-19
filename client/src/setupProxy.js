const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('🔧 Setting up proxy middleware for /api routes');
  
  const proxyOptions = {
    target: process.env.REACT_APP_API_URL || 'http://localhost:8000',
    changeOrigin: true,
    secure: false,
    logLevel: 'info',
    onError: (err, req, res) => {
      console.error('❌ Proxy Error:', err.message);
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log('🔄 Proxying:', req.method, req.url, '→', proxyReq.path);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log('✅ Response:', proxyRes.statusCode, 'for', req.url);
    }
  };
  
  app.use('/api', createProxyMiddleware(proxyOptions));
  
  console.log(`✅ Proxy middleware setup complete for /api → ${proxyOptions.target}`);
};

console.log('📁 setupProxy.js file loaded');
