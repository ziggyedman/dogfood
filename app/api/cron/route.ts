import { NextResponse, type NextRequest } from "next/server";
import { tick } from "@/lib/scheduler";

/** External cron entrypoint (e.g. when deployed beyond local dev).
 *  Inside `next dev` the scheduler also self-runs every 60s. */
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await tick();
  return NextResponse.json(result);
}
