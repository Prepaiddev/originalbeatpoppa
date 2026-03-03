"use client";

import AdminGuard from "@/components/admin/AdminGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
        {children}
      </div>
    </AdminGuard>
  );
}
