BEGIN;

ALTER TABLE students ALTER COLUMN first_name DROP NOT NULL;

UPDATE students SET last_name = first_name WHERE last_name IS NULL;

ALTER TABLE students RENAME COLUMN last_name TO name;

ALTER TABLE students ALTER COLUMN name SET NOT NULL;

COMMIT;
