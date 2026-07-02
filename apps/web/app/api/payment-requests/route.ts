import { NextResponse } from "next/server";
import {
  createPaymentRequest,
  createPaymentRequestSchema
} from "@/app/api/payment-requests/service";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createPaymentRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payment request input.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const result = await createPaymentRequest(prisma, parsed.data);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}

