import fs from 'fs';
import path from 'path';
import pkg from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { ObjectId } = pkg;

const formatFile = (file) => ({
  id: file._id.toString(),
  userId: file.userId.toString(),
  name: file.name,
  type: file.type,
  isPublic: file.isPublic === true,
  parentId: file.parentId === 0 || file.parentId === '0'
    ? 0
    : file.parentId.toString(),
});

class FilesController {
  static async postUpload(request, response) {
    const token = request.header('X-Token');

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name,
      type,
      data,
    } = request.body;

    const parentId = request.body.parentId || 0;
    const isPublic = request.body.isPublic === true;
    const validTypes = ['folder', 'file', 'image'];

    if (!name) {
      return response.status(400).json({ error: 'Missing name' });
    }

    if (!type || !validTypes.includes(type)) {
      return response.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return response.status(400).json({ error: 'Missing data' });
    }

    const filesCollection = dbClient.client
      .db(dbClient.databaseName)
      .collection('files');

    let databaseParentId = 0;

    if (parentId !== 0 && parentId !== '0') {
      if (!ObjectId.isValid(parentId)) {
        return response.status(400).json({ error: 'Parent not found' });
      }

      databaseParentId = new ObjectId(parentId);

      const parentFile = await filesCollection.findOne({
        _id: databaseParentId,
      });

      if (!parentFile) {
        return response.status(400).json({ error: 'Parent not found' });
      }

      if (parentFile.type !== 'folder') {
        return response
          .status(400)
          .json({ error: 'Parent is not a folder' });
      }
    }

    const newFile = {
      userId: new ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: databaseParentId,
    };

    if (type !== 'folder') {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

      await fs.promises.mkdir(folderPath, { recursive: true });

      const localPath = path.join(folderPath, uuidv4());
      const fileContent = Buffer.from(data, 'base64');

      await fs.promises.writeFile(localPath, fileContent);

      newFile.localPath = localPath;
    }

    const result = await filesCollection.insertOne(newFile);

    return response.status(201).json({
      id: result.insertedId.toString(),
      userId,
      name,
      type,
      isPublic,
      parentId: databaseParentId === 0
        ? 0
        : databaseParentId.toString(),
    });
  }

  static async getShow(request, response) {
    const token = request.header('X-Token');

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = request.params;

    if (!ObjectId.isValid(id)) {
      return response.status(404).json({ error: 'Not found' });
    }

    const filesCollection = dbClient.client
      .db(dbClient.databaseName)
      .collection('files');

    const file = await filesCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
    });

    if (!file) {
      return response.status(404).json({ error: 'Not found' });
    }

    return response.status(200).json(formatFile(file));
  }

  static async getIndex(request, response) {
    const token = request.header('X-Token');

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const requestedParentId = request.query.parentId || 0;
    const requestedPage = Number.parseInt(request.query.page, 10);
    const page = Number.isNaN(requestedPage)
      ? 0
      : Math.max(requestedPage, 0);

    let parentFilter;

    if (requestedParentId === 0 || requestedParentId === '0') {
      parentFilter = { $in: [0, '0'] };
    } else if (ObjectId.isValid(requestedParentId)) {
      parentFilter = new ObjectId(requestedParentId);
    } else {
      return response.status(200).json([]);
    }

    const filesCollection = dbClient.client
      .db(dbClient.databaseName)
      .collection('files');

    const files = await filesCollection.aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          parentId: parentFilter,
        },
      },
      { $skip: page * 20 },
      { $limit: 20 },
    ]).toArray();

    return response.status(200).json(files.map(formatFile));
  }
}

export default FilesController;
