const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  date: { type: String, required: true },
  time: String,
  location: String,
  category: String,
  maxAttendees: Number,
  image: String,
  qrCode: String,
  manualCode: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'pending' },
  attendees: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    rollNumber: String,
    department: String,
    classTeacher: String,
    timestamp: { type: Date, default: Date.now },
    status: { type: String, default: 'pending' }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

module.exports = mongoose.model('Event', eventSchema);
