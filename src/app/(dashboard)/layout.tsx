"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { Header } from "../../components/layout/header";
import { Sidebar } from "../../components/layout/sidebar";
import { useAuth } from "../../context/auth-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized && user === null) {
      router.push("/login");
    }
  }, [isInitialized, router, user]);

  if (!isInitialized || user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Загрузка
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pl-60">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-col">
        <Header />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
