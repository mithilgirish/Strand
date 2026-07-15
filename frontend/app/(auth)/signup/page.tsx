import { signup } from '../login/actions'
import Link from 'next/link'
import Image from 'next/image'
import PasswordInput from '@/components/auth/PasswordInput'

export default async function SignupPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ message?: string }> 
}) {
  const params = await searchParams;

  return (
      <div className="min-h-screen flex items-center justify-center bg-[#111111] text-[#f5f5f5] font-sans selection:bg-[#4edea3] selection:text-[#003824]">
        {/* Subtle grid background to match industrial theme */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1c1c1c_1px,transparent_1px),linear-gradient(to_bottom,#1c1c1c_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 -z-10" />
        
        <div className="w-full max-w-[400px] p-8 relative">
          {/* Industrial glass card */}
          <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-md rounded-lg border border-[#333333] -z-10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]" />
          
          {/* Decorative glowing edge (Secondary color for provision/creation) */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#4edea3]/50 to-transparent shadow-[0_0_10px_rgba(78,222,163,0.3)]" />

          <div className="text-center mb-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.5)] mb-4 border border-[#333333]">
              <Image src="/strand_logo.png" alt="STRAND Logo" width={64} height={64} className="object-cover" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-[#4edea3]">
              STRAND
            </h1>
            <p className="text-[10px] text-[#a3a3a3] uppercase tracking-[0.2em] font-mono">
              Operative Registration
            </p>
          </div>

          <div className="space-y-6 text-center">
            <div className="p-4 bg-[#171717] border border-[#262626] rounded text-left font-mono text-[12px] leading-relaxed text-[#a3a3a3] space-y-4">
              <p className="text-[#4edea3] font-bold text-center border-b border-[#262626] pb-2 text-[13px]">
                ONBOARDING PROTOCOL REQUIRED
              </p>
              <p>
                Self-registration is deactivated for security and strict tenant isolation.
              </p>
              <p className="text-[#e5e5e5]">
                1. A Super-Administrator must first provision a tenant workspace and assign a Tenant Admin.
              </p>
              <p className="text-[#e5e5e5]">
                2. The Tenant Admin can then send invitation links and configure credentials with specific roles.
              </p>
            </div>
            
            <div className="mt-8 text-center border-t border-[#262626] pt-5">
              <Link href="/login" className="text-[10px] text-[#a3a3a3] hover:text-[#4edea3] transition-colors uppercase tracking-widest font-mono">
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
  )
}
