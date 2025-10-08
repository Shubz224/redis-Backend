const redis = require("redis");

const client = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 10000, // 10 seconds
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.log("Redis: Max reconnection attempts reached");
        return new Error("Max reconnection attempts reached");
      }
      const delay = Math.min(retries * 100, 3000);
      console.log(`Redis: Reconnecting in ${delay}ms...`);
      return delay;
    },
  },
});

// Event handlers
client.on("error", (err) => {
  console.error("Redis Client Error:", err.message);
});

client.on("connect", () => {
  console.log("Redis: Attempting to connect...");
});

client.on("ready", () => {
  console.log("Redis: Connected and ready");
});

client.on("reconnecting", () => {
  console.log("Redis: Reconnecting...");
});

client.on("end", () => {
  console.log("Redis: Connection closed");
});

const connectRedis = async () => {
  try {
    if (!client.isOpen) {
      await client.connect();
      console.log("✅ Redis Connected Successfully");
    }
  } catch (error) {
    console.error("❌ Redis connection error:", error.message);
    // Don't exit process, let app continue without Redis
  }
};

// Graceful shutdown
const disconnectRedis = async () => {
  try {
    if (client.isOpen) {
      await client.quit();
      console.log("Redis disconnected gracefully");
    }
  } catch (error) {
    console.error("Redis disconnect error:", error.message);
  }
};

module.exports = { client, connectRedis, disconnectRedis };