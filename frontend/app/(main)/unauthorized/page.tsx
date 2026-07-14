import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-[#93000a]/20 rounded-full flex items-center justify-center border border-[#93000a]/50">
        <svg className="w-10 h-10 text-[#ffb4ab]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#ffb3ad] mb-2">Insufficient Clearance</h1>
        <p className="text-sm text-[#a3a3a3] max-w-md font-mono uppercase tracking-widest">
          Your current security level does not grant access to the Command Console.
        </p>
      </div>

      <Link 
        href="/"
        className="px-6 py-3 bg-[#e5e5e5] text-[#171717] font-bold uppercase tracking-widest text-xs rounded hover:bg-white transition-colors"
      >
        Return to Cockpit
      </Link>
    </div>
  );
}
