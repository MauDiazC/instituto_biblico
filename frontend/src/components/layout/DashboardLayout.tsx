import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="bg-background text-on-background font-body antialiased min-h-screen flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen pb-24 md:pb-12">
        <div className="pt-12 px-6 md:px-12 max-w-[1440px] mx-auto space-y-12">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default DashboardLayout;
