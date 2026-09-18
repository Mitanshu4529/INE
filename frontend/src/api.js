import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
});

export const searchProducts = (q) => api.get(`/products/search?q=${q}`);
export const getTrackedProducts = () => api.get('/tracked-products');
export const trackProduct = (productId) => api.post('/tracked-products', { productId });
export const getProductDetail = (id) => api.get(`/tracked-products/${id}`);
export const getProductHistory = (id) => api.get(`/tracked-products/${id}/history`);
export const getProductLogs = (id) => api.get(`/tracked-products/${id}/logs`);
export const triggerManualScrape = (id) => api.post(`/tracked-products/${id}/scrape`);
