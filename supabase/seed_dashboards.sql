-- ==========================================
-- STRAND: Seed Custom BI Dashboards for Supabase
-- Populates default_tenant with pre-configured AI dashboards
-- ==========================================

INSERT INTO public.custom_dashboards (id, tenant_id, dashboard_name, layout, queries, created_at)
VALUES
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'default_tenant',
  'Data Center Construction Telemetry',
  '[
    {"id": "w1", "type": "R0Gauge", "title": "Submittal R0 Risk Index", "description": "Aggregated risk severity scale for current engineering submittals", "x": 0, "y": 0, "w": 1, "h": 1},
    {"id": "w2", "type": "PredictiveTrendChart", "title": "Predictive Thermal Forecast", "description": "Rack temperature metrics and 7-day predictive AI threshold", "x": 1, "y": 0, "w": 1, "h": 1},
    {"id": "w3", "type": "FormulaCard", "title": "Total Submittal Variance", "description": "Average delay days across active data center packages", "x": 0, "y": 1, "w": 1, "h": 1},
    {"id": "w4", "type": "DataGrid", "title": "Critical Path Shipments & NCRs", "description": "Delayed shipments with submittal score impact", "x": 1, "y": 1, "w": 1, "h": 1}
  ]'::jsonb,
  '{
    "w1": "MATCH (s:Submittal) RETURN avg(s.r0_severity) as r0",
    "w2": "MATCH (t:Telemetry) RETURN t.date as date, t.value as value",
    "w3": "MATCH (s:Submittal) WHERE s.delay > 5 RETURN count(s) as delayed_count",
    "w4": "MATCH (p:Package)-[:HAS_NCR]->(n:NCR) RETURN p.name as Package, n.status as Status, n.severity as Severity"
  }'::jsonb,
  NOW()
),
(
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'default_tenant',
  'Submittals & R0 Severity Monitor',
  '[
    {"id": "w_sub_1", "type": "R0Gauge", "title": "Average R0 Severity Score", "x": 0, "y": 0, "w": 1, "h": 1},
    {"id": "w_sub_2", "type": "BarChart", "title": "Submittals by Contractor", "x": 1, "y": 0, "w": 1, "h": 1},
    {"id": "w_sub_3", "type": "DataGrid", "title": "High Delay Engineering Submittals", "x": 0, "y": 1, "w": 2, "h": 1}
  ]'::jsonb,
  '{
    "w_sub_1": "MATCH (s:Submittal) RETURN avg(s.r0_score) as avg_r0",
    "w_sub_2": "MATCH (c:Contractor)<-[:SUBMITTED_BY]-(s:Submittal) RETURN c.name as name, count(s) as count",
    "w_sub_3": "MATCH (s:Submittal) WHERE s.delay_days > 5 RETURN s.code as Code, s.title as Title, s.delay_days as DelayDays"
  }'::jsonb,
  NOW()
),
(
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  'default_tenant',
  'Equipment Logistics & NCR Tracker',
  '[
    {"id": "w_log_1", "type": "DonutChart", "title": "NCR Status Distribution", "x": 0, "y": 0, "w": 1, "h": 1},
    {"id": "w_log_2", "type": "FormulaCard", "title": "Active Open NCRs", "x": 1, "y": 0, "w": 1, "h": 1},
    {"id": "w_log_3", "type": "DataGrid", "title": "Equipment Shipments Log", "x": 0, "y": 1, "w": 2, "h": 1}
  ]'::jsonb,
  '{
    "w_log_1": "MATCH (n:NCR) RETURN n.status as name, count(n) as value",
    "w_log_2": "MATCH (n:NCR {status: ''OPEN''}) RETURN count(n) as open_ncrs",
    "w_log_3": "MATCH (e:Equipment)-[:IN_TRANSIT]->(s:Shipment) RETURN e.name as Equipment, s.carrier as Carrier, s.eta as ETA"
  }'::jsonb,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  dashboard_name = EXCLUDED.dashboard_name,
  layout = EXCLUDED.layout,
  queries = EXCLUDED.queries;
