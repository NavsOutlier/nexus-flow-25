"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function NotificationCenter() {
  const { unreadNotifications, markAsRead, markContextAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const prevCount = useRef<number>(0);
  const [hasUnseen, setHasUnseen] = useState(false);

  // Play a short beep using WebAudio API
  const playSound = () => {
    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 1000;
      g.gain.value = 0.08;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.18);
    } catch (e) {
      // ignore if audio not supported
    }
  };

  // Detect new notifications -> sound + set badge as unseen (blink)
  useEffect(() => {
    const current = unreadNotifications.length;
    if (current > prevCount.current && current > 0) {
      playSound();
      setHasUnseen(true);
    }
    prevCount.current = current;
  }, [unreadNotifications.length]);

  // When opening the popover, mark all unread as read
  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadNotifications.length > 0) {
      const ids = unreadNotifications.map((n) => n.id);
      try {
        await markAsRead.mutateAsync(ids);
      } catch {
        // mutation will invalidate and show errors elsewhere if needed
      } finally {
        setHasUnseen(false);
      }
    }
  };

  const handleMarkOne = async (id: string) => {
    try {
      await markAsRead.mutateAsync([id]);
    } catch {
      // ignore
    }
  };

  // Helper: format relative timestamp
  const fmt = (iso?: string) => {
    if (!iso) return '';
    try {
      return format(new Date(iso), 'dd/MM HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notificações (${unreadNotifications.length})`}
        >
          <Bell className="h-5 w-5" />
          {unreadNotifications.length > 0 && (
            <span
              className={cn(
                "absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-medium leading-none text-white",
                "bg-destructive",
                hasUnseen ? "animate-pulse" : ""
              )}
            >
              {unreadNotifications.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-0">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h4 className="text-sm font-medium">Notificações</h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{unreadNotifications.length} não lidas</span>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="h-72">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {unreadNotifications.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Sem notificações
                </div>
              )}

              {unreadNotifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start justify-between gap-2 p-2 rounded hover:bg-muted/40"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium truncate">{n.title}</span>
                      <span className="text-[11px] text-muted-foreground">{fmt(n.created_at)}</span>
                    </div>
                    {n.description && (
                      <p className="text-xs text-muted-foreground truncate mt-1">{n.description}</p>
                    )}
                    {n.metadata && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {/* optionally show context preview */}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkOne(n.id)}
                    >
                      Marcar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end px-3 py-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (unreadNotifications.length === 0) return;
              try {
                const ids = unreadNotifications.map((n) => n.id);
                await markAsRead.mutateAsync(ids);
                setHasUnseen(false);
              } catch {
                // ignore
              }
            }}
          >
            Marcar todas como lidas
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}