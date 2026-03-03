import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const DEFAULT_SECRET_PATH = 'beatpoppa-secured';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // 1. Fetch dynamic settings and profile data
  let secretPath = DEFAULT_SECRET_PATH;
  let maintenanceMode = false;
  let isBanned = false;
  let isAdmin = false;

  try {
    const { data: allSettings } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['admin_config', 'maintenance_settings']);
    
    const adminConfig = allSettings?.find(s => s.key === 'admin_config')?.value;
    const maintenanceConfig = allSettings?.find(s => s.key === 'maintenance_settings')?.value;

    if (adminConfig?.path) {
      secretPath = adminConfig.path;
    }
    if (maintenanceConfig?.maintenance_mode) {
      maintenanceMode = true;
    }

    // Check profile for ban status and role
    if (session) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_banned')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error('Middleware: Error fetching profile:', profileError);
      }
      
      isAdmin = profile?.role === 'admin';
      isBanned = !!profile?.is_banned;
      
      console.log('Middleware Auth Check:', { 
        userId: session.user.id, 
        role: profile?.role, 
        isAdmin, 
        isBanned 
      });
    } else {
      console.log('Middleware: No session found');
    }
  } catch (e) {
    console.error('Middleware: Unexpected error fetching settings/profile:', e);
  }

  // 2. Handle Banned Users
  if (isBanned && !pathname.startsWith('/banned') && !pathname.startsWith('/auth')) {
    console.log('Redirecting to /banned (User is banned)');
    return NextResponse.redirect(new URL('/banned', req.url));
  }

  // 3. Handle Maintenance Mode
  if (maintenanceMode) {
    const isMaintenancePage = pathname.startsWith('/maintenance');
    const isSecretPath = pathname.startsWith(`/${secretPath}`);
    const isAdminPath = pathname.startsWith('/admin');
    const isBannedPage = pathname.startsWith('/banned');
    const isAuthPage = pathname.startsWith('/auth');
    const isInternalPath = pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.');

    // LOGGING FOR DEBUGGING
    console.log('Maintenance Check:', {
      pathname,
      maintenanceMode,
      isAdmin,
      isMaintenancePage,
      isSecretPath,
      isAdminPath,
      shouldRedirect: !isMaintenancePage && !isSecretPath && !isAdminPath && !isBannedPage && !isAuthPage && !isInternalPath && !isAdmin
    });

    if (!isMaintenancePage && !isSecretPath && !isAdminPath && !isBannedPage && !isAuthPage && !isInternalPath) {
      if (!isAdmin) {
        console.log('Redirecting to /maintenance - Not an admin');
        return NextResponse.redirect(new URL('/maintenance', req.url));
      } else {
        console.log('Bypassing maintenance - User is admin');
      }
    }
  }

  // 4. Hide the internal /admin routes completely from everyone
  if (pathname.startsWith('/admin')) {
    if (!req.headers.get('x-internal-admin')) {
      const errorRewrite = NextResponse.rewrite(new URL('/404', req.url));
      response.cookies.getAll().forEach(c => errorRewrite.cookies.set(c.name, c.value));
      return errorRewrite;
    }
  }

  // 3. Handle the secret admin path
  if (pathname.startsWith(`/${secretPath}`)) {
    const adminSubPath = pathname.replace(`/${secretPath}`, '') || '/';
    
    // If not authenticated, handle login path
    if (!session) {
      if (adminSubPath === '/login') {
        // Rewrite to a dedicated login page
        const loginUrl = new URL('/admin-login', req.url);
        const loginRewrite = NextResponse.rewrite(loginUrl);
        // Ensure cookies are passed
        response.cookies.getAll().forEach(c => loginRewrite.cookies.set(c.name, c.value));
        return loginRewrite;
      }
      const loginRedirect = NextResponse.redirect(new URL(`/${secretPath}/login`, req.url));
      // Ensure cookies are passed
      response.cookies.getAll().forEach(c => loginRedirect.cookies.set(c.name, c.value));
      return loginRedirect;
    }

    // Use the profile data already fetched in Section 1
    // If logged in as admin and visiting login page, redirect to dashboard
    if (isAdmin && adminSubPath === '/login') {
      const dashRedirect = NextResponse.redirect(new URL(`/${secretPath}`, req.url));
      response.cookies.getAll().forEach(c => dashRedirect.cookies.set(c.name, c.value));
      return dashRedirect;
    }

    if (!isAdmin) {
      // If not admin, show 404 to hide the portal's existence
      const errorRewrite = NextResponse.rewrite(new URL('/404', req.url));
      response.cookies.getAll().forEach(c => errorRewrite.cookies.set(c.name, c.value));
      return errorRewrite;
    }

    // Rewrite to the internal /admin route
    const internalUrl = new URL(`/admin${adminSubPath}`, req.url);
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-internal-admin', 'true');
    
    // Create the rewrite response
    const rewriteResponse = NextResponse.rewrite(internalUrl, {
      request: {
        headers: requestHeaders,
      },
    });

    // Copy all cookies from the modified response object to the rewrite response
    response.cookies.getAll().forEach((cookie) => {
      rewriteResponse.cookies.set(cookie.name, cookie.value);
    });
    
    return rewriteResponse;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
