const { Pool } = require('pg');

// Database configuration loaded strictly from environment variables
const connectionString = process.env.DATABASE_URL;

const poolConfig = connectionString 
    ? {
        connectionString,
        ssl: process.env.DATABASE_SSL === 'true' || (process.env.NODE_ENV === 'production' && !connectionString.includes('localhost'))
            ? { rejectUnauthorized: false } 
            : false,
        options: '-c search_path="rentTrack_schema",public',
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
        options: '-c search_path="rentTrack_schema",public',
    };

const pool = new Pool(poolConfig);

pool.on('connect', (client) => {
    client.query('SET search_path TO "rentTrack_schema", public;')
        .catch(err => console.error('Error setting search_path:', err));
    console.log('Connected to PostgreSQL Database (Schema: rentTrack_schema)');
});

pool.on('error', (err) => {
    console.error('Unexpected error', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => {
        // Enforce valid SQL query string
        if (typeof text !== 'string' || !text.trim()) {
            throw new Error('Database query text must be a valid, non-empty SQL string.');
        }

        // Enforce array parameterization when placeholders ($1, $2, ...) are present
        if (/\$\d+/.test(text) && !Array.isArray(params)) {
            throw new Error('Database query contains parameter placeholders ($1, $2, ...) but params was not provided as an array.');
        }

        return pool.query(text, params);
    },
    pool
};