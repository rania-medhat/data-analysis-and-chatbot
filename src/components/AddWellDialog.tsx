import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2 } from 'lucide-react';

interface AddWellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWellAdded: () => void;
}

export function AddWellDialog({ open, onOpenChange, onWellAdded }: AddWellDialogProps) {
  const [name, setName] = useState('');
  const [depth, setDepth] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !depth.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const depthNum = parseFloat(depth);
    if (isNaN(depthNum) || depthNum <= 0) {
      setError('Please enter a valid depth');
      return;
    }

    setLoading(true);

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ef33fc5d/wells`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            depth: depthNum,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setName('');
        setDepth('');
        onWellAdded();
        onOpenChange(false);
      } else {
        setError(result.error || 'Failed to create well');
      }
    } catch (err) {
      console.error('Error creating well:', err);
      setError('Failed to create well. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Well</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Well Name</Label>
              <Input
                id="name"
                placeholder="e.g., Well A-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depth">Depth (ft)</Label>
              <Input
                id="depth"
                type="number"
                placeholder="e.g., 5000"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                disabled={loading}
                min="0"
                step="0.01"
              />
            </div>
            {error && (
              <p className="text-red-600">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Well'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
