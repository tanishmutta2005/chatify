import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

// PATCH /api/users/profile — update current user's profile image or details
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { avatar, name } = await req.json();

    if (!avatar && !name) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await connectDB();

    const updateData: any = {};
    if (avatar) updateData.avatar = avatar;
    if (name?.trim()) updateData.name = name.trim();

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      updateData,
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("[PROFILE UPDATE ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
