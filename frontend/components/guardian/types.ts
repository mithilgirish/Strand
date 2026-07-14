export interface GuardianViolation {
  id: string;
  submittal_id: string;
  parameter: string;
  required: number | string;
  actual: number | string;
  unit?: string;
  spec_dna_id?: string;
  section?: string;
  page?: number;
  r0_score: number;
  severity: string;
  deviation_type?: string;
}
