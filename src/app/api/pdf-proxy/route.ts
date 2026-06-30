import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Upstream fetch failed with status ${upstream.status}` },
        { status: upstream.status || 502 }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") ?? "application/pdf");
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    headers.set("Cache-Control", "no-store");

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch PDF" },
      { status: 502 }
    );
  }
}