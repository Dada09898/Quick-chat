import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';
import { Mail, Lock, Clock, ArrowRight, MessageSquare, ShieldCheck, QrCode } from 'lucide-react';
import { apiJson } from '../../lib/api';
import toast from 'react-hot-toast';
import { QrLoginModal } from './QrLoginModal';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const setUser = useAuthStore(state => state.setUser);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiJson('/api/auth/login/', {
        method: 'POST',
        body: { email, password }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || err.detail || 'Login failed. Please check your credentials.');
      }
    } catch (e) { console.error(e); toast.error('Network error. Please check your connection.'); }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b141a] text-[#e9edef] p-4 sm:p-6">
      {/* Outer WhatsApp Desktop Phone Frame Container */}
      <div className="w-full max-w-[680px] bg-[#111b21] rounded-[24px] border border-[#222d34] shadow-2xl p-6 sm:p-12 min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300">
        
        {!showForm ? (
          /* WhatsApp Desktop Welcome View */
          <div className="flex flex-col items-center text-center max-w-[480px] py-4 animate-in fade-in zoom-in-95 duration-300">
            {/* QuickChat Green Logo Icon */}
            <div className="w-20 h-20 bg-[#00a884]/15 border-2 border-[#00a884]/40 rounded-full flex items-center justify-center mb-6 shadow-xl text-[#00a884]">
              <MessageSquare size={40} className="fill-[#00a884]/20" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-[#e9edef] mb-3 tracking-tight">
              Welcome to Kryozen Quick Chat
            </h1>

            <p className="text-[#8696a0] text-sm sm:text-base leading-relaxed mb-8 font-normal">
              Simple, reliable and private. Message privately, make calls and share files with your friends, family and colleagues.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <button
                onClick={() => setShowForm(true)}
                className="w-full sm:w-56 py-3 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold text-sm rounded-full transition-all duration-200 shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                Log in <ArrowRight size={18} />
              </button>
              <button
                onClick={() => setShowQrModal(true)}
                className="w-full sm:w-56 py-3 bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] border border-[#2a3942] font-medium text-sm rounded-full transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
              >
                <QrCode size={18} className="text-[#00a884]" /> Link with QR Code
              </button>
            </div>

            <div className="mt-8 flex items-center gap-2 text-xs text-[#8696a0]">
              <ShieldCheck size={16} className="text-[#00a884]" />
              <span>End-to-End Encrypted & Private</span>
            </div>
          </div>
        ) : (
          /* Log in Form View */
          <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-[#00a884]/15 border border-[#00a884]/40 rounded-full flex items-center justify-center mx-auto mb-3 text-[#00a884]">
                <MessageSquare size={28} />
              </div>
              <h2 className="text-2xl font-bold text-[#e9edef]">Sign in to QuickChat</h2>
              <p className="text-[#8696a0] text-xs mt-1">Enter your account credentials to continue.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8696a0] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-[#8696a0]" size={16} />
                  <input 
                    type="email" 
                    inputMode="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#e9edef] focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none transition" 
                    placeholder="name@company.com" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8696a0] mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 text-[#8696a0]" size={16} />
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#e9edef] focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none transition" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold text-sm rounded-full transition shadow-md active:scale-95 flex items-center justify-center gap-2 mt-2"
              >
                Sign In <ArrowRight size={16} />
              </button>

              <div className="text-center pt-3 border-t border-[#222d34] mt-4 space-y-2">
                <p className="text-[#8696a0] text-xs">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-[#00a884] hover:underline font-medium">Create one</Link>
                </p>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs text-[#8696a0] hover:text-[#e9edef] block mx-auto pt-1"
                >
                  ← Back to Welcome Screen
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <QrLoginModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
      />
    </div>
  );
};

export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const setUser = useAuthStore(state => state.setUser);
  
  React.useEffect(() => {
    if (username.length < 3) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await apiJson(`/api/auth/username/available/?u=${encodeURIComponent(username)}`);
        const data = await res.json();
        setUsernameStatus(data.available ? 'available' : (data.reason === 'invalid_format' ? 'invalid' : 'taken'));
      } catch (err) {
        console.error(err);
        setUsernameStatus('invalid');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [username]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus !== 'available') {
      toast.error('Please choose an available username.');
      return;
    }
    try {
      const res = await apiJson('/api/auth/register/', {
        method: 'POST',
        body: { email, username, password, timezone, preferred_language: 'en' }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || err.username?.[0] || err.detail || 'Registration failed.');
      }
    } catch (e) { console.error(e); toast.error('Network error. Please check your connection.'); }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b141a] text-[#e9edef] p-4 sm:p-6">
      <div className="w-full max-w-[680px] bg-[#111b21] rounded-[24px] border border-[#222d34] shadow-2xl p-6 sm:p-12 min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#00a884]/15 border border-[#00a884]/40 rounded-full flex items-center justify-center mx-auto mb-3 text-[#00a884]">
              <MessageSquare size={28} />
            </div>
            <h1 className="text-2xl font-bold text-[#e9edef]">Create QuickChat Account</h1>
            <p className="text-[#8696a0] text-xs mt-1">Get started with private E2EE messaging.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8696a0] mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-[#8696a0]" size={16} />
                <input 
                  type="email" 
                  inputMode="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#e9edef] focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none transition" 
                  placeholder="name@company.com" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8696a0] mb-1">Username (@handle)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-[#8696a0] font-bold text-sm">@</span>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} 
                  required 
                  maxLength={20}
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl py-2.5 pl-8 pr-10 text-sm text-[#e9edef] focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none transition" 
                  placeholder="ankit_kumar" 
                />
                <div className="absolute right-3 top-3">
                  {usernameStatus === 'checking' && <span className="text-xs text-amber-400 font-mono animate-pulse">...</span>}
                  {usernameStatus === 'available' && <span className="text-xs text-[#00a884] font-bold">✓ Available</span>}
                  {usernameStatus === 'taken' && <span className="text-xs text-red-400 font-bold">✗ Taken</span>}
                  {usernameStatus === 'invalid' && <span className="text-xs text-red-400">Invalid</span>}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8696a0] mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-[#8696a0]" size={16} />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#e9edef] focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none transition" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8696a0] mb-1">Timezone</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-3 text-[#8696a0]" size={16} />
                <select 
                  value={timezone} 
                  onChange={e => setTimezone(e.target.value)} 
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#e9edef] focus:ring-2 focus:ring-[#00a884] outline-none appearance-none cursor-pointer"
                >
                  <option value="UTC">UTC (Universal)</option>
                  <option value="America/New_York">EST (New York)</option>
                  <option value="Europe/London">GMT (London)</option>
                  <option value="Asia/Kolkata">IST (India)</option>
                  <option value="Asia/Tokyo">JST (Tokyo)</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={usernameStatus !== 'available'}
              className="w-full py-3 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-[#111b21] font-semibold text-sm rounded-full transition shadow-md active:scale-95 flex items-center justify-center gap-2 mt-2"
            >
              Create Account <ArrowRight size={16} />
            </button>

            <div className="text-center pt-3 border-t border-[#222d34] mt-4">
              <p className="text-[#8696a0] text-xs">
                Already have an account?{' '}
                <Link to="/login" className="text-[#00a884] hover:underline font-medium">Sign in here</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
