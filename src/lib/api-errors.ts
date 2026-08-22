import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/types";

export function apiError(
  code: string,
  message: string,
  status: number,
): NextResponse<ApiError> {
  return NextResponse.json({ error: { code, message } }, { status });
}
