"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

// --- Types ---
interface WasteRecord {
  id: string;
  wasteType: string;
  category: string;
  confidence: number;
  binColor: string;
  createdAt: string;
}

// --- Constants (มาตรฐานสีตาม SRS) ---
const CATEGORY_COLORS: Record<string, string> = {
  'ขยะอินทรีย์': '#10B981', // เขียว
  'ขยะรีไซเคิล': '#FACC15', // เหลือง
  'ขยะอันตราย': '#EF4444',  // แดง
  'ขยะทั่วไป': '#3B82F6',   // น้ำเงิน
};

const WASTE_TYPE_COLORS: Record<string, string> = {
  'พลาสติก': '#3B82F6',
  'กระดาษ': '#6366F1',
  'แก้ว': '#A855F7',
  'โลหะ': '#F97316',
  'โฟม': '#94A3B8',
  'เศษอาหาร': '#10B981',
  'แบตเตอรี่': '#DC2626',
  'ขยะอิเล็กทรอนิกส์': '#1E293B',
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [records, setRecords] = useState<WasteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. ตรวจสอบ Session และดึงข้อมูล
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }

    if (status === "authenticated") {
      fetch("/api/waste")
        .then((res) => {
          if (!res.ok) throw new Error("Unauthorized");
          return res.json();
        })
        .then((data) => {
          setRecords(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status, router]);

  // 2. ประมวลผลข้อมูลสำหรับกราฟ
  const categoryStats = records.reduce((acc: Record<string, number>, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {});

  const wasteTypeStats = records.reduce((acc: Record<string, number>, curr) => {
    acc[curr.wasteType] = (acc[curr.wasteType] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(categoryStats).map(key => ({
    name: key,
    value: categoryStats[key]
  }));

  const barData = Object.keys(wasteTypeStats).map(key => ({
    name: key,
    value: wasteTypeStats[key],
    color: WASTE_TYPE_COLORS[key] || '#64748B'
  }));

  // 3. สรุปตัวเลข Header
  const todayCount = records.filter(r => 
    new Date(r.createdAt).toDateString() === new Date().toDateString()
  ).length;

  const topCategory = Object.keys(categoryStats).length > 0 
    ? Object.keys(categoryStats).reduce((a, b) => categoryStats[a] > categoryStats[b] ? a : b)
    : "N/A";

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Welcome Header */}
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-3xl font-black text-gray-800">Dashboard</h1>
            <p className="text-gray-500 font-medium">ยินดีต้อนรับคุณ, {session?.user?.name || "User"}</p>
          </div>
        </div>

        {/* --- Summary Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center">
            <span className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1">Items Today</span>
            <p className="text-6xl font-black text-gray-800">{todayCount}</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center">
            <span className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Total Scans</span>
            <p className="text-6xl font-black text-gray-800">{records.length}</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center">
            <span className="text-xs font-black text-purple-500 uppercase tracking-widest mb-1">Top Category</span>
            <p className="text-2xl font-black text-gray-800 mt-4">{topCategory}</p>
          </div>
        </div>

        {/* --- Charts Section --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bar Chart */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-800 mb-8">สถิติแยกตามประเภทวัตถุ</h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '12px', fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                  <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-800 mb-8">สัดส่วนหมวดหมู่ขยะ</h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={70} outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#CBD5E1'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* --- Recent Logs Table --- */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <h2 className="text-xl font-black text-gray-800 mb-6">ประวัติการสแกนล่าสุด</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="py-4 px-4 text-xs font-black text-gray-400 uppercase tracking-widest">ประเภทขยะ</th>
                  <th className="py-4 px-4 text-xs font-black text-gray-400 uppercase tracking-widest">หมวดหมู่</th>
                  <th className="py-4 px-4 text-xs font-black text-gray-400 uppercase tracking-widest">ความมั่นใจ</th>
                  <th className="py-4 px-4 text-xs font-black text-gray-400 uppercase tracking-widest">วันที่บันทึก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.slice(0, 10).map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 font-bold text-gray-700">{record.wasteType}</td>
                    <td className="py-4 px-4">
                      <span 
                        className="px-3 py-1 rounded-full text-[10px] font-black uppercase"
                        style={{ backgroundColor: `${CATEGORY_COLORS[record.category]}20`, color: CATEGORY_COLORS[record.category] }}
                      >
                        {record.category}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-emerald-500">{(record.confidence * 100).toFixed(1)}%</td>
                    <td className="py-4 px-4 text-sm text-gray-400">{new Date(record.createdAt).toLocaleString('th-TH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}