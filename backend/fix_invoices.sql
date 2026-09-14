DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'invoices'::regclass AND contype = 'u'
  LOOP
    EXECUTE 'ALTER TABLE invoices DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

SELECT conname FROM pg_constraint WHERE conrelid = 'invoices'::regclass AND contype = 'u';