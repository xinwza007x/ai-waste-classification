"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('user@psu.ac.th');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await signIn("credentials", {
        email: email,
        password: password,
        redirect: false, // ปิด auto redirect เพื่อจัดการ error เองก่อน
      });

      if (res?.error) {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      } else {
        // Login สำเร็จ! ส่งไปหน้า Dashboard
        router.push('/dashboard');
        router.refresh(); // เพื่อให้ Navbar อัปเดตสถานะ session
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 font-sans" style={{ fontFamily: "Inter, Noto Sans Thai, sans-serif" }}>
      <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-emerald-50 p-4 rounded-2xl text-3xl">♻️</div>
        </div>
        
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">ระบบตรวจจับขยะด้วย AI</h1>
        <p className="text-gray-400 text-[10px] mt-1 mb-8 uppercase tracking-widest font-bold">AI-Based Waste Classification System</p>
        
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs font-bold border border-red-100 animate-shake">
              ❌ {error}
            </div>
          )}

          <div>
            <label className="text-xs font-black text-gray-500 ml-1">อีเมล</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@psu.ac.th"
              className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
              required
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-500 ml-1">รหัสผ่าน</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700 transition-all" 
              required
            />
            {password.length > 0 && password.length < 8 && (
              <p className="text-[10px] text-red-500 mt-2 ml-1 font-bold">⚠️ รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full ${isLoading ? 'bg-emerald-300' : 'bg-emerald-500 hover:bg-emerald-600'} text-white font-black py-4 rounded-xl mt-6 shadow-lg shadow-emerald-100 transition-all text-lg`}
          >
            {isLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
        
        <p className="mt-8 text-xs text-gray-400 font-bold">
          ยังไม่มีบัญชี? <span className="text-emerald-600 cursor-pointer hover:underline" onClick={() => router.push('/register')}>สมัครสมาชิก</span>
        </p>
      </div>
    </div>
  );
}