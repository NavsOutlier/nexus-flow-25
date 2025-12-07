import { useState } from 'react';
import { useCreateTicket } from '@/hooks/useTickets';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface CreateTicketDialogProps {
  clientId: string;
  open: boolean;
  onClose: () => void;
}

export function CreateTicketDialog({ clientId, open, onClose }: CreateTicketDialogProps) {
  const { user } = useAuth();
  const { data: profiles } = useProfiles();
  const createTicket = useCreateTicket();
  
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Digite um título para o ticket');
      return;
    }

    try {
      await createTicket.mutateAsync({
        client_id: clientId,
        title: title.trim(),
        assignee_id: assigneeId || user?.id || null,
        status: 'Novo',
      });
      toast.success('Ticket criado com sucesso');
      setTitle('');
      setAssigneeId('');
      onClose();
    } catch (error) {
      toast.error('Erro ao criar ticket');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Ticket</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descreva o assunto do ticket..."
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Responsável</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent>
                {profiles?.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createTicket.isPending}>
            Criar Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}