const db = require('../config/db');

/**
 * System Roles Hierarchy
 * - admin: Property manager with administrative access to rooms, tenants, billing, maintenance
 * - staff: Front desk & maintenance operations with read/write access to tasks & rooms
 * - tenant: Resident with least-privilege scoped strictly to own resources
 */
const ROLES = {
    ADMIN: 'admin',
    STAFF: 'staff',
    TENANT: 'tenant'
};

/**
 * Granular Permissions Catalog
 */
const PERMISSIONS = {
    ALL: '*',

    // Rooms Management
    ROOMS_READ: 'rooms:read',
    ROOMS_CREATE: 'rooms:create',
    ROOMS_UPDATE: 'rooms:update',
    ROOMS_DELETE: 'rooms:delete',

    // Tenants Management
    TENANTS_READ: 'tenants:read',
    TENANTS_APPROVE: 'tenants:approve',
    TENANTS_UPDATE: 'tenants:update',
    TENANTS_DELETE: 'tenants:delete',

    // Billing & Financials
    BILLS_READ: 'bills:read',
    BILLS_CREATE: 'bills:create',
    BILLS_UPDATE: 'bills:update',
    BILLS_DELETE: 'bills:delete',
    BILLS_GENERATE: 'bills:generate',
    BILLS_REMINDERS: 'bills:reminders',
    BILLS_VERIFY_PAYMENT: 'bills:verify_payment',

    // Maintenance Requests
    REQUESTS_READ: 'requests:read',
    REQUESTS_CREATE: 'requests:create',
    REQUESTS_UPDATE: 'requests:update',
    REQUESTS_CANCEL: 'requests:cancel',
    REQUESTS_DELETE: 'requests:delete',

    // Communications & Announcements
    ANNOUNCEMENTS_READ: 'announcements:read',
    ANNOUNCEMENTS_CREATE: 'announcements:create',
    ANNOUNCEMENTS_DELETE: 'announcements:delete',
    CHAT_READ: 'chat:read',
    CHAT_SEND: 'chat:send',

    // System Reporting & Administration
    REPORTS_READ: 'reports:read',
    ACTIVITY_LOGS_READ: 'activity_logs:read',
    SETTINGS_READ: 'settings:read',
    SETTINGS_UPDATE: 'settings:update',
    SETTINGS_PURGE_CACHE: 'settings:purge_cache',
    SETTINGS_DIAGNOSTIC: 'settings:diagnostic',

    // Tenant Least Privilege Permissions (Scoped to Own Resources)
    PROFILE_MANAGE_OWN: 'profile:manage_own',
    ROOMS_READ_AVAILABLE: 'rooms:read_available',
    BILLS_READ_OWN: 'bills:read_own',
    BILLS_PAY_OWN: 'bills:pay_own',
    REQUESTS_READ_OWN: 'requests:read_own',
    REQUESTS_CREATE_OWN: 'requests:create_own',
    REQUESTS_CANCEL_OWN: 'requests:cancel_own',
    CHAT_SEND_ADMIN: 'chat:send_admin'
};

/**
 * Role-Based Permissions Mapping
 */
const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: [
        PERMISSIONS.ALL,
        PERMISSIONS.ROOMS_READ, PERMISSIONS.ROOMS_CREATE, PERMISSIONS.ROOMS_UPDATE, PERMISSIONS.ROOMS_DELETE,
        PERMISSIONS.TENANTS_READ, PERMISSIONS.TENANTS_APPROVE, PERMISSIONS.TENANTS_UPDATE, PERMISSIONS.TENANTS_DELETE,
        PERMISSIONS.BILLS_READ, PERMISSIONS.BILLS_CREATE, PERMISSIONS.BILLS_UPDATE, PERMISSIONS.BILLS_DELETE,
        PERMISSIONS.BILLS_GENERATE, PERMISSIONS.BILLS_REMINDERS, PERMISSIONS.BILLS_VERIFY_PAYMENT,
        PERMISSIONS.REQUESTS_READ, PERMISSIONS.REQUESTS_CREATE, PERMISSIONS.REQUESTS_UPDATE, PERMISSIONS.REQUESTS_CANCEL, PERMISSIONS.REQUESTS_DELETE,
        PERMISSIONS.ANNOUNCEMENTS_READ, PERMISSIONS.ANNOUNCEMENTS_CREATE, PERMISSIONS.ANNOUNCEMENTS_DELETE,
        PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_SEND,
        PERMISSIONS.REPORTS_READ, PERMISSIONS.ACTIVITY_LOGS_READ,
        PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_UPDATE, PERMISSIONS.SETTINGS_PURGE_CACHE, PERMISSIONS.SETTINGS_DIAGNOSTIC
    ],
    [ROLES.STAFF]: [
        PERMISSIONS.ROOMS_READ,
        PERMISSIONS.TENANTS_READ,
        PERMISSIONS.BILLS_READ,
        PERMISSIONS.REQUESTS_READ, PERMISSIONS.REQUESTS_CREATE, PERMISSIONS.REQUESTS_UPDATE,
        PERMISSIONS.ANNOUNCEMENTS_READ,
        PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_SEND
    ],
    [ROLES.TENANT]: [
        PERMISSIONS.PROFILE_MANAGE_OWN,
        PERMISSIONS.ROOMS_READ_AVAILABLE,
        PERMISSIONS.BILLS_READ_OWN,
        PERMISSIONS.BILLS_PAY_OWN,
        PERMISSIONS.REQUESTS_READ_OWN,
        PERMISSIONS.REQUESTS_CREATE_OWN,
        PERMISSIONS.REQUESTS_CANCEL_OWN,
        PERMISSIONS.ANNOUNCEMENTS_READ,
        PERMISSIONS.CHAT_SEND_ADMIN
    ]
};

