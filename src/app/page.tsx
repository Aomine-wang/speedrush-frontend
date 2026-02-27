'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://speedrush-production.up.railway.app';

interface Trade {
  id: string;
  direction: 'LONG' | 'SHORT';
  amount: number;
  entryPrice: number;
  status: 'active' | 'closed';
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const [balance, setBalance] = useState(10000);
  const [price, setPrice] = useState(0);
  const [amount, setAmount] = useState(100);
  const [leverage, setLeverage] = useState(100);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch price
  useEffect(() => {
    const ws = new WebSocket(`wss://speedrush-production.up.railway.app`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'price') setPrice(data.price);
    };
    return () => ws.close();
  }, []);

  // Login
  const login = async () => {
    if (!address) return;
    setLoading(true);
    try {
      // Get nonce
      const nonceRes = await fetch(`${API_URL}/api/auth/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      const { nonce } = await nonceRes.json();

      // Sign message
      const message = `SpeedRush Login\nNonce: ${nonce}`;
      const signature = await signMessageAsync({ message });

      // Verify
      const verifyRes = await fetch(`${API_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, signature })
      });
      const { token: jwt } = await verifyRes.json();
      setToken(jwt);
      
      // Get profile
      const profileRes = await fetch(`${API_URL}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      const profile = await profileRes.json();
      setBalance(profile.balance);
    } catch (e) {
      console.error('Login failed:', e);
    }
    setLoading(false);
  };

  // Place trade
  const trade = async (direction: 'LONG' | 'SHORT') => {
    if (!token) { alert('Please login first'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/trade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ direction, amount, leverage })
      });
      const data = await res.json();
      if (data.success) {
        setTrades([...trades, data.trade]);
        setBalance(data.newBalance);
      }
    } catch (e) {
      console.error('Trade failed:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isConnected && address) login();
  }, [isConnected, address]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 py-4 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              ⚡ SpeedRush
            </h1>
            <p className="text-sm text-gray-400">10,000x Perpetual Trading</p>
          </div>
          <ConnectButton />
        </div>

        {!isConnected ? (
          <div className="text-center py-20">
            <h2 className="text-2xl mb-4">Connect Wallet to Start Trading</h2>
            <p className="text-gray-400">Get 10,000 USDT demo balance automatically</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trading Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Price Display */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-400 text-sm">BTC/USD</p>
                    <p className="text-4xl font-bold">${price.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Demo Balance</p>
                    <p className="text-2xl font-bold text-green-400">${balance.toLocaleString()} USDT</p>
                  </div>
                </div>
              </div>

              {/* Trade Controls */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-sm text-gray-400">Amount (USDT)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full bg-black/30 border border-white/20 rounded-lg p-3 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Leverage (x)</label>
                    <select
                      value={leverage}
                      onChange={(e) => setLeverage(Number(e.target.value))}
                      className="w-full bg-black/30 border border-white/20 rounded-lg p-3 mt-1"
                    >
                      <option value={100}>100x</option>
                      <option value={500}>500x</option>
                      <option value={1000}>1000x</option>
                      <option value={5000}>5000x</option>
                      <option value={10000}>10000x</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => trade('LONG')}
                    disabled={loading}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 py-4 rounded-xl font-bold text-lg transition"
                  >
                    🚀 LONG
                  </button>
                  <button
                    onClick={() => trade('SHORT')}
                    disabled={loading}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 py-4 rounded-xl font-bold text-lg transition"
                  >
                    🔻 SHORT
                  </button>
                </div>

                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-400">
                    ⚠️ Position auto-closes in 30 seconds with P&L settlement
                  </p>
                </div>
              </div>

              {/* Active Trades */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold mb-4">Active Positions</h3>
                {trades.length === 0 ? (
                  <p className="text-gray-500">No active positions</p>
                ) : (
                  <div className="space-y-2">
                    {trades.map((t) => (
                      <div key={t.id} className="flex justify-between p-3 bg-black/30 rounded-lg">
                        <span className={t.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}>
                          {t.direction}
                        </span>
                        <span>{t.amount} USDT @ {t.leverage}x</span>
                        <span className="text-gray-400">Entry: ${t.entryPrice}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Stats */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-bold mb-4">📊 Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Positions</span>
                    <span>{trades.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Leverage</span>
                    <span className="text-purple-400">10,000x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Settlement</span>
                    <span className="text-cyan-400">30s</span>
                  </div>
                </div>
              </div>

              {/* How it works */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-bold mb-4">🎮 How It Works</h3>
                <ol className="space-y-2 text-sm text-gray-300">
                  <li>1. Connect wallet</li>
                  <li>2. Get 10,000 USDT demo</li>
                  <li>3. Open LONG or SHORT</li>
                  <li>4. Auto-settled in 30s</li>
                  <li>5. Climb leaderboard!</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
