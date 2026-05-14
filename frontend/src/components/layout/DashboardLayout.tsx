import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
  hideSidebar?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, hideSidebar = false }) => {
  return (
    <div className="bg-background text-on-background font-body antialiased min-h-screen flex">
      {!hideSidebar && <Sidebar />}
      <main className={`flex-1 ${!hideSidebar ? 'md:ml-64' : ''} min-h-screen pb-24 md:pb-12`}>
        <div className={`pt-12 px-6 md:px-12 ${!hideSidebar ? 'max-w-[1440px]' : 'max-w-full'} mx-auto space-y-12`}>
          {children}
        </div>
      </main>
      {!hideSidebar && <MobileNav />}
    </div>
  );
};

export default DashboardLayout;
