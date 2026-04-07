import axios from 'axios';
import { useAuth } from '../store/useAuth';

// Configure base URL if needed, but here we seem to use relative paths or /api proxy
const api = axios.create();

api.interceptors.request.use(
    (config) => {
        const { token, impersonatedTenantId } = useAuth.getState();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (impersonatedTenantId) {
            config.params = { ...config.params, tenantId: impersonatedTenantId };
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuth.getState().logout();
        }
        return Promise.reject(error);
    }
);

export default api;
