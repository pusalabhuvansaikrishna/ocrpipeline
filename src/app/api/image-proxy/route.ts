import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      credentials: "include",   // important for auth cookie
      headers: {
        Accept: "image/*",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Backend returned ${res.status}` }, { status: res.status });
    }

    const blob = await res.blob();
    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("Content-Type") || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=3600");

    return new NextResponse(blob, { headers });
  } catch (err: any) {
    console.error("Image proxy error:", err);
    return NextResponse.json({ error: err.message || "Proxy error" }, { status: 500 });
  }
}