import express from 'express';
import AppController from '../controllers/AppController.js';
import UsersController from '../controllers/UsersController.js';
import AuthController from '../controllers/AuthController.js';

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
