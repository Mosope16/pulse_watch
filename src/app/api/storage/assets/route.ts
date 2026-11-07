import { NextRequest, NextResponse } from "next/server";
import { uploadAsset, getAsset, listAssets, deleteAsset } from "@/lib/neon-storage";
import { requireAuthUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get("key");

    if (key) {
      const content = await getAsset(key);
      if (!content) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }
      return NextResponse.json({ key, content });
    }

    const assets = await listAssets();
    return NextResponse.json({
      bucket: process.env.NEON_STORAGE_BUCKET || "assets",
      assets: assets.map((a) => ({
        key: a.Key,
        size: a.Size,
        lastModified: a.LastModified,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuthUser();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customKey = formData.get("key") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = customKey || `uploads/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

    await uploadAsset(key, buffer, file.type || "application/octet-stream");

    return NextResponse.json({
      success: true,
      key,
      size: buffer.length,
      contentType: file.type,
      url: `${process.env.AWS_ENDPOINT_URL_S3}/${process.env.NEON_STORAGE_BUCKET || "assets"}/${key}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuthUser();
    const key = req.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Key query parameter is required" }, { status: 400 });
    }

    await deleteAsset(key);
    return NextResponse.json({ success: true, deletedKey: key });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
