import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const { sidebarOpen } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header title={title} subtitle={subtitle} />
      <main
        className={cn(
          'transition-all duration-300 min-h-[calc(100vh-4rem)]',
          sidebarOpen ? 'pl-64' : 'pl-20'
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
