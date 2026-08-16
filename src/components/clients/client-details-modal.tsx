"use client";

import { ClientDetails } from "./client-details";

type ClientDetailsModalProps = {
  clientId: string | null;
  onClose: () => void;
};

export function ClientDetailsModal({
  clientId,
  onClose,
}: ClientDetailsModalProps) {
  if (!clientId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="flex max-h-[90vh] min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <ClientDetails clientId={clientId} onClose={onClose} />
      </div>
    </div>
  );
}
