import { useState } from 'react';
import { useTickets, useUpdateTicket, Ticket } from '@/hooks/useTickets';
import { useProfiles } from '@/hooks/useProfiles';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TicketThread } from './TicketThread';

interface DiscussionsTabProps {
  clientId: string;
  onHighlightExternalMessage?: (id: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'Novo', label: 'Novo', color: 'bg-blue-500' },
  { value: 'Em andamento', label: 'Em andamento', color: 'bg-yellow-500' },
  { value: 'Concluido', label: 'Concluído', color: 'bg-green-500' },
  { value: 'Pendencia Interna', label: 'Pend. Interna', color: 'bg-orange-500' },
  { value: 'Pendencia Externa', label: 'Pend. Externa', color: 'bg-purple-500' },
];

export function DiscussionsTab({ clientId, onHighlightExternalMessage }: DiscussionsTabProps) {
  const { data: tickets } = useTickets(clientId);
  const { data: profiles } = useProfiles();
  const updateTicket = useUpdateTicket();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const handleStatusChange = async (ticketId: string, status: string) => {
    await updateTicket.mutateAsync({ id: ticketId, status });
  };

  if (selectedTicket) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-medium truncate flex-1">{selectedTicket.title}</h3>
        </div>
        <TicketThread 
          ticketId={selectedTicket.id} 
          onHighlightExternalMessage={onHighlightExternalMessage}
        />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {tickets?.map((ticket) => {
          const assignee = profiles?.find(p => p.id === ticket.assignee_id);
          const statusOption = STATUS_OPTIONS.find(s => s.value === ticket.status);

          return (
            <div
              key={ticket.id}
              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 mt-0.5">
                  <AvatarImage src={assignee?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {assignee?.name?.substring(0, 2).toUpperCase() ?? '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ticket.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {assignee?.name ?? 'Sem responsável'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 gap-2">
                <Select
                  value={ticket.status ?? 'Novo'}
                  onValueChange={(value) => {
                    handleStatusChange(ticket.id, value);
                  }}
                >
                  <SelectTrigger 
                    className="h-7 w-auto text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", statusOption?.color)} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", option.color)} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    0
                  </span>
                  <span>{format(new Date(ticket.created_at!), 'dd/MM')}</span>
                </div>
              </div>
            </div>
          );
        })}

        {!tickets?.length && (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum tópico ainda</p>
            <p className="text-sm">Use "Discuss Internally" no chat</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
