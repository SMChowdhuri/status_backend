const mongoose = require('mongoose');

const statusLogSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  },
  status: {
    type: String,
    enum: ['UP', 'DOWN'],
    required: true,
  },
  latency: {
    type: Number,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('StatusLog', statusLogSchema);
