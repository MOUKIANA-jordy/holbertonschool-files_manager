import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import sha1 from 'sha1';

export default class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Décodage Base64
    const base64Credentials = authHeader.split(' ')[1];
    let credentials;
    try {
      credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [email, password] = credentials.split(':');
    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Cherche l'utilisateur dans MongoDB
    const user = await dbClient.db.collection('users').findOne({
      email,
      password: sha1(password), // Hash SHA1
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Génère token et enregistre dans Redis
    const token = uuidv4();
    await redisClient.set(`auth_${token}`, user._id.toString(), 'EX', 24 * 60 * 60);

    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}
