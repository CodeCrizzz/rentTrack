import axios from 'axios';

const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:5000/api`;
    }
    return 'http://localhost:5000/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Automatically attach the JWT token to every request if the user is logged in
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Intercept responses to handle session expiration and modern auth invalidation gracefully
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined') {
            const status = error.response?.status;
            const errorCode = error.response?.data?.code;
            const pathname = window.location.pathname;

            const shouldLogout = status === 401 || (status === 403 && (errorCode === 'ACCOUNT_DISABLED' || errorCode === 'ACCOUNT_PENDING'));

            // Only redirect if user is currently inside an authenticated route
            if (shouldLogout && !pathname.includes('/login') && !pathname.includes('/signup')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');

                let redirectParam = '';
                if (errorCode === 'SESSION_EXPIRED') redirectParam = '?expired=true';
                else if (errorCode === 'TOKEN_REVOKED') redirectParam = '?revoked=true';
                else if (errorCode === 'ACCOUNT_DISABLED') redirectParam = '?disabled=true';
                else if (errorCode === 'ACCOUNT_PENDING') redirectParam = '?pending=true';

                window.location.href = `/login${redirectParam}`;
            }
        }
        return Promise.reject(error);
    }
);

export default api;