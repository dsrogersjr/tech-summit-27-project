-- Flag mix: count of flagged payments by program × risk level.
-- Shows distribution of high/moderate/low risk across TANF, SNAP, Child Care,
-- Disability, Veteran — helps prioritize case-worker allocation.
-- @param catalog STRING = solution_builder
-- @param schema STRING = sentinel_ipp
SELECT
  p.program,
  CAST(COUNT(*) AS BIGINT) AS flag_count
FROM IDENTIFIER(:catalog || '.' || :schema || '.gold_queue_scored') p
GROUP BY p.program
ORDER BY flag_count DESC
