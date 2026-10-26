const router = require('express').Router();
const ctrl = require('../controllers/security.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Vehicles
router.post('/vehicles', protect, authorize('Resident'), ctrl.registerVehicle);
router.get('/vehicles/my', protect, authorize('Resident'), ctrl.getMyVehicles);
router.get('/vehicles', protect, authorize('Guard', 'Admin', 'SuperAdmin'), ctrl.searchVehicles);
router.delete('/vehicles/:id', protect, ctrl.deleteVehicle);

// Security dashboard
router.get('/security/dashboard', protect, authorize('Guard', 'Admin', 'SuperAdmin'), ctrl.getSecurityDashboard);

// Emergency contacts
router.get('/emergency-contacts', protect, ctrl.listEmergencyContacts);
router.post('/emergency-contacts', protect, authorize('Admin', 'SuperAdmin'), ctrl.addEmergencyContact);
router.delete('/emergency-contacts/:id', protect, authorize('Admin', 'SuperAdmin'), ctrl.deleteEmergencyContact);

// SOS
router.post('/sos', protect, authorize('Resident'), ctrl.triggerSos);
router.get('/sos', protect, authorize('Resident', 'Guard', 'Admin', 'SuperAdmin'), ctrl.listSosAlerts);
router.patch('/sos/:id/resolve', protect, authorize('Guard', 'Admin', 'SuperAdmin'), ctrl.resolveSos);

module.exports = router;
