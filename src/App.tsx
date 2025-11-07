import React, { useState, useEffect } from 'react';
import { WellListPanel } from './components/WellListPanel';
import { WellDashboard } from './components/WellDashboard';
import { AddWellDialog } from './components/AddWellDialog';
import { ChatBot } from './components/ChatBot';
import { Loader2, Menu, X, MessageSquare } from 'lucide-react';
import { Button } from './components/ui/button';
import { projectId, publicAnonKey } from './utils/supabase/info';

interface Well {
  id: string;
  name: string;
  depth: number;
  createdAt: string;
}

interface WellData {
  wellId: string;
  fileName: string;
  uploadedAt: string;
  data: Array<{
    depth: number;
    rockComposition: string;
    DT: number;
    GR: number;
  }>;
}

export default function App() {
  const [wells, setWells] = useState<Well[]>([]);
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addWellDialogOpen, setAddWellDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [wellData, setWellData] = useState<WellData | null>(null);

  useEffect(() => {
    fetchWells();
    initializeMockData();
  }, []);

  const initializeMockData = async () => {
    try {
      // Check if we already have wells
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ef33fc5d/wells`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();
      
      // If no wells exist, create some mock data
      if (result.success && result.wells.length === 0) {
        const mockWells = [
          { name: 'Well Alpha-1', depth: 8500 },
          { name: 'Well Beta-2', depth: 12300 },
          { name: 'Well Gamma-3', depth: 6750 },
          { name: 'Well Delta-4', depth: 9200 },
        ];

        for (const well of mockWells) {
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-ef33fc5d/wells`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify(well),
            }
          );
        }

        // Refresh the wells list
        await fetchWells();
      }
    } catch (error) {
      console.error('Error initializing mock data:', error);
    }
  };

  const fetchWells = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ef33fc5d/wells`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        const sortedWells = result.wells.sort((a: Well, b: Well) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setWells(sortedWells);
        
        // Auto-select first well if none selected
        if (!selectedWellId && sortedWells.length > 0) {
          setSelectedWellId(sortedWells[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching wells:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWell = () => {
    setAddWellDialogOpen(true);
  };

  const handleWellAdded = () => {
    fetchWells();
  };

  const handleSelectWell = (wellId: string) => {
    setSelectedWellId(wellId);
    setSidebarOpen(false); // Close sidebar on mobile after selection
    // Fetch well data when selecting a well
    fetchWellData(wellId);
  };

  const fetchWellData = async (wellId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ef33fc5d/well-data/${wellId}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();

      if (result.success && result.wellData) {
        setWellData(result.wellData);
      } else {
        setWellData(null);
      }
    } catch (error) {
      console.error('Error fetching well data:', error);
      setWellData(null);
    }
  };

  const selectedWell = wells.find(w => w.id === selectedWellId) || null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
        <h1 className="text-slate-900">Well Drilling Platform</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChatOpen(!chatOpen)}
          >
            <MessageSquare className="size-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:block w-80 h-full">
          <WellListPanel
            wells={wells}
            selectedWellId={selectedWellId}
            onSelectWell={handleSelectWell}
            onAddWell={handleAddWell}
          />
        </div>

        {/* Sidebar - Mobile */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
            <div className="w-80 h-full bg-white" onClick={(e) => e.stopPropagation()}>
              <WellListPanel
                wells={wells}
                selectedWellId={selectedWellId}
                onSelectWell={handleSelectWell}
                onAddWell={handleAddWell}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 h-full overflow-hidden">
          <WellDashboard
            selectedWell={selectedWell}
            onDataUploaded={() => {
              fetchWells();
              if (selectedWellId) {
                fetchWellData(selectedWellId);
              }
            }}
          />
        </div>

        {/* Chat Panel - Desktop */}
        <div className="hidden lg:block w-96 h-full border-l border-slate-200">
          <ChatBot
            wellData={wellData}
          />
        </div>

        {/* Chat Panel - Mobile */}
        {chatOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-white">
            <ChatBot
              wellData={wellData}
            />
          </div>
        )}
      </div>

      <AddWellDialog
        open={addWellDialogOpen}
        onOpenChange={setAddWellDialogOpen}
        onWellAdded={handleWellAdded}
      />
    </div>
  );
}