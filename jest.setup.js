import '@testing-library/jest-dom';

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      pop: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      gte: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  })),
}));

// Mock Next.js request/response
jest.mock('next/server', () => ({
  NextRequest: class {
    constructor(init) {
      this.url = init?.url || 'http://localhost:3000';
      this.method = init?.method || 'GET';
      this.headers = new Map(init?.headers || []);
      this.cookies = {
        get: jest.fn(),
      };
      this.nextUrl = {
        searchParams: new URLSearchParams(),
      };
    }
  },
  NextResponse: class {
    constructor(data, init) {
      this.data = data;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || 'OK';
      this.headers = new Map(init?.headers || []);
    }
    json(data) {
      return new NextResponse(data, { headers: { 'Content-Type': 'application/json' } });
    }
    static json(data, init) {
      return new NextResponse(data, { ...init, headers: { ...(init?.headers || {}), 'Content-Type': 'application/json' } });
    }
  },
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid'),
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({
      digest: jest.fn(() => 'hash'),
    })),
  })),
  createHmac: jest.fn(() => ({
    update: jest.fn(() => ({
      digest: jest.fn(() => 'hmac'),
    })),
  })),
}));