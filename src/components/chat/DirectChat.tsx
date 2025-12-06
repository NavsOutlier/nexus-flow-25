import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfiles';
import { useDirectMessages, useSendDirectMessage } from '@/hooks/useMessages';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DirectChatProps {
  partnerId: string;
}

export function DirectChat({ partnerId }: DirectChatProps) {
  const { user } = useAuth();
  const { data: partner } = useProfile(partnerId);
  const { data: messages } = useDirectMessages(user?.id, partnerId);
  const sendMessage = useSendDirectMessage();
  
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!user?.id || !messages) return;
    
    const unreadIds = messages
      .filter((m: any) => m.receiver_id === user.id && !m.is_read)
      .map((m: any) => m.id);
    
    if (unreadIds.length > 0) {
      supabase
        .from('direct_messages')
        .update({ is_read: true })
        .in('id', unreadIds)
        .then(() => {});
    }
  }, [messages, user?.id]);

  const handleSend = async () => {
    if (!message.trim() || !user) return;

    await sendMessage.mutateAsync({
      sender_id: user.id,
      receiver_id: partnerId,
      content: message.trim(),
    });
    setMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 bg-card border-b flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={partner?.avatar_url ?? undefined} />
            <AvatarFallback>
              {partner?.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card",
            partner?.status === 'online' ? "bg-status-online" : "bg-status-offline"
          )} />
        </div>
        <div>
          <h2 className="font-semibold">{partner?.name}</h2>
          <p className="text-xs text-muted-foreground">
            {partner?.status === 'online' ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-3 max-w-3xl mx-auto">
          {messages?.map((msg: any) => {
            const isOwn = msg.sender_id === user?.id;
            
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  isOwn ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-3 py-2",
                    isOwn 
                      ? "bg-primary text-primary-foreground rounded-br-none" 
                      : "bg-muted rounded-bl-none"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={cn(
                    "text-[10px] mt-1",
                    isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite uma mensagem..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!message.trim() || sendMessage.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
