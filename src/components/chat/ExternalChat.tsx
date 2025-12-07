import { useState, useRef, useEffect, forwardRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfiles';
import { useClient } from '@/hooks/useClients';
import { useExternalMessages, useSendExternalMessage, ExternalMessage } from '@/hooks/useMessages';
import { useMarkExternalMessagesAsRead } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DiscussMessageDialog } from '@/components/dialogs/DiscussMessageDialog';

interface ExternalChatProps {
  clientId: string;
  highlightedMessageId?: string | null;
  onHighlightMessage?: (id: string | null) => void;
}

export function ExternalChat({ clientId, highlightedMessageId, onHighlightMessage }: ExternalChatProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: client } = useClient(clientId);
  const { data: messages } = useExternalMessages(clientId);
  const sendMessage = useSendExternalMessage();
  const markAsRead = useMarkExternalMessagesAsRead();
  
  const [message, setMessage] = useState('');
  const [discussMessage, setDiscussMessage] = useState<ExternalMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Mark external messages as read when viewing
  useEffect(() => {
    if (clientId) {
      markAsRead.mutate(clientId);
    }
  }, [clientId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (highlightedMessageId && messageRefs.current[highlightedMessageId]) {
      messageRefs.current[highlightedMessageId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => onHighlightMessage?.(null), 2000);
    }
  }, [highlightedMessageId, onHighlightMessage]);

  const handleSend = async () => {
    if (!message.trim() || !client?.whatsapp_group_id || !profile) return;

    try {
      await sendMessage.mutateAsync({
        clientId,
        content: message.trim(),
        senderName: profile.name,
        groupId: client.whatsapp_group_id,
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-whatsapp-bg">
      {/* Header */}
      <div className="px-4 py-3 bg-card border-b flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-semibold">{client?.name}</h2>
          <p className="text-xs text-muted-foreground">WhatsApp Group</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-2 max-w-3xl mx-auto">
          {messages?.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isHighlighted={highlightedMessageId === msg.id}
              onDiscuss={() => setDiscussMessage(msg)}
              ref={(el) => { messageRefs.current[msg.id] = el; }}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-card border-t">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={client?.whatsapp_group_id ? "Digite uma mensagem..." : "Configure o WhatsApp Group ID primeiro"}
            disabled={!client?.whatsapp_group_id}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!message.trim() || !client?.whatsapp_group_id || sendMessage.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DiscussMessageDialog
        message={discussMessage}
        clientId={clientId}
        onClose={() => setDiscussMessage(null)}
      />
    </div>
  );
}

interface MessageBubbleProps {
  message: ExternalMessage;
  isHighlighted: boolean;
  onDiscuss: () => void;
}

const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
  ({ message, isHighlighted, onDiscuss }, ref) => {
    const [showAction, setShowAction] = useState(false);
    const isOutbound = message.direction === 'outbound';

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start gap-2 group",
          isOutbound ? "justify-end" : "justify-start"
        )}
        onMouseEnter={() => setShowAction(true)}
        onMouseLeave={() => setShowAction(false)}
      >
        {isOutbound && showAction && (
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center"
            onClick={(e) => {
              e.stopPropagation();
              onDiscuss();
            }}
          >
            Discuss Internally
          </Button>
        )}
        <div
          className={cn(
            "relative max-w-[70%] rounded-lg px-3 py-2 shadow-sm transition-all",
            isOutbound 
              ? "bg-whatsapp text-whatsapp-foreground rounded-br-none" 
              : "bg-card rounded-bl-none",
            isHighlighted && "ring-2 ring-primary ring-offset-2"
          )}
        >
          {!isOutbound && (
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {message.sender_name}
            </p>
          )}
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          <div className={cn(
            "flex items-center gap-2 mt-1",
            isOutbound ? "justify-end" : "justify-between"
          )}>
            {isOutbound && (
              <span className="text-[10px] opacity-70">
                Sent by {message.sender_name}
              </span>
            )}
            <span className={cn(
              "text-[10px]",
              isOutbound ? "opacity-70" : "text-muted-foreground"
            )}>
              {format(new Date(message.timestamp!), 'HH:mm')}
            </span>
          </div>
        </div>
        {!isOutbound && showAction && (
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center"
            onClick={(e) => {
              e.stopPropagation();
              onDiscuss();
            }}
          >
            Discuss Internally
          </Button>
        )}
      </div>
    );
  }
);

MessageBubble.displayName = 'MessageBubble';
