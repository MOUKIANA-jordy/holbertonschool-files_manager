import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export default class AuthController {
  // GET /connect
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    let credentials;
    try {
      credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [email, password] = credentials.split(':');
    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Hash SHA1 du mot de passe
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

    // Recherche de l'utilisateur
    const user = await dbClient.db.collection('users').findOne({ email, password: hashedPassword });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Création du token
    const token = uuidv4();
    await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60); // 24h

    return res.status(200).json({ token });
  }

  // GET /disconnect
  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await redisClient.del(key);
    return res.status(204).send();
  }
}
