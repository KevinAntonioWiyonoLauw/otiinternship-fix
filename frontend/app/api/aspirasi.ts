import api from '../lib/api';
import { AspirasiFormData, Aspirasi } from '../types/aspirasi';

// Get all aspirasi (KADIV only)
export async function getAspirations(): Promise<Aspirasi[]> {
  const res = await api.get('/api/aspirasi');
  return res.data.aspirasi || [];
}

// Get current user's aspirasi
export async function getMyAspirations(): Promise<Aspirasi[]> {
  const res = await api.get('/api/aspirasi');
  return res.data.aspirasi || [];
}

// Get aspirasi by target
export async function getAspirationsByTarget(target: string): Promise<Aspirasi[]> {
  const res = await api.get(`/api/aspirasi/target/${encodeURIComponent(target)}`);
  return res.data.aspirasi || [];
}

// Create a new aspirasi
export async function createAspiration(data: AspirasiFormData): Promise<Aspirasi> {
  const payload = {
    target: data.target,
    subject: data.subject,
    message: data.message,
    anonymous: data.isAnonymous
  };
  
  const res = await api.post('/api/aspirasi', payload);
  return res.data.aspirasi;
}

// Delete an aspirasi (KADIV HD only)
export async function deleteAspiration(id: number): Promise<void> {
  await api.delete(`/api/aspirasi/${id}`);
}