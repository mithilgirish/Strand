import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import DemoModeBanner from "@/components/shared/DemoModeBanner";

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
      <div className="min-w-0 flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Bar */}
        <TopBar />

        {/* Main Page Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background p-4 sm:p-6 lg:p-10">
          <DemoModeBanner />
          <div className="mx-auto h-full w-full max-w-[1440px] min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
