const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'UNKNOWN', // can be: UP, DOWN, UNKNOWN
  },
  latency: {
    type: Number,
    default: null,
  },
  uptime: {
    type: Number,
    default: 0,
  },
  lastChecked: {
    type: Date,
    default: null,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Service', serviceSchema);
