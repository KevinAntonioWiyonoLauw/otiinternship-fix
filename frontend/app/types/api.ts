export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface Division {
  id: number;
  name: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface UserRole {
  role: string;
  division: Division;
}

export interface User {
  id: string;
  email: string;
  niu: string;
  namaLengkap: string;
  roles: UserRole[];
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  date: string;
  startDate: string;
  endDate: string;
  location: string;
  participants: string[];
}

export interface Training {
  id: string;
  title: string;
  description: string;
  date: string;
  startDate: string;
  endDate: string;
  location: string;
  participants: string[];
}

export interface Aspirasi {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface Presence {
  id: string;
  userId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'late' | 'absent';
}

export interface Progress {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'in_progress' | 'completed';
  startDate: string;
  endDate?: string;
}