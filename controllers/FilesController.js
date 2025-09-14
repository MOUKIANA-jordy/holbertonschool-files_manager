import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import mime from 'mime-types'; // <-- AJOUT
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const ACCEPTED_TYPES = ['folder', 'file', 'image'];

export default class FilesController {
  // Créer un nouveau fichier ou dossier
  static async postUpload(req, res) {
    try {
      const token = req.headers['x-token'];
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const {
        name,
        type,
        parentId = 0,
        isPublic = false,
        data,
      } = req.body;

      if (!name) return res.status(400).json({ error: 'Missing name' });
      if (!type || !ACCEPTED_TYPES.includes(type)) return res.status(400).json({ error: 'Missing type' });
      if (type !== 'folder' && !data) return res.status(400).json({ error: 'Missing data' });

      const queryParentId = parentId === 0 || parentId === '0' ? 0 : new ObjectId(parentId);

      if (parentId !== 0) {
        const parentFile = await dbClient.db.collection('files').findOne({ _id: queryParentId });
        if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
        if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
      }

      const fileDoc = {
        userId: new ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: queryParentId,
      };

      if (type !== 'folder') {
        const storagePath = process.env.FOLDER_PATH || '/tmp/files_manager';
        if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });

        const fileName = uuidv4();
        const filePath = path.join(storagePath, fileName);

        fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
        fileDoc.localPath = filePath;
      }

      const result = await dbClient.db.collection('files').insertOne(fileDoc);

      return res.status(201).json({
        id: result.insertedId,
        userId,
        name: fileDoc.name,
        type: fileDoc.type,
        isPublic: fileDoc.isPublic,
        parentId: fileDoc.parentId,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Récupérer un fichier par son ID
  static async getShow(req, res) {
    try {
      const token = req.headers['x-token'];
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const fileId = req.params.id;
      if (!fileId) return res.status(404).json({ error: 'Not found' });

      const file = await dbClient.db.collection('files').findOne({
        _id: new ObjectId(fileId),
        userId: new ObjectId(userId),
      });

      if (!file) return res.status(404).json({ error: 'Not found' });

      return res.status(200).json({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Lister les fichiers pour un parentId avec pagination
  static async getIndex(req, res) {
    try {
      const token = req.headers['x-token'];
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const parentId = req.query.parentId || 0;
      const page = parseInt(req.query.page, 10) || 0;

      const queryParentId = parentId === 0 || parentId === '0' ? 0 : new ObjectId(parentId);

      const files = await dbClient.db.collection('files')
        .find({ parentId: queryParentId, userId: new ObjectId(userId) })
        .skip(page * 20)
        .limit(20)
        .toArray();

      const result = files.map((file) => ({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      }));

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Récupérer le contenu d’un fichier
  static async getFile(req, res) {
    try {
      const fileId = req.params.id;
      const token = req.headers['x-token'];
      let userId = null;

      if (token) {
        userId = await redisClient.get(`auth_${token}`);
      }

      const file = await dbClient.db.collection('files').findOne({
        _id: new ObjectId(fileId),
      });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (!file.isPublic) {
        if (!userId || file.userId.toString() !== userId) {
          return res.status(404).json({ error: 'Not found' });
        }
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      if (!file.localPath || !fs.existsSync(file.localPath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const mimeType = mime.lookup(file.name) || 'application/octet-stream';
      const fileContent = fs.readFileSync(file.localPath);

      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(fileContent);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}
