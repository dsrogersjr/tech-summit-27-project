-- app.workflow_state — first-class workflow-state & observability timeline.
--
-- Unions the assistant workflow turns (app.messages, with tool-call
-- observability lifted from the message `thinking` JSONB) with the recorded
-- case-action decisions (app.case_actions), into one timestamped stream. Deeper
-- per-tool agent spans live in MLflow traces; `trace_id` joins these rows to
-- that backend.
--
-- Common shape: (event_ts timestamptz, event_kind text, actor text,
--                payment_id text, detail jsonb), ordered by event_ts.
CREATE OR REPLACE VIEW app.workflow_state AS
  SELECT
    m.created_at AS event_ts,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements(m.thinking) e
        WHERE e->>'kind' = 'tool_call'
      ) THEN 'tool_call'
      ELSE 'message'
    END AS event_kind,
    m.role AS actor,
    NULL::text AS payment_id,
    jsonb_build_object(
      'role', m.role,
      'position', m.position,
      'conversation', c.title,
      'trace_id', m.trace_id,
      'tools', (
        SELECT jsonb_agg(e->>'name')
        FROM jsonb_array_elements(m.thinking) e
        WHERE e->>'kind' = 'tool_call'
      )
    ) AS detail
  FROM app.messages m
  JOIN app.conversations c ON c.id = m.conversation_id
  UNION ALL
  SELECT
    COALESCE(a.decided_at, a.created_at) AS event_ts,
    'decision' AS event_kind,
    a.approved_by AS actor,
    a.payment_id,
    jsonb_build_object(
      'action_type', a.action_type,
      'status', a.status,
      'hold_duration_hours', a.hold_duration_hours,
      'predicted_recovery_usd', a.predicted_recovery_usd,
      'audit_trail', a.audit_trail
    ) AS detail
  FROM app.case_actions a
  ORDER BY event_ts;
