import type { ReactNode } from 'react';
import AdminNavigationGuard from './AdminNavigationGuard';
export default function AdminLayout({children}:{children:ReactNode}) {
  return <><AdminNavigationGuard/>{children}</>;
}
