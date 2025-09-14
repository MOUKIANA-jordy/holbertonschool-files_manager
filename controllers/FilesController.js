import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const ACCEPTED_TYPES = ['folder', 'file', 'image'];

export default class FilesController {
  static async postUpload(req, res) {
    try {
      // 1. Récupération de l'utilisateur via token
      const token = req.headers['x-token'];
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { name, type, parentId = 0, isPublic = false, data } = req.body;

      // 2. Vérifications des champs
      if (!name) return res.status(400).json({ error: 'Missing name' });
      if (!type || !ACCEPTED_TYPES.includes(type)) return res.status(400).json({ error: 'Missing type' });
      if (type !== 'folder' && !data) return res.status(400).json({ error: 'Missing data' });

      // 3. Vérification du parent si parentId fourni
      let parentObjectId = parentId;
      if (parentId !== 0) {
        const parentFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(parentId) });
        if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
        if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
        parentObjectId = new ObjectId(parentId);
      }

      // 4. Création du document
      const fileDoc = {
        userId: new ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? 0 : parentObjectId,
      };

      // 5. Gestion des fichiers physiques
      if (type !== 'folder') {
        const storagePath = process.env.FOLDER_PATH || '/tmp/files_manager';
        if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });

        const fileName = uuidv4();
        const filePath = path.join(storagePath, fileName);

        fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
        fileDoc.localPath = filePath;
      }

      // 6. Insertion dans la DB
      const result = await dbClient.db.collection('files').insertOne(fileDoc);

      // 7. Retour
      return res.status(201).json({
        id: result.insertedId,
        userId: userId,
        name: fileDoc.name,
        type: fileDoc.type,
        isPublic: fileDoc.isPublic,
        parentId: fileDoc.parentId,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}
