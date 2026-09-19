'use client';

import { useParams } from 'next/navigation';
import { EngineerWorkspace } from '@/components/engineering/engineer-workspace';

export default function EngineeringLeadPage() {
  const params = useParams<{ id: string }>();

  return <EngineerWorkspace leadId={params.id} />;
}
