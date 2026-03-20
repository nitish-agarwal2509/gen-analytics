import type { ReactNode } from "react";

interface AppLayoutProps {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}

export function AppLayout({ sidebar, header, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {sidebar}
      <div className="flex flex-1 flex-col overflow-hidden">
        {header}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
