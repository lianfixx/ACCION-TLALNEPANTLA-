import {publishedPosts} from "@/lib/public-posts";
import {postCover} from "@/lib/editorial-post";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Actualidad",
  description: "Actividades, personas, aprendizajes y próximos pasos de Acción Política Juvenil Tlalnepantla.",
  alternates: { canonical: "/actualidad" },
};

function formatDate(value: number | null) {
  return value
    ? new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Mexico_City" })
    : "";
}

export default async function ActualidadPage() {
  const { items, unavailable } = await publishedPosts();
  return (
    <main className="content-shell" id="main-content">
      <section className="content-hero">
        <p className="section-kicker light">Nuestra bitácora</p>
        <h1>Lo que está<br />pasando.</h1>
        <p>Actividades, convocatorias y lo que viene para la comunidad.</p>
      </section>
      <section className="post-list post-index" aria-live="polite" aria-label="Publicaciones de actualidad">
        {unavailable ? (
          <article className="empty-state" role="status">
            <h2>No pudimos cargar las publicaciones.</h2>
            <p>Vuelve a intentarlo en unos minutos.</p>
          </article>
        ) : items.length === 0 ? (
          <article className="empty-state">
            <h2>Todavía no hay publicaciones.</h2>
            <p>Aquí aparecerán las actividades y sus convocatorias.</p>
          </article>
        ) : items.map((post,index) => { const cover=postCover(post); return (
          <article className="post-card post-index-card" key={post.id}>
            {cover ? (
              <Link className="post-index-image" href={`/actualidad/${post.slug}`} aria-label={`Leer ${post.title}`}>
                <Image src={cover.src} alt={cover.alt} width={cover.width} height={cover.height} loading={index===0?"eager":"lazy"} fetchPriority={index===0?"high":"auto"} decoding="async" sizes="(max-width: 700px) calc(100vw - 48px), 420px" unoptimized />
              </Link>
            ) : null}
            <div className="post-index-copy">
              <div className="post-meta"><span>Publicado el {formatDate(post.publishedAt)}</span><span>Actividad</span></div>
              <h2><Link href={`/actualidad/${post.slug}`}>{post.title}</Link></h2>
              <p className="post-excerpt">{post.excerpt}</p>
              <Link className="post-read-link" href={`/actualidad/${post.slug}`}>Leer la historia</Link>
            </div>
          </article>
        );})}
      </section>
    </main>
  );
}
