-- The previous migration added is_read fields, now we need to fix if any part failed
-- Check and only add if not exists using DO block

DO $$ 
BEGIN
  -- Add is_read to external_messages if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'external_messages' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.external_messages ADD COLUMN is_read boolean NOT NULL DEFAULT false;
  END IF;
  
  -- Add is_read to internal_messages if not exists  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'internal_messages' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.internal_messages ADD COLUMN is_read boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_external_messages_is_read ON public.external_messages(client_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_internal_messages_is_read ON public.internal_messages(ticket_id, is_read) WHERE is_read = false;