const crypto = require('crypto');
const Razorpay = require('razorpay');
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const Email = require('../utils/email');
const factory = require('./handlerFactory');
const { formatINR } = require('../utils/format');

let razorpayClient;
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new AppError(
      'Payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in config.env to enable booking.',
      503
    );
  }
  if (!razorpayClient) {
    const id = process.env.RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    console.log(
      `Razorpay: using key ${id} (${id.startsWith('rzp_test_') ? 'TEST' : id.startsWith('rzp_live_') ? 'LIVE' : 'UNKNOWN type'}), secret length ${secret.length}` +
        (id !== id.trim() || secret !== secret.trim() ? ' - WARNING: spaces around a key!' : '')
    );
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID.trim(),
      key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
    });
  }
  return razorpayClient;
};

// Razorpay's SDK throws plain objects ({ statusCode, error: { description } }), not Errors.
// Turn them into a normal AppError so the user sees a clear message.
const rzp = async call => {
  try {
    return await call();
  } catch (err) {
    if (err instanceof AppError) throw err;
    const description = err?.error?.description || err?.message || 'Payment provider error';
    const hint =
      err?.statusCode === 401
        ? ' Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in config.env (they must be a matching pair, test or live) and restart the server.'
        : '';
    console.error('Razorpay error:', err?.statusCode, description);
    throw new AppError(`Razorpay: ${description}.${hint}`, err?.statusCode === 401 ? 502 : 400);
  }
};

// Saves a booking for a paid order. Safe to call twice (browser verify + webhook): the second call is a no-op.
const recordBooking = async (order, paymentId) => {
  if (await Booking.findOne({ razorpayPaymentId: paymentId })) return false;
  let booking;
  try {
    booking = await Booking.create({
      tour: order.notes.tourId,
      user: order.notes.userId,
      price: order.amount / 100, // paise -> rupees
      razorpayOrderId: order.id,
      razorpayPaymentId: paymentId
    });
  } catch (err) {
    if (err.code === 11000) return false; // lost a race with the other path
    throw err;
  }

  // Confirmation email (sent once, right after the booking is first saved). Never fails the payment.
  try {
    const [user, tour] = await Promise.all([
      User.findById(order.notes.userId),
      Tour.findById(order.notes.tourId)
    ]);
    if (user && tour) {
      const url = `${process.env.APP_URL || 'http://localhost:3000'}/my-tours`;
      await new Email(user, url, {
        tourName: `${tour.name} Tour`,
        duration: tour.duration,
        startLocation: tour.startLocation?.description || '-',
        startDate: tour.startDates?.[0]
          ? new Date(tour.startDates[0]).toLocaleString('en-IN', {
              month: 'long',
              year: 'numeric'
            })
          : 'To be announced',
        difficulty: tour.difficulty,
        amount: formatINR(booking.price),
        paymentId,
        orderId: order.id,
        paidOn: new Date(booking.createdAt).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Kolkata'
        })
      }).sendBookingConfirmation();
    }
  } catch (err) {
    console.error('Booking confirmation email could not be sent:', err.message);
  }
  return true;
};

// Step 1: create a Razorpay order for the tour. The browser then opens Razorpay Checkout with it.
exports.createOrder = catchAsync(async (req, res, next) => {
  const razorpay = getRazorpay();

  const tour = await Tour.findById(req.params.tourId);
  if (!tour) return next(new AppError('No tour found with that ID', 404));

  // Razorpay amounts are in paise (₹1 = 100 paise). The price is always read from the DB, never the client.
  const order = await rzp(() => razorpay.orders.create({
    amount: Math.round(tour.price * 100),
    currency: 'INR',
    receipt: `tour_${tour.id}`.slice(0, 40),
    notes: { tourId: tour.id, userId: req.user.id }
  }));

  res.status(200).json({
    status: 'success',
    order: {
      id: order.id,
      amount: order.amount,
      currency: order.currency
    },
    keyId: process.env.RAZORPAY_KEY_ID,
    tour: { name: `${tour.name} Tour`, summary: tour.summary },
    user: { name: req.user.name, email: req.user.email }
  });
});

// Step 2: after payment, the browser sends back the 3 values Razorpay gives it. We verify the
// signature (HMAC SHA256 of "order_id|payment_id" with the key secret) and only then save the booking.
exports.verifyPayment = catchAsync(async (req, res, next) => {
  const razorpay = getRazorpay();
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature
  } = req.body;

  if (!orderId || !paymentId || !signature)
    return next(new AppError('Missing payment details.', 400));

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const valid =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!valid) return next(new AppError('Payment verification failed.', 400));

  // Trust Razorpay's copy of the order (not the browser) for tour, user and amount
  const order = await rzp(() => razorpay.orders.fetch(orderId));
  if (order.notes?.userId !== req.user.id)
    return next(new AppError('This payment does not belong to you.', 403));

  await recordBooking(order, paymentId);
  res.status(200).json({ status: 'success' });
});

// Safety net: Razorpay calls this when a payment is captured, even if the user closed the browser
// before the confirmation reached us. Set the URL + secret in the Razorpay dashboard (see README).
exports.webhookCheckout = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  if (!secret || !signature) return res.status(400).send('Webhook not configured');

  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  const valid =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!valid) return res.status(400).send('Invalid signature');

  try {
    const event = JSON.parse(req.body.toString('utf8'));
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const order = await getRazorpay().orders.fetch(payment.order_id);
      if (order.notes?.tourId && order.notes?.userId)
        await recordBooking(order, payment.id);
    }
  } catch (err) {
    console.error('Razorpay webhook error:', err.message);
    return res.status(500).send('Error'); // Razorpay will retry
  }
  res.status(200).json({ received: true });
};

// Tours the logged in user has booked (used by the "My bookings" page)
// Payment history for the logged-in user (billing page)
exports.getMyBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id }).sort('-createdAt');
  const tours = await Tour.find({
    _id: { $in: bookings.map(b => b.tour.id || b.tour) }
  }).select('name slug imageCover duration startLocation startDates difficulty');
  const byId = Object.fromEntries(tours.map(t => [t.id, t]));

  const data = bookings.map(b => ({
    id: b.id,
    price: b.price,
    paid: b.paid,
    createdAt: b.createdAt,
    paymentId: b.razorpayPaymentId || null,
    orderId: b.razorpayOrderId || null,
    tour: byId[b.tour.id || b.tour] || null
  }));

  res.status(200).json({ status: 'success', results: data.length, data: { data } });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find tours with the returned IDs
  const tourIDs = bookings.map(el => el.tour.id || el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { data: tours }
  });
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
