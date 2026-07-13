import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Content Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Bar */}
        <TopBar />

        {/* Main Page Area */}
        <main className="flex-1 overflow-y-auto bg-background p-10">
          <div className="max-w-[1440px] mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
