import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets, useCreateTicket } from '@/hooks/useTickets';
import { useSendInternalMessage, ExternalMessage } from '@/hooks/useMessages';
import { useProfiles } from '@/hooks/useProfiles';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface DiscussMessageDialogProps {
  message: ExternalMessage | null;
  clientId: string;
  onClose: () => void;
}

export function DiscussMessageDialog({ message, clientId, onClose }: DiscussMessageDialogProps) {
  const { user } = useAuth();
  const { data: tickets } = useTickets(clientId);
  const { data: profiles } = useProfiles();
  const createTicket = useCreateTicket();
  const sendInternalMessage = useSendInternalMessage();

  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [comment, setComment] = useState('');

  const openTickets = tickets?.filter(t => t.status !== 'Concluido') ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !message) return;

    try {
      let ticketId = selectedTicketId;

      if (mode === 'new') {
        if (!title.trim()) {
          toast.error('Digite um título para o tópico');
          return;
        }
        const newTicket = await createTicket.mutateAsync({
          client_id: clientId,
          title: title.trim(),
          status: 'Novo',
          assignee_id: assigneeId && assigneeId !== 'none' ? assigneeId : null,
        });
        ticketId = newTicket.id;
      }

      if (!ticketId) {
        toast.error('Selecione um tópico');
        return;
      }

      await sendInternalMessage.mutateAsync({
        ticket_id: ticketId,
        content: comment.trim() || `Discussão sobre: "${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}"`,
        sender_id: user.id,
        quoted_external_message_id: message.id,
      });

      toast.success(mode === 'new' ? 'Tópico criado!' : 'Mensagem adicionada!');
      resetAndClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar');
    }
  };

  const resetAndClose = () => {
    setMode('new');
    setTitle('');
    setAssigneeId('');
    setSelectedTicketId('');
    setComment('');
    onClose();
  };

  return (
    <Dialog open={!!message} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Discutir Internamente</DialogTitle>
        </DialogHeader>

        {message && (
          <div className="p-3 bg-muted rounded-lg border-l-4 border-primary mb-4">
            <p className="text-xs text-muted-foreground mb-1">{message.sender_name}</p>
            <p className="text-sm line-clamp-3">{message.content}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'new' | 'existing')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new">Criar Novo Tópico</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" />
              <Label htmlFor="existing">Adicionar a Tópico Existente</Label>
            </div>
          </RadioGroup>

          {mode === 'new' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Tópico</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Dúvida sobre campanha"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignee">Atribuir a (opcional)</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {profiles?.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Selecionar Tópico</Label>
              <Select value={selectedTicketId} onValueChange={setSelectedTicketId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um tópico..." />
                </SelectTrigger>
                <SelectContent>
                  {openTickets.map((ticket) => (
                    <SelectItem key={ticket.id} value={ticket.id}>
                      {ticket.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comment">Comentário (opcional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Adicione um comentário..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetAndClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createTicket.isPending || sendInternalMessage.isPending}
            >
              {mode === 'new' ? 'Criar Tópico' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
