const path = require('path');
const fs = require('fs');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const {
  createQueryParser,
  sanitizeBodyAndParams
} = require('./utils/sanitize');
const bookingController = require('./controllers/bookingController');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const adminRouter = require('./routes/adminRoutes');
const chatbotRouter = require('./routes/chatbotRoutes');

// Start express app
const app = express();

app.set('trust proxy', 1);

// Express 5 defaults to the "simple" query parser. We need the extended (qs) parser for
// filters like ?price[gte]=20000, and we sanitise + de-duplicate the query while parsing.
app.set(
  'query parser',
  createQueryParser([
    'duration',
    'ratingsQuantity',
    'ratingsAverage',
    'maxGroupSize',
    'difficulty',
    'price'
  ])
);

const isProd = process.env.NODE_ENV === 'production';
const clientDist = path.join(__dirname, 'client', 'dist');

// 1) GLOBAL MIDDLEWARES
// Implement CORS (also answers pre-flight OPTIONS requests)
app.use(cors());

// Set security HTTP headers (CSP allows the React bundle, Google Fonts and OpenStreetMap tiles)
app.use(
  helmet({
    // OpenStreetMap rejects tile requests that carry no Referer (helmet's default is no-referrer)
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Razorpay opens a popup for card / bank confirmation; helmet's default same-origin COOP breaks it
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
        frameSrc: ['https://api.razorpay.com', 'https://checkout.razorpay.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://*.tile.openstreetmap.org',
          'https://*.razorpay.com'
        ],
        connectSrc: ["'self'", 'https://*.razorpay.com'],
        formAction: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: isProd ? [] : null
      }
    }
  })
);

// Serving static files (images, css, uploaded photos + the built React app)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(clientDist, { index: false }));

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same IP
const limiter = rateLimit({
  limit: isProd ? 100 : 2000,
  windowMs: 60 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again in an hour!'
  }
});
app.use('/api', limiter);

// Razorpay webhook, BEFORE the JSON body parser, because the signature is computed over the raw body
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection and XSS (query string is handled
// by the query parser configured above)
app.use(sanitizeBodyAndParams);

app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 2) API ROUTES
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/chatbot', chatbotRouter);

app.all('/api/{*splat}', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 3) REACT APP (single page app - every other GET returns index.html)
app.get('/{*splat}', (req, res, next) => {
  const indexFile = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  next(
    new AppError(
      'The React client has not been built yet. Run "npm run build" (or "npm run dev" for development).',
      404
    )
  );
});

app.all('/{*splat}', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
