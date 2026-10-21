-- Preserve every existing record while widening the slot constraint from 3 to 5.
CREATE TABLE profiles_five (
  slot INTEGER PRIMARY KEY CHECK(slot BETWEEN 0 AND 4),
  id TEXT NOT NULL UNIQUE,
  revision INTEGER NOT NULL,
  profile TEXT NOT NULL
);
INSERT INTO profiles_five (slot,id,revision,profile)
SELECT slot,id,revision,profile FROM profiles;
DROP TABLE profiles;
ALTER TABLE profiles_five RENAME TO profiles;
