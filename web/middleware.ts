import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/badge/")) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders())) {
    response.headers.set(key, value);
  }
  return response;
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

export const config = {
  matcher: "/badge/:path*",
};
