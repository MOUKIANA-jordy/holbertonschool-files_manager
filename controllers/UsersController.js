import crypto from 'crypto';
import dbClient from '../utils/db';

export default class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    // Vérifie si l'email existe déjà
    const existingUser = await dbClient.db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

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
}
