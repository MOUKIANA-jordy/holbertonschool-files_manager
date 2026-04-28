import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

const router = (app) => {
  const paths = express.Router();

  app.use(express.json());
  app.use('/', paths);

  paths.get('/status', AppController.getStatus);
  paths.get('/stats', AppController.getStats);
  paths.post('/users', UsersController.postNew);
  paths.get('/connect', AuthController.getConnect);
  paths.get('/disconnect', AuthController.getDisconnect);
  paths.get('/users/me', UsersController.getMe);

  paths.post('/files', FilesController.postUpload);
  paths.get('/files/:id', FilesController.getShow);
  paths.get('/files', FilesController.getIndex);

  paths.put('/files/:id/publish', FilesController.putPublish);
  paths.put('/files/:id/unpublish', FilesController.putUnpublish);

  paths.get('/files/:id/data', FilesController.getFile);
};

export default router;
