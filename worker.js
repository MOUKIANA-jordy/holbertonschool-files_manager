import fs from 'fs';
import pkg from 'mongodb';
import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const { ObjectId } = pkg;

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  if (!ObjectId.isValid(fileId) || !ObjectId.isValid(userId)) {
    throw new Error('File not found');
  }

  const filesCollection = dbClient.client
    .db(dbClient.databaseName)
    .collection('files');

  const file = await filesCollection.findOne({
    _id: new ObjectId(fileId),
    userId: new ObjectId(userId),
  });

  if (!file) {
    throw new Error('File not found');
  }

  const sizes = [500, 250, 100];

  await Promise.all(
    sizes.map(async (width) => {
      const thumbnail = await imageThumbnail(
        file.localPath,
        { width },
      );

      const thumbnailPath = `${file.localPath}_${width}`;

      await fs.promises.writeFile(thumbnailPath, thumbnail);
    }),
  );
});
