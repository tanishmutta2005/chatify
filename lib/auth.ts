import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        email:      { label: "Email or Username", type: "text" },
        password:   { label: "Password",          type: "password" },
      },
      async authorize(credentials) {
        const identifier = (credentials?.identifier || credentials?.email || "").trim();
        if (!identifier || !credentials?.password) {
          throw new Error("Please provide email/username and password");
        }

        await connectDB();

        // ── Use a GENERIC error for wrong identifier OR wrong password.
        // This prevents user enumeration attacks.
        const INVALID_MSG = "Invalid credentials";

        const cleanIdentifier = identifier.replace(/^@+/, "");
        const lowerIdentifier = cleanIdentifier.toLowerCase();

        // Find by email (case-insensitive) or username (case-insensitive)
        const user = await User.findOne({
          $or: [
            { email: lowerIdentifier },
            { username: { $regex: new RegExp(`^${cleanIdentifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
          ],
        });

        if (!user) throw new Error(INVALID_MSG);

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) throw new Error(INVALID_MSG);

        return {
          id:       user._id.toString(),
          name:     user.name,
          email:    user.email,
          username: user.username,
          avatar:   user.avatar,
        };
      },
    }),
  ],

  callbacks: {
    // Persist extra fields into the JWT token & support session.update()
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id       = user.id;
        token.username = (user as any).username;
        const rawAvatar = (user as any).avatar || "";
        // Never put massive base64 image strings into JWT cookie (causes HTTP 494)
        token.avatar   = (rawAvatar.startsWith("data:") || rawAvatar.length > 500)
          ? `/api/users/avatar/${user.id}`
          : rawAvatar;
      }
      if (trigger === "update" && session?.user) {
        if (session.user.avatar !== undefined) {
          const rawAvatar = session.user.avatar || "";
          token.avatar = (rawAvatar.startsWith("data:") || rawAvatar.length > 500)
            ? `/api/users/avatar/${token.id}?t=${Date.now()}`
            : rawAvatar;
        }
        if (session.user.name !== undefined) token.name = session.user.name;
      }
      return token;
    },
    // Make those fields available in the client session
    async session({ session, token }) {
      if (token) {
        session.user.id       = token.id as string;
        session.user.username = token.username as string;
        session.user.avatar   = token.avatar as string;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
