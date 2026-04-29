export { default } from "next-auth/middleware";

export const config = { 
  // ระบุหน้าที่ "ต้อง Login เท่านั้น" ถึงจะเข้าได้
  // ในที่นี้คือหน้า Dashboard และหน้า Detect
  matcher: ["/dashboard/:path*", "/detect/:path*"] 
};