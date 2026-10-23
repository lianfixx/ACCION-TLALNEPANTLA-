import { noStoreJson } from "@/lib/security";
export async function PUT() { return noStoreJson({error:"Gestiona los permisos desde Usuarios y contraseñas."},{status:403}); }
export const DELETE = PUT;
