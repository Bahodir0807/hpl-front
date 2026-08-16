"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ClientDetails } from "../../../../components/clients/client-details";

export default function ClientDetailsPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="space-y-4">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        ← Все клиенты
      </Link>
      <div className="flex max-h-[calc(100vh-7rem)] min-h-0 flex-col overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <ClientDetails clientId={params.id} />
      </div>
    </div>
  );
}
