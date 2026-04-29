"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ");
        router.push('/login');
      } else {
        const data = await res.json();
        setError(data.error || "เกิดข้อผิดพลาดในการสมัคร");
      }
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อกับระบบได้");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-emerald-50 p-4 rounded-2xl text-3xl">📝</div>
        </div>
        
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">สมัครสมาชิกใหม่</h1>
        <p className="text-gray-400 text-[10px] mt-1 mb-8 uppercase tracking-widest font-bold">Create your AI Waste Account</p>
        
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs font-bold border border-red-100">{error}</div>}

          <div>
            <label className="text-xs font-black text-gray-500 ml-1">ชื่อ-นามสกุล</label>
            <input 
              type="text" 
              className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none"
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-500 ml-1">อีเมล</label>
            <input 
              type="email" 
              className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none"
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-500 ml-1">รหัสผ่าน</label>
            <input 
              type="password" 
              className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl mt-6 shadow-lg transition-all text-lg"
          >
            {isLoading ? "กำลังประมวลผล..." : "ยืนยันการสมัคร"}
          </button>
        </form>
        
        <p className="mt-8 text-xs text-gray-400 font-bold">
          มีบัญชีอยู่แล้ว? <span className="text-emerald-600 cursor-pointer" onClick={() => router.push('/login')}>เข้าสู่ระบบ</span>
        </p>
      </div>
    </div>
  );
}