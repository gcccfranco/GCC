// Base Firestore simulée pour les tests de routes sans page : collections en mémoire, create() qui échoue si le
// document existe (code gRPC 6, comme l'Admin SDK), delete(), set(), update(), runTransaction().

export type Doc = Record<string, unknown>;

export function baseSimulee(initial: Record<string, Record<string, Doc>> = {}) {
  const collections: Record<string, Record<string, Doc>> = { users: {}, equipes: {}, groupes: {}, notifLog: {}, ...initial };
  const col = (nom: string) => (collections[nom] ??= {});
  const ref = (nom: string, id: string) => ({
    get: async () => ({ exists: id in col(nom), data: () => col(nom)[id] }),
    update: async (data: Doc) => { col(nom)[id] = { ...col(nom)[id], ...data }; },
    set: async (data: Doc) => { col(nom)[id] = { ...data }; },
    delete: async () => { delete col(nom)[id]; },
    create: async (data: Doc) => {
      await Promise.resolve();
      if (id in col(nom)) throw Object.assign(new Error("6 ALREADY_EXISTS"), { code: 6 });
      col(nom)[id] = { ...data };
    },
  });
  const db = {
    collection: (nom: string) => ({
      get: async () => ({ docs: Object.entries(col(nom)).map(([id, d]) => ({ id, data: () => d })) }),
      doc: (id: string) => ref(nom, id),
    }),
    runTransaction: async <T>(fn: (tx: { get: (r: ReturnType<typeof ref>) => ReturnType<ReturnType<typeof ref>["get"]>; set: (r: ReturnType<typeof ref>, d: Doc) => void; delete: (r: ReturnType<typeof ref>) => void }) => Promise<T>) => {
      const ecritures: (() => Promise<void>)[] = [];
      const resultat = await fn({ get: (r) => r.get(), set: (r, d) => { ecritures.push(() => r.set(d)); }, delete: (r) => { ecritures.push(() => r.delete()); } });
      for (const e of ecritures) await e();
      return resultat;
    },
  } as unknown as FirebaseFirestore.Firestore;
  return { db, collections };
}
