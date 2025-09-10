// utils/redis.mjs
import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();

    // Gestion des erreurs
    this.client.on('error', (err) => {
      console.error('Erreur du client Redis :', err);
    });

    // Connexion automatique
    this.client.connect().catch((err) => {
      console.error('Erreur de connexion Redis :', err);
    });
  }

  /**
   * Vérifie si la connexion Redis est active
   * @returns {boolean}
   */
  isAlive() {
    return this.client.isOpen;
  }

  /**
   * Récupère une valeur par sa clé
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    try {
      const value = await this.client.get(key);
      return value;
    } catch (err) {
      console.error(`Erreur lors de la récupération de la clé ${key} :`, err);
      return null;
    }
  }

  /**
   * Définit une valeur avec une durée d’expiration
   * @param {string} key
   * @param {string|number} value
   * @param {number} duration en secondes
   */
  async set(key, value, duration) {
    try {
      await this.client.set(key, value, { EX: duration });
    } catch (err) {
      console.error(`Erreur lors de l’enregistrement de la clé ${key} :`, err);
    }
  }

  /**
   * Supprime une clé
   * @param {string} key
   */
  async del(key) {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error(`Erreur lors de la suppression de la clé ${key} :`, err);
    }
  }
}

// On crée et exporte une instance unique
const redisClient = new RedisClient();
export default redisClient;
