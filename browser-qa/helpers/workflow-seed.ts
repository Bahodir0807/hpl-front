import type { APIRequestContext } from '@playwright/test';
import { backendApi, getDefaultCalculationItemRefs, getExteriorQualificationRefs } from './backend';
import {
  createLead,
  fetchFirstClientId,
  fetchFirstProjectObjectId,
} from './lead-factory';

export type ApprovedQuoteSeed = {
  leadId: string;
  quoteId: string;
  requestId: string;
};

/** Seeds MANAGER → HEAD calculation request → quote → finalize → approved (browser-qa DB only). */
export async function seedApprovedFinalizedQuote(
  manager: APIRequestContext,
  head: APIRequestContext,
  suffix: string,
): Promise<ApprovedQuoteSeed> {
  const leadId = await createLead(manager, `quote-${suffix}`);
  const clientId = await fetchFirstClientId(manager);
  const projectObjectId = await fetchFirstProjectObjectId(manager, clientId);
  const { panelTypeId, panelSizeId } = await getExteriorQualificationRefs(manager);
  const { supplierId, qualityClassId } = await getDefaultCalculationItemRefs(manager);

  const qualify = await manager.post(`${backendApi}/leads/${leadId}/qualify`, {
    data: {
      clientId,
      projectObjectId,
      needDescription: `Browser QA quote ${suffix}`,
      decisionMakerContact: 'QA Contact',
      qualification: {
        installationRequired: false,
        customerRequirements: 'Browser QA panels',
        application: 'EXTERIOR_WITH_UV',
        panelTypeId,
        panelSizeId,
        thicknessMm: 10,
        requiredAreaM2: 15.5,
        colorCode: 'W100',
        colorName: 'White',
      },
    },
  });
  if (!qualify.ok()) {
    throw new Error(`qualify failed: ${qualify.status()} ${await qualify.text()}`);
  }

  const commercial = await head.post(
    `${backendApi}/leads/${leadId}/commercial-qualification`,
    {
      data: {
        supplierId,
        qualityClassId,
        decisionComment: 'Browser QA commercial',
      },
    },
  );
  if (!commercial.ok()) {
    throw new Error(
      `commercial-qualification failed: ${commercial.status()} ${await commercial.text()}`,
    );
  }

  const calc = await manager.post(`${backendApi}/calculations/requests`, {
    data: {
      leadId,
      notes: 'Browser QA manager note for HEAD',
      calculations: [
        {
          title: 'Facade A',
          items: [
            {
              panelTypeId,
              panelSizeId,
              thicknessMm: 10,
              qualityClassId,
              requiredAreaM2: '15.50',
              supplierId,
            },
          ],
        },
      ],
    },
  });
  if (!calc.ok()) {
    throw new Error(`calc request failed: ${calc.status()} ${await calc.text()}`);
  }
  const requestId = ((await calc.json()) as { id: string }).id;

  const submit = await manager.post(
    `${backendApi}/calculations/requests/${requestId}/submit`,
  );
  if (!submit.ok()) {
    throw new Error(`submit failed: ${submit.status()} ${await submit.text()}`);
  }

  const quoteRes = await head.post(
    `${backendApi}/calculations/requests/${requestId}/convert-to-quote`,
    { data: { clientComment: 'Browser QA client comment' } },
  );
  if (!quoteRes.ok()) {
    throw new Error(`convert-to-quote failed: ${quoteRes.status()} ${await quoteRes.text()}`);
  }
  const quote = (await quoteRes.json()) as {
    id: string;
    items: Array<{ id: string }>;
  };

  const pricing = await head.patch(`${backendApi}/quotes/${quote.id}/approved-pricing`, {
    data: {
      items: quote.items.map((item, index) => ({
        id: item.id,
        purchasePricePerM2Cny: String(80 + index * 5),
      })),
    },
  });
  if (!pricing.ok()) {
    throw new Error(`approved-pricing failed: ${pricing.status()} ${await pricing.text()}`);
  }

  const terms = await head.patch(`${backendApi}/quotes/${quote.id}/commercial-terms`, {
    data: {
      productionTerms: '15–20 рабочих дней',
      deliveryTerms: '4 недели после согласования декора',
      commercialNote: 'Клиентское примечание Browser QA',
      internalCommercialNote: 'INTERNAL-ONLY-DO-NOT-SHOW',
    },
  });
  if (!terms.ok()) {
    throw new Error(`commercial-terms failed: ${terms.status()} ${await terms.text()}`);
  }

  const finalize = await head.post(`${backendApi}/quotes/${quote.id}/finalize`, {
    data: {},
  });
  if (!finalize.ok()) {
    throw new Error(`finalize failed: ${finalize.status()} ${await finalize.text()}`);
  }

  const sent = await head.patch(`${backendApi}/quotes/${quote.id}/status`, {
    data: { status: 'sent' },
  });
  if (!sent.ok()) {
    throw new Error(`status sent failed: ${sent.status()} ${await sent.text()}`);
  }

  const approved = await head.patch(`${backendApi}/quotes/${quote.id}/status`, {
    data: { status: 'approved' },
  });
  if (!approved.ok()) {
    throw new Error(`status approved failed: ${approved.status()} ${await approved.text()}`);
  }

  return { leadId, quoteId: quote.id, requestId };
}
