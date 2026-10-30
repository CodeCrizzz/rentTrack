require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { corsOptions } = require('./config/corsConfig');
require('./config/db'); 

// Initialize automated billing & payment reminder cron jobs
require('./cron/billingCron');

const app = express();

// Import Security Middlewares
const { apiLimiter, authLimiter, cronLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/sanitize');
const { sqlInjectionProtector } = require('./middleware/sqlInjectionProtector');
const { enforceHttps, securityHeaders, permissionsPolicy } = require('./middleware/securityHeaders');

// Disable X-Powered-By header to prevent server fingerprinting
app.disable('x-powered-by');

// Trust reverse proxy if running behind Nginx, Render, Vercel or cloud load balancers
app.set('trust proxy', 1);

// HTTPS Everywhere: Enforces 301 HTTPS redirects in production
app.use(enforceHttps);

// Helmet Security Headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
app.use(securityHeaders);
app.use(permissionsPolicy);

// Configure Secure Cross-Origin Resource Sharing (CORS)
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Universal input sanitization against XSS, script injection, null-bytes, and prototype pollution
app.use(sanitizeInput);

// Defense-in-depth SQL Injection interceptor against malicious query sequences
app.use(sqlInjectionProtector);

app.use('/uploads', express.static('uploads'));

// Global API rate limiter for all /api endpoints
app.use('/api', apiLimiter);

// Import Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');     
const tenantRoutes = require('./routes/tenantRoutes');   
const billingRoutes = require('./routes/billingRoutes'); 
const requestRoutes = require('./routes/requestRoutes'); 
const cronRoutes = require('./routes/cronRoutes');

// Mount Routes with specialized security limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin/bills', billingRoutes);              
app.use('/api/admin', adminRoutes);                     
app.use('/api/tenant', tenantRoutes);                   
app.use('/api/requests', requestRoutes);
app.use('/api/cron', cronLimiter, cronRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to the RentTrack API');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'RentTrack API is running!' });
});

// Universal error handling middleware
app.use((err, req, res, next) => {
    console.error('[UNHANDLED SERVER ERROR]', err);
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({
        message,
        ...(process.env.NODE_ENV !== 'production' && { error: err.message })
    });
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port: http://localhost:${PORT}`);
    });
}

module.exports = app;