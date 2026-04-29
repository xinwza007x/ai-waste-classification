import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// --- 1. ฟังก์ชัน GET: ดึงข้อมูลขยะ (เฉพาะของคนที่ Login) ---
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // ถ้าไม่ได้ Login ไม่ให้ดึงข้อมูล
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const records = await prisma.wasteLog.findMany({
      where: {
        userId: session.user.id, // 🔍 กรองเฉพาะของตัวเอง
      },
      orderBy: { 
        createdAt: 'desc' 
      },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "ดึงข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// --- 2. ฟังก์ชัน POST: บันทึกข้อมูลขยะ (ผูก ID คนสแกน) ---
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { imageUrl, wasteType, category, confidence, binColor } = body;

    // ตรวจสอบความครบถ้วนของข้อมูล
    if (!imageUrl || !wasteType || !category) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    // บันทึกลง Database (ใช้ model wasteLog เพราะมี userId)
    const newLog = await prisma.wasteLog.create({
      data: {
        imageUrl,
        wasteType,
        category,
        // มั่นใจว่าเป็นตัวเลข (Float)
        confidence: typeof confidence === "string" ? parseFloat(confidence) : confidence,
        binColor,
        // ✅ บันทึก ID ของคนที่ Login อยู่ (ถ้ามี)
        userId: session?.user?.id || null, 
      },
    });

    return NextResponse.json(newLog, { status: 201 });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }, { status: 500 });
  }
}