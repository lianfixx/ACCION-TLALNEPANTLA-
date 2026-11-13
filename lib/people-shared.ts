import { isCommission } from './commissions';
import { membershipStatuses } from './membership-shared';

export const affiliationLabels = { none: 'Sin trámite', reported: 'En revisión', changes: 'Pide corrección', confirmed: 'Comprobada' } as const;
export type PeopleFilters = { q: string; commission: string; status: string; documents: string; affiliation: string; suspended: string; tag: string };
export const emptyPeopleFilters: PeopleFilters = { q: '', commission: '', status: '', documents: '', affiliation: '', suspended: '', tag: '' };
export const peopleEmailLimit = 100;

/** Accepts only known values; anything else means «sin filtro». */
export function parsePeopleFilters(source: Record<string, unknown>): PeopleFilters {
  const pick = (key: string) => typeof source[key] === 'string' ? (source[key] as string) : '';
  const status = pick('status'), documents = pick('documents'), affiliation = pick('affiliation'), suspended = pick('suspended');
  return {
    q: pick('q').trim().slice(0, 120),
    commission: isCommission(pick('commission')) ? pick('commission') : '',
    status: status === 'none' || Object.hasOwn(membershipStatuses, status) ? status : '',
    documents: ['complete', 'pending'].includes(documents) ? documents : '',
    affiliation: Object.hasOwn(affiliationLabels, affiliation) ? affiliation : '',
    suspended: ['1', '0'].includes(suspended) ? suspended : '',
    tag: normalizeTag(pick('tag')),
  };
}

export function peopleSearchParams(filters: PeopleFilters, page = 1) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  if (page > 1) params.set('page', String(page));
  return params;
}

/** Lowercase, single spaces, letters, digits, spaces, hyphens and underscores; up to 30 characters. */
export function normalizeTag(value: unknown) {
  if (typeof value !== 'string') return '';
  const tag = value.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
  return Array.from(tag).length <= 30 && /^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(tag) ? tag : '';
}

export const personActionLabels: Record<string, string> = {
  'person.note.add': 'Nota agregada', 'person.note.delete': 'Nota borrada', 'person.tag.add': 'Etiqueta agregada', 'person.tag.remove': 'Etiqueta quitada',
  'person.suspend': 'Cuenta suspendida', 'person.reactivate': 'Cuenta reactivada', 'person.update': 'Datos cambiados', 'person.confirmation_resent': 'Correo de confirmación reenviado',
  'people.email': 'Correo enviado', 'staff.login': 'Entró al sitio', 'staff.activated': 'Activó su cuenta', 'staff.password_changed': 'Cambió su contraseña',
  'account.created': 'Cuenta creada', 'account.password_reset': 'Contraseña restablecida', 'account.email_confirmed': 'Confirmó su correo',
  'staff.revoked': 'Acceso revocado', 'staff.role_changed': 'Permisos cambiados', 'commission.team': 'Acceso a comisión cambiado',
  'document.reviewed': 'Documento revisado', 'document.removed': 'Documento retirado', 'affiliation.reported': 'Reportó su afiliación',
  'affiliation.review': 'Afiliación revisada', 'affiliation.document_received': 'Entregó comprobante de afiliación', 'affiliation.evidence_changed': 'Cambió la evidencia de afiliación',
  'commission.created': 'Registró una actividad',
};
