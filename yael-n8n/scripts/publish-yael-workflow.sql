-- Publish Yael Mavashev — תורים on n8n-newsite only.
-- Guarded: refuses if the workflow is missing or already active.
-- Does not touch Haya / Forever / Green 642 workflows.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM workflow_entity
    WHERE id = 'YaelBookLifeCycle01'
      AND name = 'Yael Mavashev — תורים'
      AND active = false
  ) THEN
    RAISE EXCEPTION 'Yael workflow missing or already active';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM webhook_entity
    WHERE "webhookPath" = 'yael-review-rating'
      AND method = 'POST'
      AND "workflowId" <> 'YaelBookLifeCycle01'
  ) THEN
    RAISE EXCEPTION 'webhook path yael-review-rating already owned by another workflow';
  END IF;
END $$;

INSERT INTO workflow_history (
  "versionId",
  "workflowId",
  authors,
  nodes,
  connections,
  name,
  autosaved,
  "nodeGroups"
)
SELECT
  "versionId",
  id,
  'reuven MAV',
  nodes,
  connections,
  name,
  false,
  '[]'::json
FROM workflow_entity
WHERE id = 'YaelBookLifeCycle01'
ON CONFLICT ("versionId") DO NOTHING;

INSERT INTO webhook_entity (
  "webhookPath",
  method,
  node,
  "webhookId",
  "pathLength",
  "workflowId"
)
SELECT
  'yael-review-rating',
  'POST',
  '3️⃣ Webhook: Fillout Feedback',
  'yael-review-rating-inactive',
  1,
  'YaelBookLifeCycle01'
WHERE NOT EXISTS (
  SELECT 1
  FROM webhook_entity
  WHERE "webhookPath" = 'yael-review-rating'
    AND method = 'POST'
);

UPDATE workflow_entity
SET
  active = true,
  "activeVersionId" = "versionId",
  "triggerCount" = 6,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE id = 'YaelBookLifeCycle01'
  AND active = false;

INSERT INTO workflow_publish_history ("workflowId", "versionId", event, "userId")
SELECT
  'YaelBookLifeCycle01',
  "versionId",
  'activated',
  'f1a21048-ef32-4935-9938-0e7361a130cd'::uuid
FROM workflow_entity
WHERE id = 'YaelBookLifeCycle01';

COMMIT;
