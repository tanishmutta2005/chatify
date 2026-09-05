import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // For serverless environments (Vercel) where local public/uploads is read-only / ephemeral,
    // we generate a high-efficiency data URL for media and documents under 4MB,
    // while also writing to disk if available.
    let fileUrl = "";
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });

      const ext = path.extname(file.name) || "";
      const cleanBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
      const uniqueFilename = `${Date.now()}_${cleanBase}${ext}`;
      const filePath = path.join(uploadsDir, uniqueFilename);

      await fs.writeFile(filePath, buffer);
      fileUrl = `/uploads/${uniqueFilename}`;
    } catch (fsErr) {
      console.warn("[UPLOAD] Read-only filesystem detected, falling back to data URL:", fsErr);
    }

    // Fallback if writing to local filesystem is blocked (e.g. Vercel serverless)
    if (!fileUrl) {
      const mimeType = file.type || "application/octet-stream";
      fileUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
    }

    return NextResponse.json({
      fileUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("[UPLOAD ERROR]", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
