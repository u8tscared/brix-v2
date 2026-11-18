// Adresse du worker. Vide en preview statique : rien n'est appelé en démo.
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
