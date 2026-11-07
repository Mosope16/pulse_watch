import { NextResponse } from "next/server";
import { invokeHelloFunction } from "@/lib/neon-functions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await invokeHelloFunction();
    return NextResponse.json({
      success: true,
      service: "Neon Functions",
      endpoint: process.env.NEON_FUNCTION_HELLO_BASE_URL,
      response: res,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
