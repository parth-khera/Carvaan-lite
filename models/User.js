const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['student', 'faculty', 'admin', 'core-committee', 'teacher', 'hod', 'dean'], default: 'student' },
  rollNumber: String,
  department: String,
  year: String,
  phone: String,
  designation: String,
  residence: String,
  position: String,
  section: String,
  course: String,
  classTeacher: String,
  classCoordinator: String,
  hod: String,
  photo: String,
  theme: { type: String, default: 'maroon' },
  verified: { type: Boolean, default: false },
  portalAccess: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

module.exports = mongoose.model('User', userSchema);
