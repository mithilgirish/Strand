export interface TaskActivity {
  id: string;
  name: string;
  startDay: number;
  duration: number;
  critical: boolean;
  atRisk: boolean;
  status: string;
  r0Score: number;
  discipline: string;
}

export interface SchedulerRisk {
  task_id: string;
  task_name: string;
  delay_probability: number;
  expected_delay_days: number;
  r0_score: number;
  severity: string;
  discipline: string;
  equipment_tag: string;
  downstream_count: number;
  downstream_task_ids: string[];
  submittal_linked?: boolean;
  submittal_id?: string;
}

export interface SchedulerMitigation {
  task_id: string;
  mitigation_action: string;
  responsible_party: string;
  deadline_hours: number;
}
