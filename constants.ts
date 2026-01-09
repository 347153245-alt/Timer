import { RoleType, TimerConfig } from './types';

export const TM_COLORS = {
  NAVY: '#004165',
  BURGUNDY: '#772432',
  YELLOW: '#F2DF74',
  GREY: '#A9B7B1',
  GREEN: '#28a745', // Standard readable green
  RED: '#dc3545',   // Standard readable red
  WHITE: '#ffffff'
};

export const getTimerConfig = (type: RoleType, targetMinutes: number): TimerConfig => {
  const targetSeconds = targetMinutes * 60;
  
  if (type === RoleType.SPEECH) {
    // Prepared Speeches: Green @ 2 min remaining, Yellow @ 1 min remaining
    return {
      greenTime: targetSeconds - 120,
      yellowTime: targetSeconds - 60,
      redTime: targetSeconds,
      bellTime: targetSeconds + 30
    };
  } else {
    // All other roles (including Table Topics): Green @ 1 min remaining, Yellow @ 30s remaining
    return {
      greenTime: targetSeconds - 60,
      yellowTime: targetSeconds - 30,
      redTime: targetSeconds,
      bellTime: targetSeconds + 30
    };
  }
};

export const DEFAULT_AGENDA_ITEMS = [
  { roleName: 'Opening Remark', type: RoleType.OTHER, targetTimeMinutes: 3 },
  { roleName: 'Timer Introduction', type: RoleType.OTHER, targetTimeMinutes: 3 },
  { roleName: 'Grammarian Introduction', type: RoleType.OTHER, targetTimeMinutes: 3 },
  { roleName: 'General Evaluator Introduction', type: RoleType.OTHER, targetTimeMinutes: 3 },
  { roleName: 'Speaker 1', type: RoleType.SPEECH, targetTimeMinutes: 7 },
  { roleName: 'Speaker 2', type: RoleType.SPEECH, targetTimeMinutes: 7 },
  { roleName: 'Speaker 3', type: RoleType.SPEECH, targetTimeMinutes: 7 },
  { roleName: 'Evaluator 1', type: RoleType.OTHER, targetTimeMinutes: 3 },
  { roleName: 'Evaluator 2', type: RoleType.OTHER, targetTimeMinutes: 3 },
  { roleName: 'Evaluator 3', type: RoleType.OTHER, targetTimeMinutes: 3 },
  // Table Topics Session summary row removed as requested
  { roleName: 'Table Topics Speaker 1', type: RoleType.TABLE_TOPIC, targetTimeMinutes: 2 },
  { roleName: 'Table Topics Speaker 2', type: RoleType.TABLE_TOPIC, targetTimeMinutes: 2 },
  { roleName: 'Table Topics Speaker 3', type: RoleType.TABLE_TOPIC, targetTimeMinutes: 2 },
  { roleName: 'Table Topics Speaker 4', type: RoleType.TABLE_TOPIC, targetTimeMinutes: 2 },
  { roleName: 'Table Topics Speaker 5', type: RoleType.TABLE_TOPIC, targetTimeMinutes: 2 },
  { roleName: 'Table Topics Evaluation', type: RoleType.OTHER, targetTimeMinutes: 6 },
  { roleName: 'Timer Report', type: RoleType.OTHER, targetTimeMinutes: 3 },
  { roleName: 'Grammarian Report', type: RoleType.OTHER, targetTimeMinutes: 3 },
  { roleName: 'General Evaluator Report', type: RoleType.OTHER, targetTimeMinutes: 10 },
  { roleName: 'Moment of Truth', type: RoleType.OTHER, targetTimeMinutes: 5 },
  { roleName: 'Closing Remark', type: RoleType.OTHER, targetTimeMinutes: 3 },
];
