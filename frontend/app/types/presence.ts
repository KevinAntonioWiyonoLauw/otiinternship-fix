export interface Presence {
  id: string;
  user_id: string;
  training_id: string;
  presence_type: 'qr' | 'manual';
  status: 'present' | 'absent';
  timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface QRCode {
  qr_code: string; // base64 image data
  token: string;
  expires_at: string;
}

export interface PresenceStats {
  total_participants: number;
  present_count: number;
  absent_count: number;
  attendance_rate: number;
  arrival_times: {
    time: string;
    count: number;
  }[];
  participant_stats: {
    user_id: string;
    name: string;
    status: 'present' | 'absent';
    timestamp?: string;
  }[];
}

export interface TrainingPresence {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  participants: {
    id: string;
    name: string;
    status: 'present' | 'absent';
    timestamp?: string;
  }[];
} 