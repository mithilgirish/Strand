import { login } from './actions'
import Link from 'next/link'
import Image from 'next/image'
import PasswordInput from '@/components/auth/PasswordInput'

export default async function LoginPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ message?: string }> 
}) {
  const params = await searchParams;

  return (
      <div className="min-h-screen flex items-center justify-center bg-[#111111] text-[#f5f5f5] font-sans selection:bg-[#e5e5e5] selection:text-[#171717]">
        {/* Subtle grid background to match industrial theme */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1c1c1c_1px,transparent_1px),linear-gradient(to_bottom,#1c1c1c_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 -z-10" />
        
        <div className="w-full max-w-[400px] p-8 relative">
          {/* Industrial glass card */}
          <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-md rounded-lg border border-[#333333] -z-10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]" />
          
          {/* Decorative glowing edge */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#e5e5e5]/50 to-transparent shadow-[0_0_10px_rgba(229,229,229,0.3)]" />

          <div className="text-center mb-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.5)] mb-4 border border-[#333333]">
              <Image src="/strand_logo.png" alt="STRAND Logo" width={64} height={64} className="object-cover" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-[#e5e5e5]">
              STRAND
            </h1>
            <p className="text-[10px] text-[#a3a3a3] uppercase tracking-[0.2em] font-mono">
              Command Console Access
            </p>
          </div>

          <form className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest mb-1.5" htmlFor="email">
                Security Clearance (Email)
              </label>
              <input
                className="w-full px-4 py-2.5 bg-[#171717] border border-[#404040] rounded text-[#f5f5f5] font-mono text-[13px] focus:outline-none focus:border-[#e5e5e5] focus:ring-1 focus:ring-[#e5e5e5]/50 transition-all placeholder-[#525252]"
                id="email"
                name="email"
                type="email"
                placeholder="operative@strand.ai"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest mb-1.5" htmlFor="password">
                Authentication Key (Password)
              </label>
              <PasswordInput 
                className="w-full px-4 py-2.5 bg-[#171717] border border-[#404040] rounded text-[#f5f5f5] font-mono text-[13px] focus:outline-none focus:border-[#e5e5e5] focus:ring-1 focus:ring-[#e5e5e5]/50 transition-all placeholder-[#525252]"
                name="password"
                placeholder="••••••••"
              />
            </div>

            {params?.message && (
              <div className="p-3 bg-[#93000a]/20 border border-[#93000a]/50 rounded text-[#ffb4ab] text-xs text-center font-mono">
                {params.message}
              </div>
            )}

            <button
              formAction={login}
              className="w-full mt-6 py-3 bg-[#e5e5e5] hover:bg-white text-[#171717] font-bold rounded transition-all shadow-[0_0_15px_rgba(229,229,229,0.1)] hover:shadow-[0_0_20px_rgba(229,229,229,0.3)] uppercase tracking-[0.15em] text-[11px] relative overflow-hidden group"
            >
              <div className="absolute inset-0 w-full h-full bg-[#171717]/5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
              <span className="relative">Login</span>
            </button>

            <div className="mt-8 flex flex-col items-center space-y-3 border-t border-[#262626] pt-5">
              <Link href="/reset-password" className="text-[10px] text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors uppercase tracking-widest font-mono">
                Forgot Key?
              </Link>
              <div className="text-[9px] text-[#525252] font-mono text-center leading-relaxed">
                NO SELF-REGISTRATION // CONTACT YOUR TENANT ADMIN FOR CREDENTIALS
              </div>
            </div>
          </form>
        </div>
      </div>
  )
}
