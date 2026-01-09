
export enum RoleType {
  SPEECH = 'SPEECH',
  TABLE_TOPIC = 'TABLE_TOPIC',
  OTHER = 'OTHER',
  SESSION = 'SESSION' // New type for aggregate sessions (e.g., Table Topics Session)
}

export enum TimingStatus {
  PENDING = 'PENDING',
  QUALIFIED = 'QUALIFIED', // On Time
  OVERTIME = 'OVERTIME',
  UNDERTIME = 'UNDERTIME'
}

export interface AgendaItem {
  id: string;
  roleName: string; // e.g., "Timer", "Speaker 1", "Table Topics 1"
  speakerName: string;
  type: RoleType;
  targetTimeMinutes: number; // The "Red" time
  actualTimeSeconds: number;
  status: TimingStatus;
  notes?: string;
  logs?: string[]; // Audit log for manual adjustments
  
  // For Inline Session Timer
  isRunning?: boolean;
  lastTick?: number; // Timestamp to calculate delta for inline timer
}

export interface TimerConfig {
  greenTime: number; // Seconds
  yellowTime: number; // Seconds
  redTime: number; // Seconds
  bellTime: number; // Seconds
}

export interface SavedMeetingState {
  timestamp: number;
  items: AgendaItem[];
  scheduledStart: string;
  actualStart: string;
  meetingNumber: string;
  meetingTheme: string;
}
