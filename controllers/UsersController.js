import crypto from 'crypto';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { ObjectId } from 'mongodb';

export default class UsersController {
  // Création d'un nouvel utilisateur
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    // Vérifie si l'email existe déjà
    const existingUser = await dbClient.db.collection('users').findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Already exist' });

    // Hash SHA1 du mot de passe
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

    // Crée le nouvel utilisateur
    const result = await dbClient.db.collection('users').insertOne({
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      id: result.insertedId,
      email,
    });
  }

  // Récupération de l'utilisateur connecté via token
  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let user;
    try {
      user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    return res.status(200).json({ id: user._id, email: user.email });
  }
}
