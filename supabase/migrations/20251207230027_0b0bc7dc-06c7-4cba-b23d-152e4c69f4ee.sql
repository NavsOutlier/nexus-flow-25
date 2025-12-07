-- Add UPDATE policy for external_messages (needed for mark as read)
CREATE POLICY "Usuários autenticados podem atualizar external_messages"
ON public.external_messages
FOR UPDATE
USING (true);

-- Add UPDATE policy for internal_messages (needed for mark as read)
CREATE POLICY "Usuários autenticados podem atualizar internal_messages"
ON public.internal_messages
FOR UPDATE
USING (true);