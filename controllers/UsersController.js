import sha1 from 'sha1';
import dbClient from '../utils/db.mjs';

class UsersController {
  static async postNew(request, response) {
    const { email, password } = request.body;

    if (!email) {
      return response.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return response.status(400).json({ error: 'Missing password' });
    }

    const database = dbClient.client.db(dbClient.databaseName);
    const usersCollection = database.collection('users');

    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      return response.status(400).json({ error: 'Already exist' });
    }

    const result = await usersCollection.insertOne({
      email,
      password: sha1(password),
    });

    return response.status(201).json({
      id: result.insertedId.toString(),
      email,
    });
  }
}

export default UsersController;
