-- Split refresh work by fund to fit the free Worker's per-request CPU budget.
CREATE TABLE IF NOT EXISTS fund_cache (
  symbol TEXT PRIMARY KEY CHECK(symbol IN ('DIA','SPY','ARKK','SGOV','GLD','SLV')),
  as_of TEXT NOT NULL,
  payload TEXT,
  lease INTEGER NOT NULL DEFAULT 0
);
