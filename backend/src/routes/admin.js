const express = require('express');
const router = express.Router();
const { getStats, getUsers, createUser, updateUser, deleteUser, resetConsultas } = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-consultas', resetConsultas);

module.exports = router;
