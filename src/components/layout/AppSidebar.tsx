import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfiles';
import { useClients } from '@/hooks/useClients';
import { useProfiles } from '@/hooks/useProfiles';
import { useNewTicketsCount } from '@/hooks/useTickets';
import { useUnreadDirectMessagesCount } from '@/hooks/useMessages';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogOut, Users, MessageSquare, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateClientDialog } from '@/components/dialogs/CreateClientDialog';

interface AppSidebarProps {
  selectedClientId: string | null;
  selectedMemberId: string | null;
  onSelectClient: (id: string | null) => void;
  onSelectMember: (id: string | null) => void;
}

export function AppSidebar({ 
  selectedClientId, 
  selectedMemberId, 
  onSelectClient, 
  onSelectMember 
}: AppSidebarProps) {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: clients } = useClients();
  const { data: profiles } = useProfiles();
  const { data: unreadCounts } = useUnreadDirectMessagesCount(user?.id);
  const [showCreateClient, setShowCreateClient] = useState(false);

  const teamMembers = profiles?.filter(p => p.id !== user?.id) ?? [];

  return (
    <div className="flex flex-col h-full w-64 bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sidebar-accent">
            <MessageSquare className="h-5 w-5" />
          </div>
          <span className="font-semibold">Traffic Hub</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Client Groups */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase text-sidebar-muted">
              Client Groups
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 text-sidebar-muted hover:text-sidebar-foreground"
              onClick={() => setShowCreateClient(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {clients?.map((client) => (
              <ClientItem 
                key={client.id} 
                client={client}
                isSelected={selectedClientId === client.id}
                onClick={() => {
                  onSelectClient(client.id);
                  onSelectMember(null);
                }}
              />
            ))}
          </div>
        </div>

        {/* Team Directs */}
        <div className="p-4 pt-0">
          <span className="text-xs font-semibold uppercase text-sidebar-muted mb-3 block">
            Team Directs
          </span>
          <div className="space-y-1">
            {teamMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => {
                  onSelectMember(member.id);
                  onSelectClient(null);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  selectedMemberId === member.id 
                    ? "bg-sidebar-accent" 
                    : "hover:bg-sidebar-accent/50"
                )}
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-sidebar-accent text-xs">
                      {member.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn(
                    "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-sidebar",
                    member.status === 'online' ? "bg-status-online" : "bg-status-offline"
                  )} />
                </div>
                <span className="flex-1 text-left text-sm truncate">{member.name}</span>
                {unreadCounts?.[member.id] && (
                  <span className="h-2 w-2 rounded-full bg-status-unread animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* User Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-sidebar-accent">
              {profile?.name?.substring(0, 2).toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.name}</p>
            <p className="text-xs text-sidebar-muted truncate">{user?.email}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CreateClientDialog open={showCreateClient} onOpenChange={setShowCreateClient} />
    </div>
  );
}

function ClientItem({ 
  client, 
  isSelected, 
  onClick 
}: { 
  client: any; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const { data: newCount } = useNewTicketsCount(client.id);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
        isSelected ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
      )}
    >
      <div className="relative">
        <div className="h-8 w-8 rounded-lg bg-sidebar-accent flex items-center justify-center">
          <Users className="h-4 w-4" />
        </div>
        {(newCount ?? 0) > 0 && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-status-unread animate-pulse" />
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm truncate">{client.name}</p>
        {(newCount ?? 0) > 0 && (
          <p className="text-xs text-sidebar-muted">{newCount} New Topics</p>
        )}
      </div>
    </button>
  );
}
