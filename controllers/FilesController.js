import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import fs from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async getFile(req, res) {
    const fileId = req.params.id;

    // 1. Récupérer le fichier
    let file;
    try {
      file = await dbClient.db.collection('files').findOne({
        _id: ObjectId(fileId),
      });
    } catch (e) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    // 2. Authentification optionnelle
    const token = req.header('X-Token');
    let userId = null;

    if (token) {
      userId = await redisClient.get(`auth_${token}`);
    }

    // 3. Vérifier accès
    if (!file.isPublic && (!userId || file.userId.toString() !== userId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    // 4. Si dossier
    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    // 5. Vérifier fichier local
    if (!fs.existsSync(file.localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    // 6. Lire le fichier
    const content = fs.readFileSync(file.localPath);

    // 7. MIME type
    const mimeType = mime.lookup(file.name) || 'text/plain';

    res.setHeader('Content-Type', mimeType);
    return res.status(200).send(content);
  }
}

export default FilesController;
