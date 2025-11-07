import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Send, Bot, User, Loader2, MessageSquare, X } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

interface ChatPanelProps {
  wellId: string | null;
  wellName?: string;
  wellData?: WellData | null;
  onClose?: () => void;
}

export function ChatPanel({ wellId, wellName, wellData, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add welcome message when component mounts or well changes
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: wellId 
          ? `Hello! I'm your AI assistant for well drilling data analysis. I can help you understand the data for ${wellName || 'this well'}. Ask me anything about the rock composition, DT measurements, GR readings, or any patterns in the data.`
          : `Hello! I'm your AI assistant for well drilling data analysis. Select a well and upload data to get started, and I'll help you analyze it.`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [wellId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async () => {
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

    try {
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not found. Please set the environment variable.');
      }

      // Prepare context from well data if available
      let contextPrompt = '';
      if (wellData && wellData.data && wellData.data.length > 0) {
        const dataSummary = wellData.data.slice(0, 50).map(d =>
          `Depth: ${d.depth}ft, Rock: ${d.rockComposition}, DT: ${d.DT}, GR: ${d.GR}`
        ).join('\n');
        contextPrompt = `You are an AI assistant analyzing well drilling data. Here is the current well data (${wellData.data.length} data points from ${wellData.fileName}):\n\n${dataSummary}\n\n${wellData.data.length > 50 ? `...and ${wellData.data.length - 50} more data points\n\n` : ''}Answer questions about this drilling data, including rock composition analysis, DT (sonic travel time) measurements, GR (gamma ray) readings, depth correlations, and geological interpretations. Be specific and reference the actual data when possible.\n\n`;
      } else {
        contextPrompt = 'You are an AI assistant for well drilling data analysis. The user has not uploaded data yet, so provide general guidance about well logging and drilling data analysis.\n\n';
      }

      const fullPrompt = contextPrompt + `User question: ${userMessage.content}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: fullPrompt
              }]
            }]
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.candidates && result.candidates[0]) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.candidates[0].content.parts[0].text,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `❌ ${result.error?.message || 'Failed to get response from Gemini API'}\n\nPlease check your GEMINI_API_KEY environment variable.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
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
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Bot className="size-6 text-white" />
            </div>
            <div>
              <h3 className="text-slate-900">AI Well Data Assistant</h3>
              <p className="text-slate-600">
                {wellName || 'No well selected'}
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden"
            >
              <X className="size-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto" ref={scrollRef}>
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
                className={`flex-1 max-w-[80%] ${
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
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>
                <p className="text-slate-500 mt-1 px-1">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Bot className="size-4 text-white" />
              </div>
              <div className="bg-slate-100 p-3 rounded-lg">
                <Loader2 className="size-5 animate-spin text-slate-600" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white sticky bottom-0">
        <div className="max-w-3xl mx-auto">
          {!wellId && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
              <p>
                Select a well and upload data to get context-aware assistance
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
                wellId
                  ? 'Ask about the well data...'
                  : 'Ask a general question...'
              }
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="gap-2"
            >
              <Send className="size-4" />
              Send
            </Button>
          </div>
          <div className="mt-2 text-slate-500">
            <p>
              Try asking: "What rock types are present?" or "Explain the DT measurements"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}