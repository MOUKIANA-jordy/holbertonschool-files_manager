import Bull from 'bull';
import fs from 'fs';
import path from 'path';
import imageThumbnail from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db.js';

const fileQueue = new Bull('fileQueue', {
  redis: { host: '127.0.0.1', port: 6379 },
});

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  const file = await dbClient.db.collection('files').findOne({
    _id: new ObjectId(fileId),
    userId: new ObjectId(userId),
  });

  if (!file) throw new Error('File not found');
  if (!file.localPath || !fs.existsSync(file.localPath)) throw new Error('Local file not found');

  const sizes = [500, 250, 100];

  for (const size of sizes) {
    const thumbnail = await imageThumbnail(file.localPath, { width: size });
    const ext = path.extname(file.localPath);
    const base = file.localPath.replace(ext, '');
    const thumbPath = `${base}_${size}${ext}`;
    fs.writeFileSync(thumbPath, thumbnail);
  }

  return true;
});

console.log('Worker running and processing fileQueue...');
