import sha1 from 'sha1';
import pkg from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { ObjectId } = pkg;

class UsersController {
  static async postNew(request, response) {
    const { email, password } = request.body;

    if (!email) {
      return response.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return response.status(400).json({ error: 'Missing password' });
    }

    const usersCollection = dbClient.client
      .db(dbClient.databaseName)
      .collection('users');

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

  static async getMe(request, response) {
    const token = request.header('X-Token');

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const redisKey = `auth_${token}`;
    const userId = await redisClient.get(redisKey);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const usersCollection = dbClient.client
      .db(dbClient.databaseName)
      .collection('users');

    let user;

    try {
      user = await usersCollection.findOne({
        _id: new ObjectId(userId),
      });
    } catch (error) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    return response.status(200).json({
      id: user._id.toString(),
      email: user.email,
    });
  }
}

export default UsersController;
