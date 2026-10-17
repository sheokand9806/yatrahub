const express = require('express');
const rateLimit = require('express-rate-limit');
const chatbotController = require('./../controllers/chatbotController');

const router = express.Router();

const chatLimiter = rateLimit({
  limit: 10,
  windowMs: 10 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many chat requests. Please wait a few minutes and try again.'
  }
});

router.post('/', chatLimiter, chatbotController.reply);

module.exports = router;
