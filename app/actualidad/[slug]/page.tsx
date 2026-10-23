import {publishedPost} from "@/lib/public-posts";
import {postCover} from "@/lib/editorial-post";
import { and, asc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { comments } from "@/db/schema";
import { getStaffIdentity } from "@/lib/staff-auth";
import { signInPath } from "@/lib/account-paths";
import { dataChannelConfiguration } from "@/lib/privacy-config";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CommentForm from "../CommentForm";
import PostBody from "@/app/PostBody";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

async function publishedComments(postId: string) {
  try {
    const items = await getDb().select({ id: comments.id, authorName: comments.authorName, body: comments.body, createdAt: comments.createdAt })
      .from(comments)
      .where(and(eq(comments.postId, postId), eq(comments.status, "approved"), gt(comments.retentionUntil, Date.now())))
      .orderBy(asc(comments.createdAt))
      .limit(100);
    return { items, unavailable: false };
  } catch {
    return { items: [], unavailable: true };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { item: post, unavailable } = await publishedPost(slug);
  if (unavailable) return { title: "Publicación no disponible", robots: { index: false, follow: true } };
  if (!post) return { title: "Actividad no encontrada", robots: { index: false, follow: false } };
  const canonical = `/actualidad/${post.slug}`;
  const cover=postCover(post);
  const image = cover ? `${SITE_URL}${cover.src}` : null;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: {
      type: "article",
      locale: "es_MX",
      siteName: SITE_NAME,
      title: post.title,
      description: post.excerpt,
      url: canonical,
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      images: image && cover ? [{ url: image, width: cover.width, height: cover.height, alt: cover.alt }] : [],
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt,
      images: image ? [image] : [],
    },
  };
}

function formatDate(value: number | null) {
  return value
    ? new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Mexico_City" })
    : "";
}

export default async function ActivityPage({ params }: PageProps) {
  const { slug } = await params;
  const { item: post, unavailable } = await publishedPost(slug);
  if (unavailable) return (
    <main className="content-shell" id="main-content">
      <section className="content-hero">
        <p className="section-kicker light">Actualidad</p>
        <h1>Publicación no disponible.</h1>
      </section>
      <section className="post-list">
        <div className="empty-state" role="status">
          <h2>No pudimos cargar esta publicación.</h2>
          <p>Vuelve a intentarlo en unos minutos.</p>
          <Link className="text-link" href="/actualidad">Volver a Actualidad</Link>
        </div>
      </section>
    </main>
  );
  if (!post) notFound();
  const cover=postCover(post);
  // These reads are independent. Keep the session request-scoped and avoid
  // making readers wait for comments, then account lookup, then site settings.
  const [commentResult, user, commentsEnabled] = await Promise.all([
    publishedComments(post.id),
    getStaffIdentity(),
    post.isEditorialFallback
      ? Promise.resolve(false)
      : dataChannelConfiguration("comments").then(configuration => configuration.enabled),
  ]);
  const { items: approvedComments, unavailable: commentsUnavailable } = commentResult;
  const signedIn = Boolean(user);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const canonical = `${SITE_URL}/actualidad/${post.slug}`;
  const articleData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    mainEntityOfPage: canonical,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    image: cover ? `${SITE_URL}${cover.src}` : undefined,
    inLanguage: "es-MX",
  }).replaceAll("<", "\\u003c");

  return (
    <main className="content-shell" id="main-content">
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: articleData }}
      />
      <aside className="content-session" aria-label="Estado de las opiniones">
        <Link className="text-link" href="/actualidad"> Volver a Actualidad</Link>
        {signedIn
          ? <span><strong>Sesión activa.</strong> {commentsEnabled ? "Puedes enviar una opinión a moderación." : "Las opiniones siguen cerradas por ahora."}</span>
          : commentsEnabled
            ? <Link className="text-link" href={signInPath(`/actualidad/${post.slug}`)}>Iniciar sesión para opinar</Link>
            : <span><strong>Opiniones cerradas.</strong> Puedes leer y compartir esta actividad sin iniciar sesión.</span>}
      </aside>
      <article className="post-list post-detail-shell">
        <div className="post-card post-detail">
          <div className="post-meta"><span>Publicado el {formatDate(post.publishedAt)}</span><span>Actividad</span></div>
          <h1>{post.title}</h1>
          <p className="post-excerpt">{post.excerpt}</p>
          {cover ? <Image className={cover.height>cover.width?"post-image post-image-portrait":"post-image"} src={cover.src} alt={cover.alt} width={cover.width} height={cover.height} priority decoding="async" sizes="(max-width: 700px) calc(100vw - 48px), 960px" unoptimized /> : null}
          <PostBody body={post.body} />
          <section className="approved-comments" aria-labelledby="opiniones-publicadas">
            <h2 id="opiniones-publicadas">Opiniones aprobadas</h2>
            {commentsUnavailable
              ? <p role="status">No pudimos cargar las opiniones. Vuelve a intentarlo en unos minutos.</p>
              : approvedComments.length === 0
              ? <p>Todavía no hay opiniones publicadas.</p>
              : approvedComments.map((comment) => <article key={comment.id}><strong>{comment.authorName}</strong><p>{comment.body}</p></article>)}
          </section>
          <CommentForm key={user?.accountId??"anonymous"} accountId={user?.accountId??""} postId={post.id} enabled={commentsEnabled} signedIn={signedIn} signInPath={signInPath(`/actualidad/${post.slug}`)} />
        </div>
      </article>
    </main>
  );
}
