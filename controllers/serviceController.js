const Service = require('../models/Service');

const getAllServices = async (req, res) => {
  const services = await Service.find();
  res.json(services);
};

const createService = async (req, res) => {
  const { name, status } = req.body;
  const newService = new Service({ 
    name,
    status,
    lastUpdated: Date.now(),
  });
  await newService.save();
  
  // Emit WebSocket event
  req.app.get('io').emit('serviceCreated', newService);
  res.status(201).json(newService);
};

const updateServiceStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const updated = await Service.findByIdAndUpdate(
    id,
    {
      status,
      lastUpdated: Date.now(),
    }, 
    { new: true }
  );

  // Emit WebSocket event
  req.app.get('io').emit('serviceUpdated', updated);
  res.json(updated);
};

const deleteService = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Service.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Emit WebSocket event
    req.app.get('io').emit('serviceDeleted', id);
    res.status(200).json({ message: 'Service deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting service', error: err });
  }
};

module.exports = {
  getAllServices,
  createService,
  updateServiceStatus,
  deleteService
};