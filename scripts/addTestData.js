const mongoose = require('mongoose');
const Service = require('../models/Service'); // adjust path if needed

// Replace this with your actual MongoDB URI
const mongoURI = 'mongodb+srv://status:Status123@cluster0.ltcca2g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    await Service.create([
      { name: 'Frontend API', status: 'operational' },
      { name: 'Payments', status: 'down' },
      { name: 'Authentication', status: 'degraded' }
    ]);
    console.log('✅ Sample data added successfully');
    process.exit();
  })
  .catch(err => {
    console.error('❌ Error connecting to MongoDB:', err);
    process.exit(1);
  });
