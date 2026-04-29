import NextAuth, { NextAuthOptions } from "next-auth"; // เพิ่ม NextAuthOptions เพื่อความเป๊ะของ Type
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// ✅ 1. แยกก้อนการตั้งค่าออกมาเป็นตัวแปรชื่อ authOptions และต้องมีคำว่า export
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) return null;

        const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
        
        if (isPasswordCorrect) {
          return { id: user.id, email: user.email, name: user.name };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { 
    strategy: "jwt" 
  },
  secret: process.env.NEXTAUTH_SECRET, 
};

// ✅ 2. ส่ง authOptions เข้าไปใน NextAuth
const handler = NextAuth(authOptions);

// ✅ 3. export GET และ POST ตามมาตรฐาน Next.js API Route
export { handler as GET, handler as POST };