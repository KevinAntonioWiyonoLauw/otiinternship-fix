'use client';

import { User, AuthResponse } from '../types/api';
import Cookies from 'js-cookie';


const isDevelopment = process.env.NODE_ENV === 'development';
let DEBUG_AUTH = false; 

if(isDevelopment){
DEBUG_AUTH = true; 
}

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

export const setAuthData = (data: AuthResponse) => {
  if (!data.token || !data.refreshToken || !data.user) {
    console.error('Invalid auth data:', data);
    return;
  }

  try {
    // Set cookies with proper configuration for middleware access
    Cookies.set(TOKEN_KEY, data.token, { 
      expires: 7, // 7 days
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      domain: window.location.hostname
    });
    
    Cookies.set(REFRESH_TOKEN_KEY, data.refreshToken, { 
      expires: 30, // 30 days
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      domain: window.location.hostname
    });
    
    // Store user data in localStorage
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  
  } catch (error) {
    console.error('Error setting auth data:', error);
  }
};

export const getAuthToken = (): string | null => {
  try {
    const token = Cookies.get(TOKEN_KEY);
    if (!token) {
      return null;
    }
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const getRefreshToken = (): string | null => {
  try {
    const token = Cookies.get(REFRESH_TOKEN_KEY);
    if (!token) {
      return null;
    }
    return token;
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return null;
  }
};

export const getUser = (): User | null => {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) {
      return null;
    }
    const user = JSON.parse(userStr);
    if (!user || !user.id) {
      return null;
    }
    return user;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const clearAuthData = () => {
  try {
    Cookies.remove(TOKEN_KEY, { path: '/', domain: window.location.hostname });
    Cookies.remove(REFRESH_TOKEN_KEY, { path: '/', domain: window.location.hostname });
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

export const isAuthenticated = () => {
  try {
    const token = getAuthToken();
    const user = getUser();
    const isValid = !!(token && user && user.id);
    if (DEBUG_AUTH) {
      console.log('Authentication check:', { token, user, isValid });
    }
    return isValid;
  } catch (error) {
    if (DEBUG_AUTH) {
      console.error('Error checking authentication:', error);
    }
    return false;
  }
};

export const updateUserData = (user: User) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};