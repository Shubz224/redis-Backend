const { getCachedProducts, cacheProducts } = require('../utils/cache');

// Generic cache middleware
const cacheMiddleware = (keyPrefix, expiry = 300) => {
  return async (req, res, next) => {
    // Generate cache key from request
    const cacheKey = `${keyPrefix}:${JSON.stringify(req.query)}:${req.params.id || ''}`;
    
    try {
      const cachedData = await getCachedProducts(cacheKey);
      
      if (cachedData) {
        return res.status(200).json(cachedData);
      }
      
      // Store original res.json to intercept response
      const originalJson = res.json;
      
      res.json = function(body) {
        // Cache successful responses only
        if (res.statusCode === 200) {
          cacheProducts(cacheKey, body, expiry).catch(console.error);
        }
        
        // Call original json method
        originalJson.call(this, body);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

module.exports = cacheMiddleware;
