-- One-time recovery from the Workers-incompatible redirect option. This only
-- releases the cold calendar failure; provider quotas and all game saves stay.
UPDATE live_market_guard
SET paused_until = 0, failures = 0, status = 'ok'
WHERE id = 1 AND status = 'unavailable'
  AND EXISTS (
    SELECT 1 FROM live_market_cache WHERE cache_key = 'diagnostic'
      AND json_extract(payload, '$.operation') = 'calendar'
      AND json_extract(payload, '$.httpStatus') IS NULL
      AND json_extract(payload, '$.reason') = 'network-or-invalid-response'
  )
  AND NOT EXISTS (SELECT 1 FROM live_market_cache WHERE cache_key IN ('calendar','quotes') AND payload IS NOT NULL);
