import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Paths that are considered public (no authentication required)
  const publicPaths = ['/', '/login', '/register'];
  const isPublicPath = publicPaths.includes(path);

  // For client-side auth, we'll only protect the /chat route
  // The API routes will have their own protection mechanism
  if (!isPublicPath && path === '/chat') {
    // We don't check tokens in middleware since we're using client-side auth
    // The client component will handle authentication
  }

  // Continue with the request
  return NextResponse.next();
}

// Match all request paths except for API routes, static files, and specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 