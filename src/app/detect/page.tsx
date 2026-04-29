"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react"; // ✅ ย้ายมาไว้ด้านบน
import { wasteMapping } from "@/lib/waste-logic";

// ── Types ──────────────────────────────────────────────────────────────────
interface Detection {
  class: string;
  confidence: number;
  bbox: number[];
  bin: string;
  binTh: string;
  tip: string;
}

interface DetectResult {
  image: string;
  detections: Detection[];
  count: number;
}

const CLASS_NAME_TH: Record<string, string> = {
  plastic: "พลาสติก",
  paper: "กระดาษ",
  glass: "แก้ว",
  metal: "โลหะ",
  organic: "ขยะอินทรีย์",
  battery: "แบตเตอรี่",
  "e waste": "ขยะอิเล็กทรอนิกส์",
  styrofoam: "โฟม",
  clothes: "เสื้อผ้า",
  "light bulb": "หลอดไฟ",
};

const getBinColor = (binColor: string) => {
  switch (binColor) {
    case "เขียว": return "#10B981";
    case "เหลือง": return "#FACC15";
    case "แดง": return "#EF4444";
    case "น้ำเงิน": return "#3B82F6";
    default: return "#6B7280";
  }
};

// ── Component ──────────────────────────────────────────────────────────────
export default function DetectPage() {
  const { data: session } = useSession(); // ✅ เรียกใช้ Session ที่นี่
  const [mode, setMode] = useState<"upload" | "camera">("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── กล้อง ──────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraReady(true);
    } catch {
      setError("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const switchMode = (m: "upload" | "camera") => {
    setMode(m);
    setResult(null);
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    setIsSaved(false);
    if (m === "camera") startCamera();
    else stopCamera();
  };

  // ── อัปโหลดไฟล์ ───────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setIsSaved(false);
  };

  // ── ถ่ายภาพจากกล้อง → File ───────────────────────────────────────────
  const captureFrame = (): File | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPreviewUrl(dataUrl);
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return new File([u8], "capture.jpg", { type: mime });
  };

  // ── ส่งรูปไป Detect ──────────────────────────────────────────────────
  const handleDetect = async () => {
    let file: File | null = selectedFile;
    if (mode === "camera") {
      file = captureFrame();
      if (!file) return;
    }
    if (!file) {
      setError("กรุณาเลือกรูปภาพก่อน");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setIsSaved(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/detect", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Detection failed");
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  // ── บันทึกลง DB (รวม Logic และ Session) ──────────────────────────────
  const saveToDatabase = async () => {
    if (!result || result.detections.length === 0) return;
    setIsSaving(true);

    try {
      const top = result.detections[0];
      const nameTh = CLASS_NAME_TH[top.class.toLowerCase()] || top.class;
      const info = wasteMapping[nameTh as keyof typeof wasteMapping];

      const response = await fetch("/api/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: `data:image/jpeg;base64,${result.image}`,
          wasteType: nameTh,
          category: info?.category || top.binTh,
          confidence: top.confidence / 100,
          binColor: info?.binColor || top.binTh,
          userId: session?.user?.id, // ✅ ส่ง ID ของคนที่ Login ไปด้วย
        }),
      });

      if (response.ok) {
        setIsSaved(true);
      } else {
        throw new Error("บันทึกไม่สำเร็จ");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setIsSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const top = result?.detections[0];
  const topNameTh = top ? (CLASS_NAME_TH[top.class.toLowerCase()] || top.class) : null;
  const topInfo = topNameTh ? wasteMapping[topNameTh as keyof typeof wasteMapping] : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Waste Scanner</h1>
        <p className="text-gray-500 mb-6">อัปโหลดหรือถ่ายรูปขยะเพื่อให้ AI ตรวจจับและแนะนำการทิ้ง</p>

        <div className="flex bg-white rounded-xl border border-gray-200 p-1 w-fit mb-6 shadow-sm">
          {(["upload", "camera"] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === m ? "bg-emerald-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m === "upload" ? "📁 อัปโหลดรูป" : "📷 กล้องถ่ายภาพ"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Input */}
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center gap-4">
            <div className="relative w-full h-80 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden">
              {mode === "camera" ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  {cameraReady && !isLoading && <div className="scan-line" />}
                </>
              ) : result ? (
                <img src={`data:image/jpeg;base64,${result.image}`} className="max-w-full max-h-full object-contain" alt="Result" />
              ) : previewUrl ? (
                <img src={previewUrl} className="max-w-full max-h-full object-contain" alt="Preview" />
              ) : (
                <span className="text-gray-300 text-6xl">📸</span>
              )}
            </div>

            <div className="flex gap-3 w-full">
              {(previewUrl || result) && mode === "upload" && (
                <button onClick={reset} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-xl font-bold transition-all">
                  เลือกใหม่
                </button>
              )}
              {mode === "upload" && !previewUrl && (
                <label className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold cursor-pointer text-center transition-all">
                  อัปโหลดภาพ
                  <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
                </label>
              )}
              {(previewUrl || mode === "camera") && (
                <button
                  onClick={handleDetect}
                  disabled={isLoading}
                  className={`flex-1 py-3 rounded-xl font-bold text-white transition-all shadow-md ${isLoading ? "bg-gray-400" : "bg-emerald-500 hover:bg-emerald-600"}`}
                >
                  {isLoading ? "กำลังวิเคราะห์..." : mode === "camera" ? "📸 ถ่ายและวิเคราะห์" : "🔍 วิเคราะห์ขยะ"}
                </button>
              )}
            </div>
            {error && <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">⚠️ {error}</div>}
          </div>

          {/* Right: Result */}
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">ผลการตรวจจับขยะ</h2>
            {top && topNameTh ? (
              <div className="space-y-5">
                <div>
                  <p className="text-gray-500 text-sm font-semibold">ประเภทขยะ</p>
                  <p className="text-3xl font-extrabold text-gray-900">🗑️ {topNameTh}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-semibold">ความมั่นใจ (Confidence)</p>
                  <div className="w-full bg-gray-200 rounded-full h-4 mt-1">
                    <div className="h-4 rounded-full transition-all" style={{ width: `${top.confidence}%`, backgroundColor: top.confidence > 70 ? "#10B981" : "#FACC15" }} />
                  </div>
                  <p className="text-right text-sm font-bold text-gray-600 mt-1">{top.confidence}%</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-semibold">หมวดหมู่</p>
                  <p className="text-xl font-bold text-gray-800">📊 {topInfo?.category || top.binTh}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-semibold">คำแนะนำถังขยะ</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="w-8 h-8 rounded-full shadow-md" style={{ backgroundColor: getBinColor(topInfo?.binColor || top.binTh) }} />
                    <p className="text-xl font-bold text-gray-800">ถังสี{topInfo?.binColor || top.binTh}</p>
                  </div>
                </div>
                <button
                  onClick={saveToDatabase}
                  disabled={isSaving || isSaved}
                  className={`w-full py-3 rounded-xl font-bold text-white text-lg transition-all shadow-md ${isSaved ? "bg-gray-300" : "bg-emerald-600 hover:bg-emerald-700"}`}
                >
                  {isSaved ? "✅ บันทึกแล้ว" : isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูลเข้า Dashboard"}
                </button>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-10">{isLoading ? "กำลังวิเคราะห์รูปภาพ..." : "รอการอัปโหลดและวิเคราะห์ภาพ..."}</p>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .scan-line {
          position: absolute; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #10B981, transparent);
          animation: scan 2s linear infinite;
          box-shadow: 0 0 8px #10B981;
        }
        @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
      `}</style>
    </div>
  );
}