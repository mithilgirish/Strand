"""
All Cypher queries are parameterized ($param syntax) per anti-injection rule.
Never use f-strings with extracted/attacker-controlled text in Cypher.
"""

# ── Spec-DNA lineage chain ───────────────────────────────────────────
GET_SPEC_DNA_CHAIN = """
MATCH path = (c:ContractClause)<-[:DERIVES_FROM*1..5]-(s:VendorSubmittal {submittal_id: $submittal_id})
RETURN [n IN nodes(path) | {
    id: coalesce(n.spec_dna_id, n.submittal_id, n.line_id, n.po_number, n.step_id),
    label: labels(n)[0],
    section: n.section,
    parameter_name: n.parameter_name,
    parameter_value: n.parameter_value
}] as chain
"""

# ── Violations ───────────────────────────────────────────────────────
GET_HIGH_R0_VIOLATIONS = """
MATCH (s:VendorSubmittal)-[v:VIOLATES]->(c:ContractClause)
WHERE v.r0_score > $threshold
RETURN s.submittal_id as submittal_id,
       s.vendor_name as vendor_name,
       s.equipment_tag as equipment_tag,
       v.deviation_type as deviation_type,
       v.expected_value as expected_value,
       v.actual_value as actual_value,
       v.severity as severity,
       v.r0_score as r0_score,
       c.section as clause_section,
       c.parameter_name as parameter_name,
       c.spec_dna_id as spec_dna_id
ORDER BY v.r0_score DESC
LIMIT 20
"""

GET_ALL_VIOLATIONS = """
MATCH (s:VendorSubmittal)-[v:VIOLATES]->(c:ContractClause)
RETURN s.submittal_id as submittal_id,
       s.vendor_name as vendor_name,
       s.equipment_tag as equipment_tag,
       v.deviation_type as deviation_type,
       v.expected_value as expected_value,
       v.actual_value as actual_value,
       v.severity as severity,
       v.r0_score as r0_score,
       c.section as clause_section,
       c.parameter_name as parameter_name,
       c.spec_dna_id as spec_dna_id
ORDER BY v.r0_score DESC
"""

GET_VIOLATION_BY_ID = """
MATCH (s:VendorSubmittal {submittal_id: $submittal_id})-[v:VIOLATES]->(c:ContractClause)
RETURN s, v, c
"""

# ── Downstream impact for R0 ────────────────────────────────────────
GET_DOWNSTREAM_DEPENDENCIES = """
MATCH (start {spec_dna_id: $spec_dna_id})
MATCH (downstream)-[:DERIVES_FROM*1..5]->(start)
RETURN DISTINCT downstream, labels(downstream)[0] as type,
       downstream.spec_dna_id as spec_dna_id
"""

# ── Contract clause lookup ───────────────────────────────────────────
GET_CLAUSE_BY_PARAMETER = """
MATCH (c:ContractClause {parameter_name: $parameter_name})
RETURN c.parameter_value as required_value,
       c.spec_dna_id as spec_dna_id,
       c.section as section,
       c.unit as unit,
       c.operator as operator
"""

GET_CLAUSE_BY_SPEC_DNA = """
MATCH (c:ContractClause {spec_dna_id: $spec_dna_id})
RETURN c
"""

# ── Shipments ────────────────────────────────────────────────────────
GET_AT_RISK_SHIPMENTS = """
MATCH (sh:Shipment)-[:SUPPLIED_BY]->(sup:Supplier)
WHERE sh.risk_flag = true OR sh.delay_days > 7
OPTIONAL MATCH (sup)-[:TIER_OF*1..3]->(parent:Supplier)
RETURN sh.shipment_id as shipment_id,
       sh.equipment_tag as equipment_tag,
       sh.delay_days as delay_days,
       sh.risk_flag as risk_flag,
       sh.current_status as current_status,
       sh.lat as lat,
       sh.lng as lng,
       sh.expected_delivery as expected_delivery,
       sup.supplier_id as supplier_id,
       sup.name as supplier_name,
       sup.tier as supplier_tier,
       sup.risk_score as supplier_risk_score,
       collect(parent.name) as supply_chain
ORDER BY sh.delay_days DESC
"""

GET_ALL_SHIPMENTS = """
MATCH (sh:Shipment)-[:SUPPLIED_BY]->(sup:Supplier)
RETURN sh.shipment_id as shipment_id,
       sh.equipment_tag as equipment_tag,
       sh.delay_days as delay_days,
       sh.risk_flag as risk_flag,
       sh.current_status as current_status,
       sh.lat as lat,
       sh.lng as lng,
       sh.expected_delivery as expected_delivery,
       sup.supplier_id as supplier_id,
       sup.name as supplier_name,
       sup.tier as supplier_tier
"""

