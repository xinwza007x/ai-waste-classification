import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { NextAuthProvider } from "@/components/NextAuthProvider"

const inter = Inter({ subsets: ['latin'] })

// ✅ Metadata สำหรับ SEO และชื่อหัวเว็บ
export const metadata: Metadata = {
  title: 'ระบบตรวจจับประเภทขยะสำหรับรีไซเคิลด้วย AI',
  description: 'ระบบประมวลผลด้วย Deep Learning เพื่อการคัดแยกขยะที่ถูกต้องและยั่งยืน',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={`${inter.className} bg-gray-50 min-h-screen flex flex-col`}>
        {/* ✅ NextAuthProvider ต้องหุ้ม Component ทั้งหมดเพื่อให้ทุกหน้าใช้ระบบ Login ได้ */}
        <NextAuthProvider>
          <Navbar />
          
          {/* ✅ ส่วนเนื้อหาหลัก: flex-1 จะช่วยดัน Footer ลงไปข้างล่างเสมอ */}
          <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
            {children}
          </main>
          
          <Footer />
        </NextAuthProvider>
      </body>
    </html>
  )
}