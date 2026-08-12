'use client';

import { useRouter } from 'next/navigation';
import CustomButton from '@/lib/ui/useable-components/button';

const ACCENT = '#00A8FF';
const PAGE = '#121212';
const SURFACE = '#1C1C1E';
const MUTED = '#8E8E93';

export default function LoginMain() {
  const router = useRouter();

  return (
    <div
      className="flex min-h-screen w-screen items-center justify-center px-4"
      style={{
        background: `radial-gradient(ellipse at top, #1a2a35 0%, ${PAGE} 55%)`,
      }}
    >
      <div className="w-full max-w-[420px]">
        <div className="mb-10 flex flex-col items-center text-center">
          <div
            className="mb-3 text-5xl font-black tracking-tight"
            style={{ color: ACCENT }}
          >
            Jedz<span className="text-white">To</span>
          </div>
          <p className="text-sm" style={{ color: MUTED }}>
            Panel administracyjny
          </p>
        </div>

        <div
          className="rounded-2xl border p-6 sm:p-8"
          style={{
            backgroundColor: SURFACE,
            borderColor: '#2C2C2E',
            boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
          }}
        >
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white">Witaj</h1>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>
              Zaloguj się, aby kontynuować
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <CustomButton
              className="h-12 w-full border-0 bg-primary-color font-bold text-white hover:opacity-90"
              label="Zaloguj"
              rounded={true}
              onClick={() => router.push('/authentication/login')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