GET_SUPPLY_CHAIN = """
MATCH (sh:Shipment {shipment_id: $shipment_id})-[:SUPPLIED_BY]->(sup:Supplier)
OPTIONAL MATCH (sup)-[:TIER_OF*1..3]->(parent:Supplier)
RETURN sh, sup, collect(parent) as supply_chain_tiers
"""

FIND_ALTERNATIVE_SUPPLIERS = """
MATCH (s:Supplier)
WHERE s.supplier_id <> $failing_supplier_id
  AND s.risk_score < 0.4
  AND s.on_time_rate > 0.85
RETURN s.supplier_id as supplier_id,
       s.name as name,
       s.tier as tier,
       s.risk_score as risk_score,
       s.on_time_rate as on_time_rate,
       s.country as country
ORDER BY s.risk_score ASC
LIMIT 3
"""

# ── NCRs ─────────────────────────────────────────────────────────────
GET_OPEN_NCRS = """
MATCH (n:NCR)
WHERE coalesce(n.status, 'open') IN ['open', 'pending_approval', 'approved']
  AND (
    n.tenant_id = $tenant_id
    OR $tenant_id IN ['default', 'demo-123', '']
    OR n.tenant_id IS NULL
  )
OPTIONAL MATCH (n)-[:REFERENCES]->(c:ContractClause)
OPTIONAL MATCH (s:VendorSubmittal)-[:VIOLATES]->(c)
RETURN n.ncr_id as ncr_id,
       n.title as title,
       n.description as description,
       n.severity as severity,
       n.status as status,
       n.equipment_tag as equipment_tag,
       n.r0_score as r0_score,
       n.raised_by as raised_by,
       n.raised_at as raised_at,
       n.voice_transcript as voice_transcript,
       n.photo_url as photo_url,
       c.section as clause_section,
       c.parameter_name as parameter_name,
       s.submittal_id as submittal_id
ORDER BY n.raised_at DESC
"""

GET_ALL_OPEN_NCRS = """
MATCH (n:NCR)
WHERE coalesce(n.status, 'open') IN ['open', 'pending_approval', 'approved']
OPTIONAL MATCH (n)-[:REFERENCES]->(c:ContractClause)
RETURN n.ncr_id as ncr_id,
       n.title as title,
       n.description as description,
       n.severity as severity,
       n.status as status,
       n.equipment_tag as equipment_tag,
       n.r0_score as r0_score,
       n.raised_by as raised_by,
       n.raised_at as raised_at,
       n.voice_transcript as voice_transcript,
       n.photo_url as photo_url,
       n.tenant_id as tenant_id,
       c.section as clause_section,
       c.parameter_name as parameter_name
ORDER BY n.raised_at DESC
"""

GET_NCR_BY_ID = """
MATCH (n:NCR {ncr_id: $ncr_id})
OPTIONAL MATCH (n)-[:REFERENCES]->(c:ContractClause)
RETURN n, c
"""

# ── Write queries (all use MERGE for idempotency,.5) ────
MERGE_CONTRACT_CLAUSE = """
MERGE (c:ContractClause {spec_dna_id: $spec_dna_id})
ON CREATE SET c.section = $section,
              c.parameter_name = $parameter_name,
              c.parameter_value = $parameter_value,
              c.unit = $unit,
              c.operator = $operator,
              c.document_source = $document_source,
              c.page_number = $page_number,
              c.tenant_id = $tenant_id,
              c.created_at = datetime()
ON MATCH SET  c.parameter_value = $parameter_value,
              c.unit = $unit,
              c.operator = $operator,
              c.tenant_id = $tenant_id
RETURN c
"""

MERGE_VENDOR_SUBMITTAL = """
MERGE (s:VendorSubmittal {submittal_id: $submittal_id})
ON CREATE SET s.spec_dna_id = $spec_dna_id,
              s.vendor_name = $vendor_name,
              s.equipment_tag = $equipment_tag,
              s.document_path = $document_path,
              s.upload_timestamp = datetime(),
              s.status = $status,
              s.extracted_parameters = $extracted_parameters,
              s.r0_score = $r0_score,
              s.tenant_id = $tenant_id,
              s.violation_count = $violation_count
ON MATCH SET  s.status = $status,
              s.r0_score = $r0_score,
              s.tenant_id = $tenant_id,
              s.violation_count = $violation_count
RETURN s
"""

# Idempotent violation write: delete-then-recreate
WRITE_VIOLATION = """
MATCH (s:VendorSubmittal {submittal_id: $submittal_id})
MATCH (c:ContractClause {spec_dna_id: $spec_dna_id})
OPTIONAL MATCH (s)-[old:VIOLATES]->(c)
DELETE old
WITH s, c
MERGE (s)-[v:VIOLATES]->(c)
SET v.deviation_type = $deviation_type,
    v.expected_value = $expected_value,
    v.actual_value = $actual_value,
    v.severity = $severity,
    v.r0_score = $r0_score
RETURN v
"""

