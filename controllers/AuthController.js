import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(request, response) {
    const authorization = request.header('Authorization');

    if (!authorization) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const authorizationParts = authorization.split(' ');

    if (
      authorizationParts.length !== 2
      || authorizationParts[0] !== 'Basic'
    ) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const encodedCredentials = authorizationParts[1];
    const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;

    if (
      !base64Pattern.test(encodedCredentials)
      || encodedCredentials.length % 4 !== 0
    ) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    let decodedCredentials;

    try {
      decodedCredentials = Buffer.from(
        encodedCredentials,
        'base64',
      ).toString('utf-8');
    } catch (error) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const separatorIndex = decodedCredentials.indexOf(':');

    if (separatorIndex === -1) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const email = decodedCredentials.substring(0, separatorIndex);
    const password = decodedCredentials.substring(separatorIndex + 1);

    if (!email || !password) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const usersCollection = dbClient.client
      .db(dbClient.databaseName)
      .collection('users');

    const user = await usersCollection.findOne({
      email,
      password: sha1(password),
    });

    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    const redisKey = `auth_${token}`;

    await redisClient.set(
      redisKey,
      user._id.toString(),
      24 * 60 * 60,
    );

    return response.status(200).json({ token });
  }

  static async getDisconnect(request, response) {
    const token = request.header('X-Token');

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const redisKey = `auth_${token}`;
    const userId = await redisClient.get(redisKey);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    await redisClient.del(redisKey);

    return response.status(204).send();
  }
}

export default AuthController;
