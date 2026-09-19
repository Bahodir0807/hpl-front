'use client';

import { useParams } from 'next/navigation';
import { EngineerWorkspace } from '@/components/engineering/engineer-workspace';
import { LeadWorkspace } from '@/components/leads/lead-workspace';
import { useAuth } from '@/context/auth-context';
import { prefersEngineerWorkspace } from '@/lib/engineering';

export default function LeadDetailsPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  if (prefersEngineerWorkspace(user?.permissions)) {
    return <EngineerWorkspace leadId={params.id} />;
  }

  return <LeadWorkspace leadId={params.id} />;
}
