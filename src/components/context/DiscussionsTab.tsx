import { useState, useEffect } from 'react';
import { useTickets, useUpdateTicket, Ticket } from '@/hooks/useTickets';
import { useProfiles } from '@/hooks/useProfiles';
import { useUnreadInternalMessagesByTicket, useMarkInternalMessagesAsRead } from '@/hooks/useUnreadInternalMessages';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, MessageSquare, Plus, Archive, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TicketThread } from './TicketThread';
import { CreateTicketDialog } from '@/components/dialogs/CreateTicketDialog';

interface DiscussionsTabProps {
  clientId: string;
  onHighlightExternalMessage?: (id: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos Status', color: 'bg-muted-foreground' },
  { value: 'Novo', label: 'Novo', color: 'bg-blue-500' },
  { value: 'Em andamento', label: 'Em andamento', color: 'bg-yellow-500' },
  { value: 'Concluido', label: 'Concluído', color: 'bg-green-500' },
  { value: 'Pendencia Interna', label: 'Pend. Interna', color: 'bg-orange-500' },
  { value: 'Pendencia Externa', label: 'Pend. Externa', color: 'bg-purple-500' },
];

export function DiscussionsTab({ clientId, onHighlightExternalMessage }: DiscussionsTabProps) {
  const { data: profiles } = useProfiles();
  const updateTicket = useUpdateTicket();
  const { data: unreadCounts } = useUnreadInternalMessagesByTicket(clientId);
  const markAsRead = useMarkInternalMessagesAsRead();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: allTickets } = useTickets(clientId, showArchived);
  
  const tickets = allTickets?.filter(ticket => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (assigneeFilter !== 'all' && ticket.assignee_id !== assigneeFilter) return false;
    return true;
  });

  // Mark messages as read when viewing a ticket
  useEffect(() => {
    if (selectedTicket) {
      markAsRead.mutate(selectedTicket.id);
    }
  }, [selectedTicket?.id]);

  const handleStatusChange = async (ticketId: string, status: string) => {
    await updateTicket.mutateAsync({ id: ticketId, status });
  };

  const handleArchiveTicket = async () => {
    if (!selectedTicket) return;
    await updateTicket.mutateAsync({ id: selectedTicket.id, is_archived: true });
    setSelectedTicket(null);
  };

  if (selectedTicket) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-medium truncate flex-1">{selectedTicket.title}</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-destructive"
            onClick={handleArchiveTicket}
          >
            <Archive className="h-4 w-4 mr-1" />
            Arquivar
          </Button>
        </div>
        <TicketThread 
          ticketId={selectedTicket.id} 
          onHighlightExternalMessage={onHighlightExternalMessage}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Create Button and Filters */}
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Discussões</h3>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Ticket
          </Button>
        </div>
        
        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Status" />
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

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {profiles?.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived" className="text-xs text-muted-foreground">
              Arquivados
            </Label>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y">
          {tickets?.map((ticket) => {
            const assignee = profiles?.find(p => p.id === ticket.assignee_id);
            const statusOption = STATUS_OPTIONS.find(s => s.value === ticket.status);
            const unreadCount = unreadCounts?.[ticket.id] ?? 0;

            return (
              <div
                key={ticket.id}
                className={cn(
                  "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                  ticket.is_archived && "opacity-60"
                )}
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{ticket.title}</p>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5 shrink-0">
                          {unreadCount} new
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {assignee?.name ?? 'Sem responsável'}
                    </p>
                  </div>
                  {ticket.is_archived && (
                    <Archive className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
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
                        <span>{statusOption?.label ?? ticket.status}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.filter(o => o.value !== 'all').map((option) => (
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
                      {unreadCount > 0 ? unreadCount : ''}
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
              <p>Nenhum tópico encontrado</p>
              <p className="text-sm">
                {showArchived ? 'Sem tickets arquivados' : 'Crie um novo ticket ou use "Discuss Internally"'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <CreateTicketDialog
        clientId={clientId}
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  );
}