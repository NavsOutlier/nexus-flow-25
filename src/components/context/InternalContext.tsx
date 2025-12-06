import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiscussionsTab } from './DiscussionsTab';
import { ClientInfoTab } from './ClientInfoTab';

interface InternalContextProps {
  clientId: string;
  onHighlightExternalMessage?: (id: string) => void;
}

export function InternalContext({ clientId, onHighlightExternalMessage }: InternalContextProps) {
  const [activeTab, setActiveTab] = useState('discussions');

  return (
    <div className="flex flex-col h-full bg-card" key={clientId}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="border-b px-4">
          <TabsList className="h-12 w-full justify-start gap-4 bg-transparent p-0">
            <TabsTrigger 
              value="discussions" 
              className="relative h-12 rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 font-medium data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              Discussions
            </TabsTrigger>
            <TabsTrigger 
              value="info"
              className="relative h-12 rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 font-medium data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              Client Info
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="discussions" className="flex-1 overflow-hidden m-0">
          <DiscussionsTab 
            clientId={clientId} 
            onHighlightExternalMessage={onHighlightExternalMessage}
          />
        </TabsContent>
        
        <TabsContent value="info" className="flex-1 overflow-y-auto m-0 p-4">
          <ClientInfoTab clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
