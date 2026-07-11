import { NextResponse } from 'next/server';
import redirects from '../redirects.json';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const match = redirects.find((r) => r.from === pathname);
  if (match?.to) {
    const url = request.nextUrl.clone();
    url.pathname = match.to;
    return NextResponse.redirect(url, match.status || 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/article/:path*'],
};
