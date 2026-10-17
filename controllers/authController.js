const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const JWT_OPTIONS = { algorithms: ['HS256'] };
const GOOGLE_STATE_COOKIE = 'google_oauth_state';

const googleRedirectUri = () =>
  process.env.GOOGLE_REDIRECT_URI ||
  `${(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/v1/users/google/callback`;

const googleClient = () => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new AppError(
      'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      503
    );
  }

  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    googleRedirectUri()
  );
};

const clientUrl = () =>
  (process.env.CLIENT_URL || process.env.APP_URL || 'http://localhost:3000').replace(
    /\/$/,
    ''
  );

const googleStateCookieOptions = req => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  path: '/api/v1/users',
  maxAge: 10 * 60 * 1000
});

const setAuthCookie = (user, req, res) => {
  const token = signToken(user._id);
  const cookieDays = Number(process.env.JWT_COOKIE_EXPIRES_IN) || 90;

  res.cookie('jwt', token, {
    expires: new Date(Date.now() + cookieDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  });

  return token;
};

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = setAuthCookie(user, req, res);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  createSendToken(newUser, 201, req, res);

  new Email(newUser, url).sendWelcome().catch(err => {
    console.error('Welcome email could not be sent:', err.message);
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, req, res);
});

exports.googleLogin = catchAsync(async (req, res) => {
  const oauthClient = googleClient();
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie(GOOGLE_STATE_COOKIE, state, googleStateCookieOptions(req));

  const authUrl = oauthClient.generateAuthUrl({
    access_type: 'online',
    prompt: 'select_account',
    scope: ['openid', 'email', 'profile'],
    state
  });

  res.redirect(authUrl);
});

exports.googleCallback = catchAsync(async (req, res, next) => {
  const stateCookie = req.cookies[GOOGLE_STATE_COOKIE];
  res.clearCookie(GOOGLE_STATE_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    path: '/api/v1/users'
  });

  if (
    typeof req.query.state !== 'string' ||
    !stateCookie ||
    req.query.state !== stateCookie
  ) {
    return next(
      new AppError('Google sign-in could not be verified. Please try again.', 400)
    );
  }

  if (req.query.error || typeof req.query.code !== 'string') {
    return res.redirect(`${clientUrl()}/login?oauth=google_error`);
  }

  try {
    const oauthClient = googleClient();
    const { tokens } = await oauthClient.getToken(req.query.code);
    if (!tokens.id_token) {
      throw new Error('Google did not return an ID token.');
    }

    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || profile.email_verified !== true) {
      throw new Error('Google did not return a verified email address.');
    }

    const email = profile.email.toLowerCase();
    let user = await User.findOne({ googleId: profile.sub }).select('+googleId');
    if (!user) {
      user = await User.findOne({ email }).select('+googleId');
      if (user) {
        if (user.googleId && user.googleId !== profile.sub) {
          throw new AppError(
            'This email address is already linked to a different Google account.',
            409
          );
        }
        user.googleId = profile.sub;
        await user.save({ validateBeforeSave: false });
      } else {
        const password = crypto.randomBytes(32).toString('hex');
        user = await User.create({
          name: profile.name || email.split('@')[0],
          email,
          googleId: profile.sub,
          password,
          passwordConfirm: password
        });
      }
    }

    setAuthCookie(user, req, res);
    return res.redirect(clientUrl());
  } catch (err) {
    console.error('Google sign-in failed:', err.message);
    return res.redirect(`${clientUrl()}/login?oauth=google_error`);
  }
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: 'lax'
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token (a bad or expired token is turned into a 401 by the error handler)
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET,
    JWT_OPTIONS
  );

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

// Used by the React app on page load: tells it who is logged in (never errors)
exports.currentUser = async (req, res) => {
  let user = null;
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (token && token !== 'loggedout') {
      const decoded = await promisify(jwt.verify)(
        token,
        process.env.JWT_SECRET,
        JWT_OPTIONS
      );
      const currentUser = await User.findById(decoded.id);
      if (currentUser && !currentUser.changedPasswordAfter(decoded.iat)) {
        user = currentUser;
      }
    }
  } catch (err) {
    user = null;
  }

  res.status(200).json({ status: 'success', data: { user } });
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/reset-password/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});
