-- ===========================================
-- SISTEMA DE NOTIFICAÇÕES ROBUSTO
-- ===========================================

-- 1. Tabela Principal: notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Quem deve ver esta notificação
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Tipo de notificação
  type TEXT NOT NULL CHECK (type IN (
    'external_message',
    'internal_message',
    'direct_message',
    'ticket_created',
    'ticket_assigned',
    'mention',
    'ticket_status_changed'
  )),
  
  -- Referências (dependendo do tipo)
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  message_id UUID,
  
  -- Dados da notificação
  title TEXT NOT NULL,
  description TEXT,
  
  -- Controle de leitura
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Metadata adicional (JSON flexível)
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_client_id ON notifications(client_id);
CREATE INDEX idx_notifications_ticket_id ON notifications(ticket_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Enable Realtime
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- ===========================================
-- 2. ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Usuários só veem suas próprias notificações
CREATE POLICY "Usuários veem apenas suas notificações"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias notificações (marcar como lidas)
CREATE POLICY "Usuários podem atualizar suas notificações"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ===========================================
-- 3. TRIGGERS PARA AUTO-CRIAR NOTIFICAÇÕES
-- ===========================================

-- Function: Criar Notificação para External Message
CREATE OR REPLACE FUNCTION create_notification_external_message()
RETURNS TRIGGER AS $$
DECLARE
  team_member RECORD;
BEGIN
  -- Para mensagens INBOUND (cliente enviou) - notificar todos
  IF NEW.direction = 'inbound' THEN
    FOR team_member IN SELECT id FROM profiles
    LOOP
      INSERT INTO notifications (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_external_message_created
  AFTER INSERT ON external_messages
  FOR EACH ROW EXECUTE FUNCTION create_notification_external_message();

-- Function: Criar Notificação para Internal Message
CREATE OR REPLACE FUNCTION create_notification_internal_message()
RETURNS TRIGGER AS $$
DECLARE
  mention_user_id UUID;
  ticket_record RECORD;
BEGIN
  -- Buscar dados do ticket
  SELECT * INTO ticket_record FROM tickets WHERE id = NEW.ticket_id;
  
  -- 1. Notificar quem foi mencionado (@mentions)
  IF NEW.mentions IS NOT NULL AND array_length(NEW.mentions, 1) > 0 THEN
    FOREACH mention_user_id IN ARRAY NEW.mentions
    LOOP
      IF mention_user_id != NEW.sender_id THEN
        INSERT INTO notifications (
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
  
  -- 2. Notificar assignee do ticket (se não for o sender e não foi mencionado)
  IF ticket_record.assignee_id IS NOT NULL 
     AND ticket_record.assignee_id != NEW.sender_id 
     AND (NEW.mentions IS NULL OR NOT (ticket_record.assignee_id = ANY(NEW.mentions))) THEN
    INSERT INTO notifications (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_internal_message_created
  AFTER INSERT ON internal_messages
  FOR EACH ROW EXECUTE FUNCTION create_notification_internal_message();

-- Function: Criar Notificação para Novo Ticket
CREATE OR REPLACE FUNCTION create_notification_ticket_created()
RETURNS TRIGGER AS $$
DECLARE
  team_member RECORD;
BEGIN
  -- Notificar assignee especialmente (se houver)
  IF NEW.assignee_id IS NOT NULL THEN
    INSERT INTO notifications (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_ticket_created
  AFTER INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION create_notification_ticket_created();

-- Function: Criar Notificação para Direct Message
CREATE OR REPLACE FUNCTION create_notification_direct_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar apenas o receiver
  INSERT INTO notifications (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_direct_message_created
  AFTER INSERT ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION create_notification_direct_message();