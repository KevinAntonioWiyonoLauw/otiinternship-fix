'use client';

import axios from 'axios';
import { getAuthToken, clearAuthData } from './auth';
import Cookies from 'js-cookie';

// Use the correct API base URL
const NEXT_PUBLIC_API_URL = 'http://localhost:8000';
const API_TIMEOUT = 15000;

const api = axios.create({
  baseURL: NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: API_TIMEOUT,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      clearAuthData();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// Meeting
export async function getMeetings() {
  const res = await api.get('/api/meetings/upcoming');
  return res.data;
}

export async function createMeeting(data: {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
}) {
  const res = await api.post('/api/meetings', data);
  return res.data;
}

export async function joinMeeting(data: {
  join_code: string;
}) {
  const res = await api.post('/api/meetings/join', data);
  return res.data;
}

export async function getMeetingById(id: string | number) {
  const res = await api.get(`/api/meetings/${id}`);
  return res.data;
}

// Training
export async function getTrainings() {
  const res = await api.get('/api/trainings/upcoming');
  return res.data;
}

export async function createTraining(data: {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  division_id: number;
}) {
  const res = await api.post('/api/trainings', data);
  return res.data;
}

export default api;