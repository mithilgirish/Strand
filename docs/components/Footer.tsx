import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 glass-panel py-12 px-6 mt-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#a3a3a3]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 p-1 flex items-center justify-center">
            <img src="/strand_logo.png" alt="STRAND" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white">STRAND</span>
            <span>Licensed under <strong>Apache 2.0</strong></span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-6 font-medium">
          <Link href="/docs/how-to-use" className="hover:text-white transition">How to Use</Link>
          <Link href="/docs/quickstart" className="hover:text-white transition">Quickstart</Link>
          <Link href="/docs/architecture" className="hover:text-white transition">Architecture</Link>
          <Link href="/docs/api" className="hover:text-white transition">API Docs</Link>
          <a href="https://github.com/mithilgirish/Strand" target="_blank" rel="noreferrer" className="hover:text-white transition">GitHub</a>
          <a href="https://strand-iota.vercel.app/" target="_blank" rel="noreferrer" className="hover:text-white transition">Production App</a>
        </div>
      </div>
    </footer>
  );
}
