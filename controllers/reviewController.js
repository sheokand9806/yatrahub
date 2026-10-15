const Review = require('./../models/reviewModel');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');

exports.setTourUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);

// Reviews written by the logged-in user (with the tour they belong to)
exports.getMyReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ user: req.user.id })
    .populate({ path: 'tour', select: 'name slug imageCover' })
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { data: reviews }
  });
});

// Only the owner (or an admin) may change / delete a review
exports.checkReviewOwner = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError('No review found with that ID', 404));
  if (req.user.role !== 'admin' && review.user.id !== req.user.id)
    return next(new AppError('You can only change your own reviews.', 403));
  next();
});
