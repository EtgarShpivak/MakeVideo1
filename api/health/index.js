// Health check API for verifying serverless function environment
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test making a request to external services
    const testUrl = 'https://api.fal.ai/ping';
    const dnsTest = await new Promise((resolve) => {
      const dns = require('dns');
      dns.lookup('api.fal.ai', (err, address) => {
        if (err) {
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true, address });
        }
      });
    });

    // Get environment information
    const info = {
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL_ENV || 'unknown',
      region: process.env.VERCEL_REGION || 'unknown',
      nodeVersion: process.version,
      dns: dnsTest,
      headers: req.headers
    };

    // Return success response
    return res.status(200).json({
      status: 'ok',
      message: 'Health check passed',
      info
    });
  } catch (error) {
    console.error('[HEALTH] Error in health check:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
}; 