// Read-only endpoints that power the admin console (dashboard + list pages).
// Create / edit / delete use the normal tour, user, review and booking endpoints.
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Review = require('../models/reviewModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');

const paidOnly = { paid: { $ne: false } };

const bookingDto = b => ({
  id: b.id,
  price: b.price,
  paid: b.paid !== false,
  createdAt: b.createdAt,
  paymentId: b.razorpayPaymentId || null,
  orderId: b.razorpayOrderId || null,
  user: b.user ? { id: b.user.id, name: b.user.name, email: b.user.email, photo: b.user.photo } : null,
  tour: b.tour && b.tour.name
    ? { id: b.tour.id, name: b.tour.name, slug: b.tour.slug, imageCover: b.tour.imageCover }
    : null
});

const withTour = q =>
  q.populate({ path: 'tour', select: 'name slug imageCover' });

exports.getStats = catchAsync(async (req, res) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

  const [users, tours, reviews, totals, monthly, top, recent] = await Promise.all([
    User.countDocuments({ active: { $ne: false } }),
    Tour.countDocuments({ secretTour: { $ne: true } }),
    Review.aggregate([
      { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$rating' } } }
    ]),
    Booking.aggregate([
      { $match: paidOnly },
      { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$price' } } }
    ]),
    Booking.aggregate([
      { $match: { ...paidOnly, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          revenue: { $sum: '$price' },
          bookings: { $sum: 1 }
        }
      }
    ]),
    Booking.aggregate([
      { $match: paidOnly },
      { $group: { _id: '$tour', bookings: { $sum: 1 }, revenue: { $sum: '$price' } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: Tour.collection.name, localField: '_id', foreignField: '_id', as: 'tour' } },
      { $unwind: { path: '$tour', preserveNullAndEmptyArrays: true } },
      { $project: { bookings: 1, revenue: 1, name: '$tour.name', slug: '$tour.slug' } }
    ]),
    withTour(Booking.find().sort('-createdAt').limit(6))
  ]);

  // Fill months with no bookings so the chart always shows 6 bars
  const byKey = Object.fromEntries(
    monthly.map(m => [`${m._id.y}-${m._id.m}`, m])
  );
  const months = [];
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const hit = byKey[`${d.getFullYear()}-${d.getMonth() + 1}`];
    months.push({
      label: d.toLocaleString('en-US', { month: 'short' }),
      year: d.getFullYear(),
      revenue: hit ? hit.revenue : 0,
      bookings: hit ? hit.bookings : 0
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      users,
      tours,
      reviews: reviews[0]?.count || 0,
      avgRating: reviews[0] ? Math.round(reviews[0].avg * 10) / 10 : null,
      bookings: totals[0]?.count || 0,
      revenue: totals[0]?.revenue || 0,
      months,
      topTours: top,
      recentBookings: recent.map(bookingDto)
    }
  });
});

exports.getBookings = catchAsync(async (req, res) => {
  const bookings = await withTour(Booking.find().sort('-createdAt').limit(2000));
  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: { data: bookings.map(bookingDto) }
  });
});

exports.getReviews = catchAsync(async (req, res) => {
  const reviews = await Review.find()
    .sort('-createdAt')
    .limit(2000)
    .populate({ path: 'tour', select: 'name slug' });
  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      data: reviews.map(r => ({
        id: r.id,
        review: r.review,
        rating: r.rating,
        createdAt: r.createdAt,
        user: r.user ? { id: r.user.id, name: r.user.name, photo: r.user.photo } : null,
        tour: r.tour ? { id: r.tour.id, name: r.tour.name, slug: r.tour.slug } : null
      }))
    }
  });
});

exports.getTours = catchAsync(async (req, res) => {
  const [tours, stats] = await Promise.all([
    Tour.find().select('-locations -description -images').sort('name'),
    Booking.aggregate([
      { $match: paidOnly },
      { $group: { _id: '$tour', bookings: { $sum: 1 }, revenue: { $sum: '$price' } } }
    ])
  ]);
  const byTour = Object.fromEntries(stats.map(s => [String(s._id), s]));
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours.map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        imageCover: t.imageCover,
        price: t.price,
        priceDiscount: t.priceDiscount,
        duration: t.duration,
        maxGroupSize: t.maxGroupSize,
        difficulty: t.difficulty,
        ratingsAverage: t.ratingsAverage,
        ratingsQuantity: t.ratingsQuantity,
        startLocation: t.startLocation?.description,
        nextDate: (t.startDates || [])[0] || null,
        bookings: byTour[t.id]?.bookings || 0,
        revenue: byTour[t.id]?.revenue || 0
      }))
    }
  });
});

exports.getUsers = catchAsync(async (req, res) => {
  const [users, stats] = await Promise.all([
    User.find().sort('name'),
    Booking.aggregate([
      { $match: paidOnly },
      { $group: { _id: '$user', bookings: { $sum: 1 }, spent: { $sum: '$price' } } }
    ])
  ]);
  const byUser = Object.fromEntries(stats.map(s => [String(s._id), s]));
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      data: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        photo: u.photo,
        role: u.role,
        bookings: byUser[u.id]?.bookings || 0,
        spent: byUser[u.id]?.spent || 0
      }))
    }
  });
});
