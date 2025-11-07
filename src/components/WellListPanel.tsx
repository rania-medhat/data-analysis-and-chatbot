import React from 'react';
import { Button } from './ui/button';
import { Plus, ChevronRight } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface Well {
  id: string;
  name: string;
  depth: number;
  createdAt: string;
}

interface WellListPanelProps {
  wells: Well[];
  selectedWellId: string | null;
  onSelectWell: (wellId: string) => void;
  onAddWell: () => void;
}

export function WellListPanel({ wells, selectedWellId, onSelectWell, onAddWell }: WellListPanelProps) {
  return (
    <div className="h-full flex flex-col bg-slate-50 border-r border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-slate-900">Wells</h2>
          <Button
            onClick={onAddWell}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Add Well
          </Button>
        </div>
        <p className="text-slate-600">
          {wells.length} {wells.length === 1 ? 'well' : 'wells'} total
        </p>
      </div>

      {/* Well List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {wells.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              <p>No wells yet</p>
              <p className="text-slate-400">Click "Add Well" to create one</p>
            </div>
          ) : (
            <div className="space-y-1">
              {wells.map((well) => (
                <button
                  key={well.id}
                  onClick={() => onSelectWell(well.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all group ${
                    selectedWellId === well.id
                      ? 'bg-blue-50 border border-blue-200 shadow-sm'
                      : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`truncate ${
                            selectedWellId === well.id
                              ? 'text-blue-900'
                              : 'text-slate-900'
                          }`}
                        >
                          {well.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-slate-600">
                          Depth: {well.depth.toLocaleString()} ft
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`size-5 flex-shrink-0 transition-all ${
                        selectedWellId === well.id
                          ? 'text-blue-600 opacity-100'
                          : 'text-slate-400 opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
