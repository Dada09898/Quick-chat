import React, { useState } from 'react';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';

export const ForgotPasswordPage = ({ onBack }: { onBack: () => void }) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/password/reset/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) setSent(true);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl relative">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-500 hover:text-white transition">
          <ArrowLeft size={20}/>
        </button>
        <div className="text-center mb-8 mt-4">
          <h1 className="text-2xl font-bold text-white">Password Recovery</h1>
          <p className="text-gray-400 mt-2">Enter your email to receive a reset link.</p>
        </div>
        
        {sent ? (
          <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
            Reset instructions have been sent to your email.
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-cyan-500" placeholder="admin@enterprise.local" />
              </div>
            </div>
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg font-semibold transition">
              Send Reset Link <ArrowRight size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
