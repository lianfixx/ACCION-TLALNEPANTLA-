import Link from 'next/link';
export const metadata={title:'Recuperar acceso',robots:{index:false,follow:false,noarchive:true}};
export default function Recovery(){return <main className="staff-access-shell" id="main-content"><section className="staff-access-card"><h1>Recuperar tu acceso</h1><p>Solicita a quien administra las cuentas que restablezca tu contraseña. Tu usuario seguirá siendo el mismo.</p><p>La recuperación de la cuenta propietaria requiere una operación privada de soporte.</p><Link href="/ingresar" className="staff-home-link">Volver al acceso</Link></section></main>;}
