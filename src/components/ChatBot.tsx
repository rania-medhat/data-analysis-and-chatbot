import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Send, Bot, User, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface WellDataPoint {
  depth: number;
  rockComposition: string;
  DT: number;
  GR: number;
}

interface WellData {
  wellId: string;
  fileName: string;
  uploadedAt: string;
  data: WellDataPoint[];
}

interface ChatBotProps {
  wellData?: WellData | null;
  className?: string;
}

export function ChatBot({ wellData, className = '' }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: wellData
          ? `Hello! I'm your AI assistant for analyzing well drilling data. I can help you understand the data from "${wellData.fileName}" with ${wellData.data.length} data points. Ask me about rock composition, DT measurements, GR readings, or any patterns in the data.`
          : `Hello! I'm your AI assistant for well drilling data analysis. Upload some well data and I'll help you analyze it.`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [wellData]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Focus input after sending message
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  const getGeminiApiKey = (): string | null => {
    // In Vite React frontend, use import.meta.env for environment variables
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.error('GEMINI_API_KEY not found. Please set VITE_GEMINI_API_KEY in your environment variables.');
      return null;
    }

    return apiKey;
  };

  const prepareContextPrompt = (userMessage: string): string => {
    if (!wellData || !wellData.data || wellData.data.length === 0) {
      return `You are an AI assistant for well drilling data analysis. The user has not uploaded data yet, so provide general guidance about well logging and drilling data analysis.

User question: ${userMessage}`;
    }

    // Prepare data summary (limit to first 50 points to avoid token limits)
    const dataSummary = wellData.data.slice(0, 50).map(d =>
      `Depth: ${d.depth}ft, Rock: ${d.rockComposition}, DT: ${d.DT}μs/ft, GR: ${d.GR}API`
    ).join('\n');

    const contextPrompt = `You are an AI assistant analyzing well drilling data from "${wellData.fileName}" uploaded on ${new Date(wellData.uploadedAt).toLocaleDateString()}.

Here is the well data (${wellData.data.length} total data points):

${dataSummary}

${wellData.data.length > 50 ? `...and ${wellData.data.length - 50} more data points\n\n` : ''}

Instructions:
- Answer questions about this drilling data, including rock composition analysis, DT (sonic travel time) measurements, GR (gamma ray) readings, depth correlations, and geological interpretations
- Be specific and reference the actual data when possible
- Explain technical terms and measurements
- Provide insights about geological formations and drilling conditions
- If asked about specific depth ranges, reference the actual data points
- If asked about trends or patterns, analyze the data and provide evidence-based conclusions

User question: ${userMessage}`;

    return contextPrompt;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Prepare context prompt
      const contextPrompt = prepareContextPrompt(userMessage.content);

      // Send to server-side chat function (safer: server holds API keys and picks a supported model)
      const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ef33fc5d/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ message: userMessage.content, wellId: wellData?.wellId || null }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Server chat request failed: ${resp.status}`);
      }

      const result = await resp.json();
      if (result.success && result.message) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(result.error || 'No response from server chat function');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <div className={`h-full flex flex-col bg-white ${className}`}>
      {/* Header - Fixed height */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Bot className="size-6 text-white" />
          </div>
          <div>
            <h3 className="text-slate-900 font-semibold">AI Well Data Assistant</h3>
            <p className="text-slate-600 text-sm">
              {wellData ? `${wellData.data.length} data points loaded` : 'No data loaded'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert - Fixed height when present */}
      {error && (
        <div className="flex-shrink-0">
          <Alert className="m-4 border-red-200 bg-red-50">
            <AlertCircle className="size-4 text-red-600" />
            <AlertDescription className="text-red-900">
              {error}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="ml-2 h-auto p-1 text-red-700 hover:text-red-900"
              >
                ×
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages - Flexible height with scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-slate-200'
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="size-4 text-slate-700" />
                  ) : (
                    <Bot className="size-4 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`flex-1 max-w-[85%] ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                  <p className="text-slate-500 mt-1 px-1 text-xs">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="size-4 text-white" />
                </div>
                <div className="bg-slate-100 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-slate-600" />
                    <span className="text-slate-600 text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll Anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input - Fixed at bottom */}
      <div className="flex-shrink-0 p-4 border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto">
          {!wellData && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
              <p>
                💡 Upload well drilling data to get context-aware assistance and detailed analysis.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                wellData
                  ? 'Ask about the well data (e.g., "What rock types are present?")'
                  : 'Ask a general question about well drilling...'
              }
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="gap-2 px-4"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Send
            </Button>
          </div>
          <div className="mt-2 text-slate-500 text-xs">
            <p>
              Press Enter to send • Try asking: "Analyze DT measurements" or "What formations are present?"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatBot;
