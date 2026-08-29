import Sidebar from "@/components/Sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-7xl mx-auto flex w-full">
      <Sidebar />
      <main className="flex-1 min-w-0 px-6 md:px-12 py-10 max-w-4xl space-y-12">
        {children}
      </main>
    </div>
  );
}
