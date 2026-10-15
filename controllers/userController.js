const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });
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
  fileFilter: multerFilter
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(
      path.join(__dirname, '..', 'public', 'img', 'users', req.file.filename)
    );

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document (validators run on the changed fields)
  await User.updateOne({ _id: req.user.id }, filteredBody, {
    runValidators: true
  });
  const updatedUser = await User.findById(req.user.id);

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// ---- Admin user management ----
exports.createUser = catchAsync(async (req, res) => {
  const { name, email, role, password } = req.body;
  const user = await User.create({
    name,
    email,
    role: ['user', 'guide', 'lead-guide', 'admin'].includes(role) ? role : 'user',
    password,
    passwordConfirm: password
  });
  user.password = undefined;
  res.status(201).json({ status: 'success', data: { data: user } });
});

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Admins can change name, email and role (never passwords), but not their own role
exports.updateUser = catchAsync(async (req, res, next) => {
  const allowed = filterObj(req.body, 'name', 'email', 'role');
  if (allowed.role && req.params.id === req.user.id && allowed.role !== req.user.role)
    return next(new AppError('You cannot change your own role.', 400));

  const user = await User.findByIdAndUpdate(req.params.id, allowed, {
    returnDocument: 'after',
    runValidators: true
  });
  if (!user) return next(new AppError('No user found with that ID', 404));
  res.status(200).json({ status: 'success', data: { data: user } });
});

// "Delete" = deactivate: the account can no longer log in, but bookings and reviews stay intact
exports.deleteUser = catchAsync(async (req, res, next) => {
  if (req.params.id === req.user.id)
    return next(new AppError('You cannot delete your own account here.', 400));
  const user = await User.findByIdAndUpdate(req.params.id, { active: false });
  if (!user) return next(new AppError('No user found with that ID', 404));
  res.status(204).json({ status: 'success', data: null });
});
