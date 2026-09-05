import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    if (!userId) {
      return new NextResponse("Missing userId", { status: 400 });
    }

    await connectDB();

    const isObjId = mongoose.isValidObjectId(userId);
    const user = isObjId
      ? await User.findById(userId).select("avatar username")
      : await User.findOne({ username: userId }).select("avatar username");

    if (!user || !user.avatar) {
      const defaultUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || userId || "user"}`;
      return NextResponse.redirect(defaultUrl);
    }

    // If avatar is stored as a Data URL (base64)
    if (user.avatar.startsWith("data:")) {
      const match = user.avatar.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const contentType = match[1];
        const buffer = Buffer.from(match[2], "base64");
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Length": buffer.length.toString(),
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
          },
        });
      }
    }

    // If it's an external URL (http / https)
    if (user.avatar.startsWith("http://") || user.avatar.startsWith("https://")) {
      return NextResponse.redirect(user.avatar);
    }

    // If it's a relative path (/uploads/...)
    if (user.avatar.startsWith("/")) {
      return NextResponse.redirect(new URL(user.avatar, req.url));
    }

    // Fallback default
    return NextResponse.redirect(
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || userId}`
    );
  } catch (error) {
    console.error("[AVATAR GET ERROR]", error);
    return new NextResponse("Failed to load avatar", { status: 500 });
  }
}
