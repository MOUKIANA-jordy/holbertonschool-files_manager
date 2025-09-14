import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();

    this.client.on('error', (err) => {
      console.log('Redis client not connected to the server:', err.message);
    });

    this.client.on('ready', () => {
      console.log('Redis client connected to the server');
    });

    // Promisify pour pouvoir utiliser await avec get
    this.getAsync = promisify(this.client.get).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return this.getAsync(key);
  }

  async set(key, value, duration) {
    // Définit une clé avec expiration
    this.client.setex(key, duration, value);
  }

  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
