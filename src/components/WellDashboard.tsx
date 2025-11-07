import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Upload, FileSpreadsheet, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { WellDataChart } from './WellDataChart';
import { Alert, AlertDescription } from './ui/alert';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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

interface WellDashboardProps {
  selectedWell: Well | null;
  onDataUploaded: () => void;
}

export function WellDashboard({ selectedWell, onDataUploaded }: WellDashboardProps) {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wellData, setWellData] = useState<WellData | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch well data when selected well changes
  React.useEffect(() => {
    if (selectedWell) {
      fetchWellData(selectedWell.id);
    } else {
      setWellData(null);
    }
  }, [selectedWell?.id]);

  const fetchWellData = async (wellId: string) => {
    setLoading(true);
    setMessage(null);
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
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedWell) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setMessage({ type: 'error', text: 'Please upload an Excel file (.xlsx or .xls)' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('wellId', selectedWell.id);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ef33fc5d/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `File uploaded successfully! Processed ${result.rowCount} data points.` 
        });
        // Refresh well data
        await fetchWellData(selectedWell.id);
        onDataUploaded();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to upload file' });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage({ type: 'error', text: 'Failed to upload file. Please try again.' });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteData = async () => {
    if (!selectedWell || !wellData) return;

    if (!confirm('Are you sure you want to delete this well data?')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ef33fc5d/well-data/${selectedWell.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Well data deleted successfully' });
        setWellData(null);
        onDataUploaded();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to delete data' });
      }
    } catch (error) {
      console.error('Error deleting well data:', error);
      setMessage({ type: 'error', text: 'Failed to delete data. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!selectedWell) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <FileSpreadsheet className="size-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-900 mb-2">No Well Selected</h3>
          <p className="text-slate-600">
            Select a well from the sidebar to view and upload drilling data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-slate-900 mb-1">{selectedWell.name}</h1>
              <p className="text-slate-600">
                Depth: {selectedWell.depth.toLocaleString()} ft
              </p>
            </div>
            <div className="flex items-center gap-3">
              {wellData && (
                <Button
                  onClick={handleDeleteData}
                  variant="outline"
                  disabled={loading}
                  className="gap-2"
                >
                  <Trash2 className="size-4" />
                  Delete Data
                </Button>
              )}
              <Button
                onClick={handleFileSelect}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Upload Data
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <Alert 
              className={`mt-4 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
            >
              {message.type === 'error' && <AlertCircle className="size-4 text-red-600" />}
              <AlertDescription className={message.type === 'success' ? 'text-green-900' : 'text-red-900'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="size-8 animate-spin text-slate-400" />
            </div>
          ) : wellData && wellData.data && wellData.data.length > 0 ? (
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-slate-900 mb-1">Drilling Data Visualization</h2>
                <p className="text-slate-600">
                  File: {wellData.fileName} • Uploaded: {new Date(wellData.uploadedAt).toLocaleString()} • {wellData.data.length} data points
                </p>
              </div>
              <div className="flex justify-center">
                <WellDataChart data={wellData.data} />
              </div>
            </Card>
          ) : (
            <Card className="p-12">
              <div className="text-center max-w-md mx-auto">
                <FileSpreadsheet className="size-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-900 mb-2">No Data Available</h3>
                <p className="text-slate-600 mb-6">
                  Upload an Excel file containing drilling data to visualize depth, rock composition, DT, and GR measurements
                </p>
                <Button onClick={handleFileSelect} className="gap-2">
                  <Upload className="size-4" />
                  Upload Data File
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
