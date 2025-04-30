import { useState, useCallback } from 'react';
import api from '../lib/api';
import { ApiResponse } from '../types/api';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useApi<T = any>(options: UseApiOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    body?: any,
    params?: any
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api[method](url, body, { params });
      const responseData = response.data as ApiResponse<T>;
      
      if (responseData.success) {
        setData(responseData.data as T);
        options.onSuccess?.(responseData.data);
      } else {
        throw new Error(responseData.message || 'Request failed');
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      options.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [options]);

  return {
    data,
    error,
    loading,
    execute,
  };
}

export default useApi; 