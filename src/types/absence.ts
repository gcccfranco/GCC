// Congés et absences (SC3, docs/spec-createur-corbeille-absences.md) : users/{uid}/absences/{id}.
// Dates locales AAAA-MM-JJ ; une absence d'un jour a du === au.
export type Absence = {
  id: string;
  uid: string;
  du: string;
  au: string;
  motif?: string;
};
