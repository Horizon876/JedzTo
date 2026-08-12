import { ITimingForm } from '@/lib/utils/interfaces/timing.interface';

export const TIMING_INITIAL_VALUE: ITimingForm[] = [
  { day: 'MON', times: [{ startTime: '00:00', endTime: '23:59' }] },
  { day: 'TUE', times: [{ startTime: '00:00', endTime: '23:59' }] },
  { day: 'WED', times: [{ startTime: '00:00', endTime: '23:59' }] },
  { day: 'THU', times: [{ startTime: '00:00', endTime: '23:59' }] },
  { day: 'FRI', times: [{ startTime: '00:00', endTime: '23:59' }] },
  { day: 'SAT', times: [{ startTime: '00:00', endTime: '23:59' }] },
  { day: 'SUN', times: [{ startTime: '00:00', endTime: '23:59' }] },
];
