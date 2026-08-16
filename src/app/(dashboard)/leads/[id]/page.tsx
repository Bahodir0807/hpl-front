'use client';

import { useParams } from 'next/navigation';
import { LeadWorkspace } from '@/components/leads/lead-workspace';

export default function LeadDetailsPage() {
  const params = useParams<{ id: string }>();

  return <LeadWorkspace leadId={params.id} />;
}
