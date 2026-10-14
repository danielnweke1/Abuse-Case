import { NextResponse } from "next/server";
import { buildUnifiedRiskRegister } from "@/lib/risk/engine";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id;
    const register = await buildUnifiedRiskRegister(analysisId);
    return NextResponse.json({
      status: "success",
      count: register.length,
      register,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to calculate unified risk register";
    console.error("[API] Risk Register error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