MERGE_NCR = """
MERGE (n:NCR {ncr_id: $ncr_id})
ON CREATE SET n.title = $title,
              n.description = $description,
              n.severity = $severity,
              n.raised_by = $raised_by,
              n.raised_at = datetime(),
              n.equipment_tag = $equipment_tag,
              n.spec_dna_ref = $spec_dna_ref,
              n.status = $status,
              n.voice_transcript = $voice_transcript,
              n.tenant_id = $tenant_id,
              n.photo_url = $photo_url,
              n.r0_score = $r0_score
ON MATCH SET  n.status = $status,
              n.severity = $severity,
              n.tenant_id = $tenant_id,
              n.photo_url = $photo_url,
              n.r0_score = $r0_score
RETURN n
"""

NCR_LINK_CLAUSE = """
MATCH (n:NCR {ncr_id: $ncr_id})
MATCH (c:ContractClause {spec_dna_id: $spec_dna_id})
MERGE (n)-[:REFERENCES]->(c)
"""

UPDATE_NCR_STATUS = """
MATCH (n:NCR {ncr_id: $ncr_id})
SET n.status = $status
RETURN n
"""

MERGE_SUPPLIER = """
MERGE (s:Supplier {supplier_id: $supplier_id})
ON CREATE SET s.name = $name,
              s.tier = $tier,
              s.country = $country,
              s.risk_score = $risk_score,
              s.on_time_rate = $on_time_rate,
              s.lat = $lat,
              s.tenant_id = $tenant_id,
              s.lng = $lng
ON MATCH SET  s.tenant_id = $tenant_id
RETURN s
"""

MERGE_SHIPMENT = """
MERGE (sh:Shipment {shipment_id: $shipment_id})
ON CREATE SET sh.equipment_tag = $equipment_tag,
              sh.supplier_id = $supplier_id,
              sh.origin_port = $origin_port,
              sh.destination_port = $destination_port,
              sh.expected_delivery = $expected_delivery,
              sh.current_status = $current_status,
              sh.delay_days = $delay_days,
              sh.risk_flag = $risk_flag,
              sh.lat = $lat,
              sh.tenant_id = $tenant_id,
              sh.lng = $lng
ON MATCH SET  sh.tenant_id = $tenant_id
RETURN sh
"""

LINK_SHIPMENT_SUPPLIER = """
MATCH (sh:Shipment {shipment_id: $shipment_id})
MATCH (sup:Supplier {supplier_id: $supplier_id})
MERGE (sh)-[:SUPPLIED_BY]->(sup)
"""

# ── RFIs (for Brain's related-RFI lookup) ────────────────────────────
FIND_RELATED_RFIS = """
MATCH (n:NCR)
WHERE n.status IN ['open', 'under_review', 'closed']
  AND any(kw IN $keywords WHERE toLower(n.description) CONTAINS kw)
RETURN n.ncr_id as ncr_id,
       n.title as title,
       n.description as description,
       n.status as status,
       n.severity as severity
LIMIT 3
"""

# ── Project-level aggregation ────────────────────────────────────────
GET_PROJECT_SUMMARY = """
OPTIONAL MATCH (v:VendorSubmittal)-[viol:VIOLATES]->()
WITH count(DISTINCT viol) as total_violations
OPTIONAL MATCH (n:NCR) WHERE n.status IN ['open', 'pending_approval']
WITH total_violations, count(n) as open_ncrs
OPTIONAL MATCH (sh:Shipment) WHERE sh.risk_flag = true
WITH total_violations, open_ncrs, count(sh) as at_risk_shipments
OPTIONAL MATCH ()-[v2:VIOLATES]->()
WITH total_violations, open_ncrs, at_risk_shipments,
     CASE WHEN count(v2) > 0 THEN max(v2.r0_score) ELSE 0 END as r0_max
RETURN total_violations, open_ncrs, at_risk_shipments, r0_max
"""

# ── 1-hop neighborhood for Brain graph_context ──────────
GET_SPEC_DNA_NEIGHBORHOOD = """
MATCH (center {spec_dna_id: $spec_dna_id})
OPTIONAL MATCH (center)-[r]-(neighbor)
RETURN labels(center)[0] as center_label,
       center.spec_dna_id as center_id,
       type(r) as relationship,
       labels(neighbor)[0] as neighbor_label,
       coalesce(neighbor.spec_dna_id, neighbor.submittal_id,
                neighbor.line_id, neighbor.ncr_id) as neighbor_id,
       neighbor.parameter_name as neighbor_param
LIMIT 20
"""