/**
 * Resolve permissions list for a given role
 * @param {string} role 
 * @returns {string[]}
 */
const getPermissionsForRole = (role) => {
    return ROLE_PERMISSIONS[role] || [];
};

/**
 * Middleware: Verify user has a specific permission
 * @param {string} permission 
 */
const hasPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const userPermissions = req.user.permissions || getPermissionsForRole(req.user.role);

        if (userPermissions.includes(PERMISSIONS.ALL) || userPermissions.includes(permission)) {
            return next();
        }

        return res.status(403).json({
            code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
            message: `Access denied. Requires '${permission}' permission.`
        });
    };
};

/**
 * Middleware: Verify user has at least one of the specified permissions
 * @param {string[]} permissions 
 */
const hasAnyPermission = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const userPermissions = req.user.permissions || getPermissionsForRole(req.user.role);

        if (userPermissions.includes(PERMISSIONS.ALL) || permissions.some(p => userPermissions.includes(p))) {
            return next();
        }

        return res.status(403).json({
            code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
            message: `Access denied. Requires at least one of permissions: ${permissions.join(', ')}`
        });
    };
};

/**
 * Middleware: Verify user has an authorized role
 * @param {string|string[]} allowedRoles 
 */
const requireRole = (allowedRoles) => {
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Check role permission
        if (rolesArray.includes(req.user.role)) {
            return next();
        }

        return res.status(403).json({
            code: 'FORBIDDEN_ROLE_MISMATCH',
            message: `Access denied. Role '${req.user.role}' is not authorized for this resource.`
        });
    };
};

/**
 * Middleware: Principle of Least Privilege - Enforce Resource Ownership
 * Prevents Insecure Direct Object References (IDOR) by verifying that non-admin
 * callers are the genuine owners of the requested database record.
 * 
 * @param {Object} options
 * @param {string} options.table Database table name (e.g. 'requests', 'bills', 'payments')
 * @param {string} [options.idParam='id'] Parameter name in req.params
 * @param {string} [options.ownerColumn='tenant_id'] Column name holding the owner's user ID
 * @param {string[]} [options.adminRoles=['admin']] Roles exempt from ownership check
 */
const enforceOwnership = ({
    table,
    idParam = 'id',
    ownerColumn = 'tenant_id',
    adminRoles = [ROLES.ADMIN]
}) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            // Administrative roles with elevated privilege bypass ownership verification
            if (adminRoles.includes(req.user.role)) {
                return next();
            }

            const resourceId = req.params[idParam];
            if (!resourceId) {
                return res.status(400).json({ message: 'Resource ID parameter is missing' });
            }

            // Safe parameterized query to fetch the owner column
            const query = `SELECT id, ${ownerColumn} FROM ${table} WHERE id = $1`;
            const result = await db.query(query, [resourceId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Resource not found' });
            }

            const record = result.rows[0];
            const recordOwnerId = record[ownerColumn];

            if (String(recordOwnerId) !== String(req.user.id)) {
                return res.status(403).json({
                    code: 'FORBIDDEN_RESOURCE_OWNERSHIP',
                    message: 'Access denied: You do not have permission to access or modify this resource.'
                });
            }

            // Attach validated resource to request for downstream controller efficiency
            req.targetResource = record;
            next();
        } catch (error) {
            console.error('Least privilege ownership check error:', error);
            res.status(500).json({ message: 'Internal security authorization check failed' });
        }
    };
};

module.exports = {
    ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    getPermissionsForRole,
    hasPermission,
    hasAnyPermission,
    requireRole,
    enforceOwnership
};
