import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';

const router = express.Router();

// App endpoints
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// Users endpoints
router.post('/users', UsersController.postNew);
router.get('/users/me', UsersController.getMe);

// Auth endpoints
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);

export default router;
