const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Admin dashboards
router.get('/dashboard/overview', protect, authorize('Admin', 'SuperAdmin'), ctrl.overview);
router.get('/dashboard/financial', protect, authorize('Admin', 'SuperAdmin'), ctrl.financialDashboard);
router.get('/dashboard/maintenance', protect, authorize('Admin', 'SuperAdmin'), ctrl.maintenanceDashboard);
router.get('/dashboard/visitors', protect, authorize('Admin', 'SuperAdmin'), ctrl.visitorDashboard);
router.get('/dashboard/bookings', protect, authorize('Admin', 'SuperAdmin'), ctrl.bookingDashboard);

// Notifications (all authenticated users)
router.get('/notifications', protect, ctrl.listNotifications);
router.patch('/notifications/read-all', protect, ctrl.markAllRead);
router.patch('/notifications/:id/read', protect, ctrl.markNotificationRead);
router.patch('/notifications/:id/react', protect, ctrl.reactNotification);
router.patch('/notifications/:id/dismiss', protect, ctrl.dismissNotification);
router.delete('/notifications/:id', protect, ctrl.deleteNotification);
router.delete('/notifications', protect, ctrl.clearNotifications);

module.exports = router;
