import { useState, useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ExternalChat } from '@/components/chat/ExternalChat';
import { DirectChat } from '@/components/chat/DirectChat';
import { InternalContext } from '@/components/context/InternalContext';
import { useRealtime } from '@/hooks/useRealtime';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, MessageSquare } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export default function Dashboard() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const { markContextAsRead } = useNotifications();

  useRealtime();

  // When a client is selected, mark external message notifications for that client as read
  useEffect(() => {
    if (selectedClientId) {
      markContextAsRead.mutate({ type: 'external_message', client_id: selectedClientId });
    }
  }, [selectedClientId, markContextAsRead]);

  // When a member (direct chat) is selected, mark direct_message notifications from that sender as read
  useEffect(() => {
    if (selectedMemberId) {
      markContextAsRead.mutate({ type: 'direct_message', sender_id: selectedMemberId });
    }
  }, [selectedMemberId, markContextAsRead]);

  const renderMainContent = () => {
    // Mode B: Direct Message with team member
    if (selectedMemberId) {
      return <DirectChat partnerId={selectedMemberId} />;
    }

    // Mode A: Client view with split panels
    if (selectedClientId) {
      if (isMaximized) {
        return (
          <div className="relative h-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10"
              onClick={() => setIsMaximized(false)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <ExternalChat 
              clientId={selectedClientId} 
              highlightedMessageId={highlightedMessageId}
              onHighlightMessage={setHighlightedMessageId}
            />
          </div>
        );
      }

      return (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={55} minSize={40}>
            <div className="relative h-full">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10"
                onClick={() => setIsMaximized(true)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <ExternalChat 
                clientId={selectedClientId} 
                highlightedMessageId={highlightedMessageId}
                onHighlightMessage={setHighlightedMessageId}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={30}>
            <InternalContext 
              clientId={selectedClientId}
              onHighlightExternalMessage={setHighlightedMessageId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      );
    }

    // Empty state
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Selecione um cliente ou membro da equipe</p>
        <p className="text-sm">para começar a conversar</p>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full">
      <AppSidebar
        selectedClientId={selectedClientId}
        selectedMemberId={selectedMemberId}
        onSelectClient={setSelectedClientId}
        onSelectMember={setSelectedMemberId}
      />
      <main className="flex-1 overflow-hidden">
        {renderMainContent()}
      </main>
    </div>
  );
}