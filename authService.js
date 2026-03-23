import apiClient from './api';

const persistUser = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('skillswapp_user', JSON.stringify(user));
};

const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('skillswapp_user');
};

const getCurrentUser = () => {
    try {
        const userStr = localStorage.getItem('skillswapp_user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        return null;
    }
};

const getToken = () => {
    return localStorage.getItem('token');
};

const login = async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);

    if (response.data?.success) {
        const { token, user } = response.data;
        persistUser(token, user);
        // Redirect based on the redirectUrl from the backend
        if (user && user.redirectUrl) {
            window.location.href = user.redirectUrl;
        }
    }

    return response.data;
};

const registerClient = async (clientData) => {
    const response = await apiClient.post('/auth/register/client', clientData);

    if (response.data?.success) {
        const { token, user } = response.data;
        persistUser(token, user);
        window.location.href = user.role === 'admin' ? '/admin' : '/';
    }

    return response.data;
};

const registerProvider = async (providerData) => {
    // Note: Provider registration does not log the user in.
    // It returns a success message for the pending application.
    const response = await apiClient.post('/auth/register/provider', providerData);
    return response.data;
};

const forgotPassword = async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
};

const resetPassword = async (token, newPassword) => {
    const response = await apiClient.post('/auth/reset-password', { token, newPassword });
    return response.data;
};

const verifyEmail = async (token) => {
    const response = await apiClient.get(`/auth/verify-email/${token}`);
    return response.data;
};

const authService = {
    login,
    registerClient,
    registerProvider, // Renamed from applyAsProvider for clarity
    logout,
    getCurrentUser,
    getToken,
    forgotPassword,
    resetPassword,
    verifyEmail,
};

export default authService;