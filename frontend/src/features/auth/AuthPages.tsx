import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Globe, Clock, ArrowRight } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setUser = useAuthStore(state => state.setUser);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        alert("Login failed.");
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cyan-400">DualConnect</h1>
          <p className="text-gray-400 mt-2">Sign in to your enterprise vault.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400">Email Address</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition" placeholder="admin@enterprise.local" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition" placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg font-semibold transition shadow-lg shadow-cyan-500/20">
            Sign In <ArrowRight size={18} />
          </button>
          <div className="text-center mt-4">
            <p className="text-gray-400 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">Create one</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const setUser = useAuthStore(state => state.setUser);
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, timezone, preferred_language: 'en' })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        alert("Registration failed.");
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cyan-400">DualConnect</h1>
          <p className="text-gray-400 mt-2">Create your enterprise account.</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400">Email Address</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-cyan-500" placeholder="admin@enterprise.local" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-cyan-500" placeholder="••••••••" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400">Timezone</label>
            <div className="relative mt-1">
              <Clock className="absolute left-3 top-3 text-gray-500" size={18} />
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-cyan-500 appearance-none text-gray-300">
                <option value="UTC">UTC (Universal)</option>
                <option value="America/New_York">EST (New York)</option>
                <option value="Europe/London">GMT (London)</option>
                <option value="Asia/Tokyo">JST (Tokyo)</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg font-semibold transition shadow-lg shadow-cyan-500/20">
            Create Account <ArrowRight size={18} />
          </button>
          <div className="text-center mt-4">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">Sign in here</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
