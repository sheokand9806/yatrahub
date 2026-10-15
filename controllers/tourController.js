const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../models/tourModel');
const Review = require('./../models/reviewModel');
const { clean } = require('./../utils/sanitize');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('./../utils/appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 4 }
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

// upload.single('image') req.file
// upload.array('images', 5) req.files

const TOUR_FIELDS = [
  'name', 'duration', 'maxGroupSize', 'difficulty', 'price', 'priceDiscount',
  'summary', 'description', 'startDates', 'startLocation', 'locations', 'guides',
  'imageCover', 'images'
];

const toPoint = loc => {
  const [lng, lat] = (loc.coordinates || []).map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    throw new AppError('Coordinates must be valid longitude and latitude numbers.', 400);
  return { ...loc, type: 'Point', coordinates: [lng, lat] };
};

// Accepts either plain JSON or multipart/form-data with one JSON field called "data"
// (needed because tours contain nested data plus image files). Only whitelisted fields get through.
exports.parseTourBody = (req, res, next) => {
  let data = req.body || {};
  if (typeof data.data === 'string') {
    try {
      data = JSON.parse(data.data);
    } catch {
      return next(new AppError('Invalid tour data.', 400));
    }
  }
  clean(data);
  const body = {};
  TOUR_FIELDS.forEach(f => {
    if (data[f] !== undefined) body[f] = data[f];
  });
  try {
    if (body.startLocation) body.startLocation = toPoint(body.startLocation);
    if (body.locations) body.locations = body.locations.map(toPoint);
  } catch (err) {
    return next(err);
  }
  if (body.priceDiscount === '' || body.priceDiscount === null) body.priceDiscount = undefined;
  req.body = body;
  next();
};

const saveJpeg = (buffer, filename) =>
  sharp(buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(path.join(__dirname, '..', 'public', 'img', 'tours', filename));

// Cover and gallery images are optional on update; only the ones sent are replaced
exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files) return next();
  const id = req.params.id || 'new';
  const stamp = Date.now();

  if (req.files.imageCover?.length) {
    req.body.imageCover = `tour-${id}-${stamp}-cover.jpeg`;
    await saveJpeg(req.files.imageCover[0].buffer, req.body.imageCover);
  }

  if (req.files.images?.length) {
    req.body.images = await Promise.all(
      req.files.images.map(async (file, i) => {
        const filename = `tour-${id}-${stamp}-${i + 1}.jpeg`;
        await saveJpeg(file.buffer, filename);
        return filename;
      })
    );
  }
  next();
});

// Express 5: req.query is a read-only getter, so assigning to it (or its keys) is lost.
// Replace the property on the request instead.
exports.aliasTopTours = (req, res, next) => {
  Object.defineProperty(req, 'query', {
    value: {
      ...req.query,
      limit: '5',
      sort: '-ratingsAverage,price',
      fields: 'name,price,ratingsAverage,summary,difficulty'
    },
    writable: true,
    configurable: true,
    enumerable: true
  });
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.getTourBySlug = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews'
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { data: tour }
  });
});

exports.createTour = catchAsync(async (req, res) => {
  const tour = await Tour.create(req.body);
  res.status(201).json({ status: 'success', data: { data: tour } });
});

// Load + save (instead of findByIdAndUpdate) so validators and the slug hook run on the full document
exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);
  if (!tour) return next(new AppError('No tour found with that ID', 404));
  tour.set(req.body);
  await tour.save();
  res.status(200).json({ status: 'success', data: { data: tour } });
});

// Deleting a tour also removes its reviews; past bookings are kept as payment records
exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);
  if (!tour) return next(new AppError('No tour found with that ID', 404));
  await Review.deleteMany({ tour: tour._id });
  res.status(204).json({ status: 'success', data: null });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.111745,-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // earth radius in mi / km

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  const tours = await Tour.find({
    startLocation: {
      $geoWithin: { $centerSphere: [[lng * 1, lat * 1], radius] }
    }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});
