import { useState, useRef, useEffect } from 'react';
import { Send, ArrowRight, Phone, Video, Check, CheckCheck, Smile, Paperclip, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { caregivers as caregiversApi } from '@/lib/api';
import { cn } from '@/utils/cn';
import logoImg from '@/assets/logo.png';

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
  { id: '1', text: 'Hi! Thank you for matching with me. I\'d love to learn more about your care needs 😊', fromMe: false, time: '2:30 PM', read: true },
  { id: '2', text: 'Hello! We\'re looking for someone reliable for our two kids. When are you available to start?', fromMe: true, time: '2:32 PM', read: true },
  { id: '3', text: 'I can start as early as next week! I\'d love to schedule a quick call to discuss the details. Does that work for you?', fromMe: false, time: '2:35 PM', read: true },
];

export default function MessagingStep({ matchId, onDashboard }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [caregiver, setCaregiver] = useState<any>(null);

  useEffect(() => {
    if (matchId) {
      caregiversApi.get(matchId).then(d => setCaregiver(d.caregiver || d)).catch(() => {});
    }
  }, [matchId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      fromMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setMessages(prev => [...prev, newMessage]);
    setInput('');

    // Simulate caregiver reply
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: 'That sounds great! I\'ll reach out to confirm the details shortly.',
        fromMe: false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true,
      }]);
    }, 2000);
  };

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Caregiver info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                {caregiver?.photoUrl ? (
                  <img src={caregiver.photoUrl} alt={caregiver.name} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-coral-400 flex items-center justify-center text-white font-bold">
                    {caregiver?.name.split(' ').map((n: string) => n[0]).join('') || 'CG'}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 text-sm truncate">{caregiver?.name || 'Caregiver'}</h3>
                <span className="text-xs text-green-600 font-medium">● Online</span>
              </div>
            </div>

            {/* Logo center */}
            <Link to="/" className="shrink-0">
              <img src={logoImg} alt="TruliCares" className="h-5 w-auto opacity-70" />
            </Link>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                <Phone className="w-4 h-4 text-gray-600" />
              </button>
              <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                <Video className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <Info className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="max-w-lg mx-auto w-full px-4 pt-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            {caregiver?.photoUrl ? (
              <img src={caregiver.photoUrl} alt={caregiver.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-coral-400 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {caregiver?.name?.split(' ').map((n: string) => n[0]).join('')}
              </div>
            )}
            <div>
              <p className="font-bold text-gray-900">{caregiver?.name}</p>
              <p className="text-sm text-gray-500">{caregiver?.location}</p>
              <p className="text-sm font-semibold text-brand-600">${caregiver?.hourlyRate[0]}–${caregiver?.hourlyRate[1]}/hr</p>
            </div>
          </div>
        </div>
      )}

      {/* Connection notice */}
      <div className="max-w-lg mx-auto w-full px-4 py-3">
        <div className="bg-brand-50 rounded-2xl p-3.5 border border-brand-100">
          <p className="text-sm text-brand-800 text-center">
            🎉 <strong>Connection unlocked!</strong> You can now message {caregiver?.name} directly.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-2 space-y-3 overflow-y-auto overscroll-contain">
        {messages.map((msg, i) => {
          const showAvatar = !msg.fromMe && (i === 0 || messages[i - 1].fromMe);
          return (
            <div key={msg.id} className={cn('flex items-end gap-2', msg.fromMe ? 'justify-end' : 'justify-start')}>
              {/* Caregiver avatar (only shown on first consecutive caregiver message) */}
              {!msg.fromMe && (
                <div className="shrink-0 w-8">
                  {showAvatar && (
                    caregiver?.photoUrl ? (
                      <img src={caregiver.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-coral-400 flex items-center justify-center text-white text-xs font-bold">
                        {caregiver?.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                    )
                  )}
                </div>
              )}

              <div className={cn(
                'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm',
                msg.fromMe
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
              )}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <div className={cn(
                  'flex items-center justify-end gap-1 mt-0.5',
                  msg.fromMe ? 'text-brand-200' : 'text-gray-400'
                )}>
                  <span className="text-[10px]">{msg.time}</span>
                  {msg.fromMe && (msg.read
                    ? <CheckCheck className="w-3.5 h-3.5" />
                    : <Check className="w-3.5 h-3.5" />)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 shadow-lg p-3">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-center gap-2 bg-gray-50 rounded-2xl border border-gray-200 px-3 py-1.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
            <button className="p-1.5 rounded-full hover:bg-gray-200 transition-colors shrink-0">
              <Paperclip className="w-4 h-4 text-gray-400" />
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Type a message…"
              className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 py-2"
            />
            <button className="p-1.5 rounded-full hover:bg-gray-200 transition-colors shrink-0">
              <Smile className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ml-1"
            >
              <Send className="w-4 h-4" />
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
