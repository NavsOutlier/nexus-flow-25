-- Corrigir search_path nas functions de notificação

CREATE OR REPLACE FUNCTION create_notification_external_message()
RETURNS TRIGGER AS $$
DECLARE
  team_member RECORD;
BEGIN
  IF NEW.direction = 'inbound' THEN
    FOR team_member IN SELECT id FROM public.profiles
    LOOP
      INSERT INTO public.notifications (
        user_id, type, client_id, message_id, title, description, metadata
      ) VALUES (
        team_member.id,
        'external_message',
        NEW.client_id,
        NEW.id,
        'Nova mensagem do cliente',
        SUBSTRING(NEW.content, 1, 100),
        jsonb_build_object('sender_name', NEW.sender_name, 'direction', NEW.direction)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION create_notification_internal_message()
RETURNS TRIGGER AS $$
DECLARE
  mention_user_id UUID;
  ticket_record RECORD;
BEGIN
  SELECT * INTO ticket_record FROM public.tickets WHERE id = NEW.ticket_id;
  
  IF NEW.mentions IS NOT NULL AND array_length(NEW.mentions, 1) > 0 THEN
    FOREACH mention_user_id IN ARRAY NEW.mentions
    LOOP
      IF mention_user_id != NEW.sender_id THEN
        INSERT INTO public.notifications (
          user_id, type, ticket_id, client_id, message_id, title, description, metadata
        ) VALUES (
          mention_user_id,
          'mention',
          NEW.ticket_id,
          ticket_record.client_id,
          NEW.id,
          'Você foi mencionado',
          SUBSTRING(NEW.content, 1, 100),
          jsonb_build_object('ticket_title', ticket_record.title, 'sender_id', NEW.sender_id)
        );
      END IF;
    END LOOP;
  END IF;
  
  IF ticket_record.assignee_id IS NOT NULL 
     AND ticket_record.assignee_id != NEW.sender_id 
     AND (NEW.mentions IS NULL OR NOT (ticket_record.assignee_id = ANY(NEW.mentions))) THEN
    INSERT INTO public.notifications (
      user_id, type, ticket_id, client_id, message_id, title, description, metadata
    ) VALUES (
      ticket_record.assignee_id,
      'internal_message',
      NEW.ticket_id,
      ticket_record.client_id,
      NEW.id,
      'Nova mensagem no seu ticket',
      SUBSTRING(NEW.content, 1, 100),
      jsonb_build_object('ticket_title', ticket_record.title, 'sender_id', NEW.sender_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION create_notification_ticket_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id, type, client_id, ticket_id, title, description, metadata
    ) VALUES (
      NEW.assignee_id,
      'ticket_assigned',
      NEW.client_id,
      NEW.id,
      'Ticket atribuído a você',
      NEW.title,
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION create_notification_direct_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id, type, message_id, title, description, metadata
  ) VALUES (
    NEW.receiver_id,
    'direct_message',
    NEW.id,
    'Nova mensagem direta',
    SUBSTRING(NEW.content, 1, 100),
    jsonb_build_object('sender_id', NEW.sender_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Corrigir também as funções existentes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'offline'
  );
  RETURN NEW;
END;
$$;