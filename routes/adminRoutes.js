const express = require('express');
const adminController = require('./../controllers/adminController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect, authController.restrictTo('admin'));

router.get('/stats', adminController.getStats);
router.get('/bookings', adminController.getBookings);
router.get('/reviews', adminController.getReviews);
router.get('/tours', adminController.getTours);
router.get('/users', adminController.getUsers);

module.exports = router;
