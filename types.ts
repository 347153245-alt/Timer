
export enum RoleType {
  SPEECH = 'SPEECH',
  TABLE_TOPIC = 'TABLE_TOPIC',
  OTHER = 'OTHER'
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
}

export interface TimerConfig {
  greenTime: number; // Seconds
  yellowTime: number; // Seconds
  redTime: number; // Seconds
  bellTime: number; // Seconds
}
