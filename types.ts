
export enum Period {
  MORNING = 'Manhã',
  AFTERNOON = 'Tarde'
}

export interface Driver {
  id: string;
  name: string;
  fleetNumber: string;
  registration: string;
  company: string;
  tenantId?: string;
}

export interface QueueEntry extends Driver {
  queueId: string;
  arrivalTime: number;
  period: Period;
  tenantId?: string;
}

export interface ExitLog {
  id: string;
  driverId: string;
  name: string;
  fleetNumber: string;
  registration: string;
  company: string;
  zone: string;
  dtNumber: string;
  ordersCount: number;
  exitTime: number;
  period: Period;
  date: string; // YYYY-MM-DD
  tenantId?: string;
}

export interface DailyReport {
  id: string;
  date: string;
  logs: ExitLog[];
}
