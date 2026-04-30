import axios from 'axios';
import Config from 'react-native-config';

const api = axios.create({
  baseURL: Config.API_BASE_URL || 'https://api.buildcafe.in/v1',
  timeout: 10000,
  headers: {'Content-Type': 'application/json'},
});

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err?.response?.data?.message || 'Something went wrong';
    return Promise.reject(new Error(msg));
  },
);

export const authAPI = {
  sendOTP: (mobile: string) => api.post('/auth/send-otp', {mobile}),
  verifyOTP: (mobile: string, otp: string) =>
    api.post('/auth/verify-otp', {mobile, otp}),
  signup: (name: string, mobile: string, otp: string) =>
    api.post('/auth/signup', {name, mobile, otp}),
};

export default api;
