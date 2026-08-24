/**
 * Next.js API Route: /api/dashboards/[...path]
 *
 * Acts as a secure proxy between the browser and the FastAPI backend for dashboards.
 * Reads the Supabase session cookie server-side and forwards the JWT
 * as a Bearer token — the browser never needs to handle tokens manually.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyToBackend(request, resolvedParams.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyToBackend(request, resolvedParams.path, 'POST');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyToBackend(request, resolvedParams.path, 'DELETE');
}

async function proxyToBackend(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  const joinedPath = pathSegments.join('/');
  const isQueryRoute =
    method === 'POST' && (joinedPath === 'query' || joinedPath === 'execute-query');

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!isQueryRoute && (!user || error)) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!isQueryRoute && !session) {
    return NextResponse.json({ detail: 'No session found' }, { status: 401 });
  }

  const backendPath = joinedPath === 'execute-query' ? 'query' : joinedPath;
  const targetUrl = `${BACKEND_URL}/api/v1/dashboards/${backendPath}`;

  const searchParams = request.nextUrl.searchParams.toString();
  const fullUrl = searchParams ? `${targetUrl}?${searchParams}` : targetUrl;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const fetchOptions: RequestInit = { method, headers };

  if (method !== 'GET' && method !== 'DELETE') {
    try {
      const body = await request.text();
      if (body) fetchOptions.body = body;
    } catch {
      // No body
    }
  }

  try {
    const backendResp = await fetch(fullUrl, fetchOptions);
    const raw = await backendResp.text();
    try {
      const data = raw ? JSON.parse(raw) : {};
      return NextResponse.json(data, { status: backendResp.status });
    } catch {
      return NextResponse.json(
        { detail: raw || 'Backend returned a non-JSON response.' },
        { status: backendResp.status || 502 }
      );
    }
  } catch {
    return NextResponse.json(
      { detail: 'Backend service unavailable. Is the FastAPI server running?' },
      { status: 503 }
    );
  }
}
