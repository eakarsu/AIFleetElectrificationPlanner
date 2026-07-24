const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  app.use('/api', createProxyMiddleware({
    target: process.env.REACT_APP_API_ORIGIN || 'http://127.0.0.1:4000',
    changeOrigin: true,
  }));
};
