import { useClient, useUpdateClient } from '@/hooks/useClients';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ClientInfoTabProps {
  clientId: string;
}

const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const STATUS_OPTIONS = ['Onboarding', 'Happy', 'At Risk', 'Churned'];

export function ClientInfoTab({ clientId }: ClientInfoTabProps) {
  const { data: client } = useClient(clientId);
  const updateClient = useUpdateClient();

  const handleUpdate = async (field: string, value: any) => {
    try {
      await updateClient.mutateAsync({ id: clientId, [field]: value });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar');
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const parseCurrency = (value: string) => {
    const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  if (!client) return null;

  return (
    <div className="space-y-6">
      {/* Vital Signs */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Vital Signs</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={client.priority ?? 'Medium'}
              onValueChange={(value) => handleUpdate('priority', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={client.status ?? 'Onboarding'}
              onValueChange={(value) => handleUpdate('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Budgets */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Budgets</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Meta Ads</Label>
            <Input
              defaultValue={formatCurrency(client.budget_meta)}
              onBlur={(e) => handleUpdate('budget_meta', parseCurrency(e.target.value))}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="space-y-2">
            <Label>Google Ads</Label>
            <Input
              defaultValue={formatCurrency(client.budget_google)}
              onBlur={(e) => handleUpdate('budget_google', parseCurrency(e.target.value))}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="space-y-2">
            <Label>TikTok Ads</Label>
            <Input
              defaultValue={formatCurrency(client.budget_tiktok)}
              onBlur={(e) => handleUpdate('budget_tiktok', parseCurrency(e.target.value))}
              placeholder="R$ 0,00"
            />
          </div>
        </div>
      </section>

      {/* Meeting Info */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Meeting Info</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Last Meeting</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !client.last_meeting && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {client.last_meeting 
                    ? format(new Date(client.last_meeting), 'dd/MM/yyyy')
                    : 'Selecionar data'
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={client.last_meeting ? new Date(client.last_meeting) : undefined}
                  onSelect={(date) => handleUpdate('last_meeting', date?.toISOString())}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Meeting Minutes Link</Label>
            <Input
              defaultValue={client.meeting_minutes_link ?? ''}
              onBlur={(e) => handleUpdate('meeting_minutes_link', e.target.value || null)}
              placeholder="https://..."
            />
          </div>
        </div>
      </section>

      {/* Links */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Links</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Google Drive</Label>
            <Input
              defaultValue={client.google_drive_link ?? ''}
              onBlur={(e) => handleUpdate('google_drive_link', e.target.value || null)}
              placeholder="https://drive.google.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label>Meta Ads Account</Label>
            <Input
              defaultValue={client.meta_ads_link ?? ''}
              onBlur={(e) => handleUpdate('meta_ads_link', e.target.value || null)}
              placeholder="https://business.facebook.com/..."
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Google Ads Account</Label>
            <Input
              defaultValue={client.google_ads_link ?? ''}
              onBlur={(e) => handleUpdate('google_ads_link', e.target.value || null)}
              placeholder="https://ads.google.com/..."
            />
          </div>
        </div>
      </section>

      {/* Automação */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Automação</h3>
        <div className="space-y-2">
          <Label>WhatsApp Group ID</Label>
          <Input
            defaultValue={client.whatsapp_group_id ?? ''}
            onBlur={(e) => handleUpdate('whatsapp_group_id', e.target.value || null)}
            placeholder="ID do grupo no WhatsApp"
          />
        </div>
      </section>
    </div>
  );
}
