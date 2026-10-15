const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Tour = require('./../../models/tourModel');
const Review = require('./../../models/reviewModel');
const User = require('./../../models/userModel');

dotenv.config({ path: path.join(__dirname, '..', '..', 'config.env'), quiet: true });

const { connectDB } = require('./../../utils/connectDB');

// READ JSON FILE
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
// All demo accounts use the password "test1234" (hashed again by the model on save)
const users = JSON.parse(
  fs.readFileSync(`${__dirname}/users.json`, 'utf-8')
).map(u => ({
  ...u,
  password: 'test1234',
  passwordConfirm: 'test1234'
}));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users);
    await Review.create(reviews);
    console.log('Data successfully loaded!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Data successfully deleted!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

(async () => {
  await connectDB();
  if (process.argv[2] === '--import') {
    await importData();
  } else if (process.argv[2] === '--delete') {
    await deleteData();
  } else {
    console.log('Use --import or --delete');
    process.exit();
  }
})();
