const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    ROLES, 
    PERMISSIONS, 
    requireRole, 
    hasPermission,
    hasAnyPermission
} = require('../middleware/rbacMiddleware');

const { 
    getDashboardStats, getAllTenants, getAllRooms, getAllPayments, 
    getAllRequests, createAdminRequest, updateTenant, deleteTenant,
    getConversations, getMessages, sendMessage, getUnreadCount,
    getPendingTenantsCount,
    createRoom, updateRoom, deleteRoom,
    getCashFlowOverview,
    getAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    getAdminNotifications,
    markAllAdminNotificationsRead,
    markAdminNotificationRead,
    getReportData,
    getActivityLogs,
    getSystemSettings,
    updateSystemSettings,
    getGcashQrCode,
    updateGcashQrCode,
    purgeSystemCache,
    getSystemDiagnostic
} = require('../controllers/adminController');
const { updateRequest, deleteRequest } = require('../controllers/requestController');

// All admin routes require valid authentication and administrative roles (RBAC)
router.use(protect);
router.use(requireRole([ROLES.ADMIN]));

// Analytics & Financial Dashboards
router.get('/dashboard', hasPermission(PERMISSIONS.REPORTS_READ), getDashboardStats);
router.get('/cashflow', hasPermission(PERMISSIONS.REPORTS_READ), getCashFlowOverview);

// Tenant Management (RBAC & Least Privilege)
router.get('/tenants', hasPermission(PERMISSIONS.TENANTS_READ), getAllTenants);
router.get('/tenants/pending-count', hasPermission(PERMISSIONS.TENANTS_READ), getPendingTenantsCount);
router.put('/tenants/:id', hasPermission(PERMISSIONS.TENANTS_UPDATE), updateTenant);
router.delete('/tenants/:id', hasPermission(PERMISSIONS.TENANTS_DELETE), deleteTenant);

// Room Inventory Management
router.get('/rooms', hasPermission(PERMISSIONS.ROOMS_READ), getAllRooms);
router.post('/rooms', hasPermission(PERMISSIONS.ROOMS_CREATE), createRoom);
router.put('/rooms/:id', hasPermission(PERMISSIONS.ROOMS_UPDATE), updateRoom);
router.delete('/rooms/:id', hasPermission(PERMISSIONS.ROOMS_DELETE), deleteRoom);

// Billing & Payments
router.get('/payments', hasPermission(PERMISSIONS.BILLS_READ), getAllPayments);

// Maintenance Requests
router.get('/requests', hasPermission(PERMISSIONS.REQUESTS_READ), getAllRequests);
router.post('/requests', hasPermission(PERMISSIONS.REQUESTS_CREATE), createAdminRequest);
router.put('/requests/:id', hasPermission(PERMISSIONS.REQUESTS_UPDATE), updateRequest);
router.delete('/requests/:id', hasPermission(PERMISSIONS.REQUESTS_DELETE), deleteRequest);

// Internal Communications
router.get('/chat/conversations', hasPermission(PERMISSIONS.CHAT_READ), getConversations);
router.get('/chat/unread', hasPermission(PERMISSIONS.CHAT_READ), getUnreadCount);
router.get('/chat', hasPermission(PERMISSIONS.CHAT_READ), getMessages);
router.post('/chat', hasPermission(PERMISSIONS.CHAT_SEND), sendMessage);

// Admin Notifications
router.get('/notifications', hasPermission(PERMISSIONS.ANNOUNCEMENTS_READ), getAdminNotifications);
router.post('/notifications/read-all', hasPermission(PERMISSIONS.ANNOUNCEMENTS_READ), markAllAdminNotificationsRead);
router.patch('/notifications/:id/read', hasPermission(PERMISSIONS.ANNOUNCEMENTS_READ), markAdminNotificationRead);

// System Announcements
router.get('/announcements', hasPermission(PERMISSIONS.ANNOUNCEMENTS_READ), getAnnouncements);
router.post('/announcements', hasPermission(PERMISSIONS.ANNOUNCEMENTS_CREATE), createAnnouncement);
router.delete('/announcements/:id', hasPermission(PERMISSIONS.ANNOUNCEMENTS_DELETE), deleteAnnouncement);

// Reports & Audit Logs
router.get('/reports', hasPermission(PERMISSIONS.REPORTS_READ), getReportData);
router.get('/activity-logs', hasPermission(PERMISSIONS.ACTIVITY_LOGS_READ), getActivityLogs);

// System Settings & High-Privilege Diagnostics (Least Privilege Protected)
router.get('/settings', hasPermission(PERMISSIONS.SETTINGS_READ), getSystemSettings);
router.put('/settings', hasPermission(PERMISSIONS.SETTINGS_UPDATE), updateSystemSettings);
router.get('/settings/gcash-qr', hasAnyPermission([PERMISSIONS.BILLS_READ, PERMISSIONS.SETTINGS_READ]), getGcashQrCode);
router.put('/settings/gcash-qr', hasAnyPermission([PERMISSIONS.BILLS_UPDATE, PERMISSIONS.SETTINGS_UPDATE]), updateGcashQrCode);
router.post('/settings/purge-cache', hasPermission(PERMISSIONS.SETTINGS_PURGE_CACHE), purgeSystemCache);
router.get('/settings/diagnostic', hasPermission(PERMISSIONS.SETTINGS_DIAGNOSTIC), getSystemDiagnostic);

module.exports = router;