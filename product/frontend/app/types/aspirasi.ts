export interface Aspirasi {
  id: number;
  senderId: string;
  target: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface AspirasiFormData {
  message: string;
  target: string;
  subject: string;
  isAnonymous?: boolean;
} 