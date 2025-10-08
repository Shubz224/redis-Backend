const { client } = require('../config/redis');

// Cache products for ecommerce
const cacheProducts = async (key, data, expiry = 300) => {
  try {
    await client.setEx(key, expiry, JSON.stringify(data));
  } catch (error) {
    console.error('Cache set error:', error);
  }
};

const getCachedProducts = async (key) => {
  try {
    const cachedData = await client.get(key);
    return cachedData ? JSON.parse(cachedData) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

const deleteCachedData = async (pattern) => {
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.error('Cache delete error:', error);
  }
};

module.exports = {
  cacheProducts,
  getCachedProducts,
  deleteCachedData,
};
