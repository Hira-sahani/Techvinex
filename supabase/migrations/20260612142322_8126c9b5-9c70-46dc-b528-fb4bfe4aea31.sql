-- Realtime topic-level authorization.
-- Defense in depth: postgres_changes payloads are already RLS-filtered at the
-- table level, but this policy additionally prevents users from JOINING
-- arbitrary topic names (so they cannot enumerate or sit on other users'
-- private channels).

-- realtime.messages already has RLS enabled by default in Supabase.
-- Drop any prior version of this policy so the migration is idempotent.
DROP POLICY IF EXISTS "techvinex_topic_authorization_select" ON realtime.messages;

CREATE POLICY "techvinex_topic_authorization_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Shared, read-only global feed (platform stats, public job updates, etc.)
  realtime.topic() = 'realtime:global'
  -- Caller's own user-scoped channel
  OR realtime.topic() = ('realtime:user:' || auth.uid()::text)
  -- Employer-scoped channels: admin-only for now (extend with a membership
  -- check when employer-scoped subscriptions are introduced on the client).
  OR (
    realtime.topic() LIKE 'realtime:employer:%'
    AND public.has_role(auth.uid(), 'admin')
  )
);