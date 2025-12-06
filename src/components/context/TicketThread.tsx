import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInternalMessages, useSendInternalMessage } from '@/hooks/useMessages';
import { useProfiles } from '@/hooks/useProfiles';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Quote } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TicketThreadProps {
  ticketId: string;
  onHighlightExternalMessage?: (id: string) => void;
}

export function TicketThread({ ticketId, onHighlightExternalMessage }: TicketThreadProps) {
  const { user } = useAuth();
  const { data: messages } = useInternalMessages(ticketId);
  const { data: profiles } = useProfiles();
  const sendMessage = useSendInternalMessage();
  
  const [content, setContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!content.trim() || !user) return;

    const mentionedIds: string[] = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const profile = profiles?.find(p => 
        p.name.toLowerCase().includes(match[1].toLowerCase())
      );
      if (profile) mentionedIds.push(profile.id);
    }

    await sendMessage.mutateAsync({
      ticket_id: ticketId,
      content: content.trim(),
      sender_id: user.id,
      mentions: mentionedIds.length > 0 ? mentionedIds : undefined,
    });
    setContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === '@') {
      setShowMentions(true);
      setMentionSearch('');
    }
  };

  const handleMentionSelect = (name: string) => {
    const cursorPos = textareaRef.current?.selectionStart ?? content.length;
    const beforeCursor = content.slice(0, cursorPos);
    const afterCursor = content.slice(cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    const newContent = beforeCursor.slice(0, lastAtIndex) + `@${name} ` + afterCursor;
    setContent(newContent);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const filteredProfiles = profiles?.filter(p => 
    p.id !== user?.id && 
    p.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages?.map((msg: any) => {
            const sender = msg.sender;
            const quotedMessage = msg.quoted_message;

            return (
              <div key={msg.id} className="flex gap-3">
                <Avatar className="h-8 w-8 mt-0.5">
                  <AvatarImage src={sender?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {sender?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-sm">{sender?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(msg.created_at), 'dd/MM HH:mm')}
                    </span>
                  </div>

                  {quotedMessage && (
                    <button
                      onClick={() => onHighlightExternalMessage?.(quotedMessage.id)}
                      className="mt-1 p-2 bg-muted rounded border-l-4 border-primary text-left w-full hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Quote className="h-3 w-3" />
                        <span>{quotedMessage.sender_name}</span>
                      </div>
                      <p className="text-sm line-clamp-2">{quotedMessage.content}</p>
                    </button>
                  )}

                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {msg.content.split(/(@\w+)/g).map((part: string, i: number) => {
                      if (part.startsWith('@')) {
                        return (
                          <span key={i} className="text-primary font-medium">
                            {part}
                          </span>
                        );
                      }
                      return part;
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t relative">
        {showMentions && filteredProfiles && filteredProfiles.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-1 bg-popover border rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {filteredProfiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleMentionSelect(profile.name)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={profile.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {profile.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{profile.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              const lastChar = e.target.value.slice(-1);
              if (lastChar === '@') {
                setShowMentions(true);
                setMentionSearch('');
              } else if (showMentions) {
                const lastAtIndex = e.target.value.lastIndexOf('@');
                if (lastAtIndex >= 0) {
                  setMentionSearch(e.target.value.slice(lastAtIndex + 1));
                } else {
                  setShowMentions(false);
                }
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowMentions(false), 200)}
            placeholder="Digite uma mensagem... Use @ para mencionar"
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button onClick={handleSend} disabled={!content.trim() || sendMessage.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
