import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const { name, username, email, password } = await req.json();

    // ── Validation ────────────────────────────────────────────
    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    // ── Check uniqueness ──────────────────────────────────────
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    // ── Hash password & create user ───────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      username: username.toLowerCase(),
      email:    email.toLowerCase(),
      password: hashedPassword,
      avatar:   `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id:       user._id.toString(),
          name:     user.name,
          username: user.username,
          email:    user.email,
          avatar:   user.avatar,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[SIGNUP ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
