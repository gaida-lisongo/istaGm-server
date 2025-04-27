const authRoutes = require('./auth');
const userRoutes = require('./users');
const etudiantRoutes = require('./etudiants');
const commandeRoutes = require('./commandes');
const logsRoutes = require('./logs');
const sectionRoutes = require('./sections');
const promotionRoutes = require('./promotion');

// Add more route imports here as your application grows

module.exports = (app) => {
  app.use('/api/auth', authRoutes.router);
  app.use('/api/users', userRoutes);
  app.use('/api/etudiants', etudiantRoutes);
  app.use('/api/commandes', commandeRoutes);
  app.use('/api/logs', logsRoutes);
  app.use('/api/sections', sectionRoutes);
  app.use('/api/promotions', promotionRoutes);
  // Add more routes here
  
  // Default 404 handler for API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });
};