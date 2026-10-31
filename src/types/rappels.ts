export interface ReminderService {
  /** Libellé de findMyServices : « Culte Franco », « Prépa. Table », « Campus (répét.) »… */
  service: string;
  /** Rôles réunis (« Piano », « Sainte cène »…) ; vide pour la Prépa. Table. */
  roles: string[];
  time?: string;
  location?: string;
}
