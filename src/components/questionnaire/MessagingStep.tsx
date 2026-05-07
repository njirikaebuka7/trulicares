import { useState } from 'react';
import { Send, ArrowRight, Phone, Video, MoreHorizontal, Check, CheckCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import { mockMatches } from '@/data/mock';
import { cn } from '@/utils/cn';

interface Props {
  matchId: string;
  onDashboard: () => void;
}

interface Message {
  id: string;
  text: string;
  fromMe: boolean;
  time: string;
  read: boolean;
}

const initialMessages: Message[] = [
  { id: '1', text: 'Hi! Thank you for matching with me. I\'d love to learn more about your care needs.', fromMe: false, time: '2:30 PM', read: true },
  { id: '2', text: 'Hello! Yes, we\'re looking for someone reliable. When are you available to start?', fromMe: true, time: '2:32 PM', read: true },
  { id: '3', text: 'I can start as early as next week! Would you like to schedule a quick call or video chat to discuss details?', fromMe: false, time: '2:35 PM', read: true },
];

const avatarColors = ['bg-coral-400', 'bg-brand-400', 'bg-sky-400'];

export default function MessagingStep({ matchId, onDashboard }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');

  const match = mockMatches.find(m => m.id === matchId);
  const caregiver = match?.caregiver;

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      fromMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setMessages([...messages, newMessage]);
    setInput('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold',
                avatarColors[0]
              )}>
                {caregiver?.name.split(' ').map(n => n[0]).join('') || 'CG'}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{caregiver?.name || 'Caregiver'}</h3>
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Online
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                <Phone className="w-5 h-5 text-gray-600" />
              </button>
              <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                <Video className="w-5 h-5 text-gray-600" />
              </button>
              <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                <MoreHorizontal className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Connection notice */}
      <div className="max-w-lg mx-auto w-full px-4 py-3">
        <div className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
          <p className="text-sm text-brand-800 text-center">
            🎉 <strong>Connection unlocked!</strong> You can now message {caregiver?.name}.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4 overflow-y-auto">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn('flex', msg.fromMe ? 'justify-end' : 'justify-start')}
          >
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-3',
              msg.fromMe
                ? 'bg-brand-500 text-white rounded-br-md'
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
            )}>
              <p className="text-sm">{msg.text}</p>
              <div className={cn(
                'flex items-center justify-end gap-1 mt-1',
                msg.fromMe ? 'text-brand-200' : 'text-gray-400'
              )}>
                <span className="text-xs">{msg.time}</span>
                {msg.fromMe && (msg.read ? <CheckCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-12 h-12 rounded-full bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={onDashboard}
            icon={<ArrowRight className="w-5 h-5" />}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
