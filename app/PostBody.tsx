
import { attachmentForBlock } from "@/lib/post-attachments";

/** Text remains escaped by React. Only an exact approved marker becomes an image. */
export default function PostBody({ body, className = "post-body" }: { body: string; className?: string }) {
  const blocks = body.replaceAll("\r\n", "\n").split(/\n\s*\n/).filter((block) => block.trim());

  return <div className={`post-content ${className}`}>
    {blocks.map((block, index) => {
      const attachment = attachmentForBlock(block);
      if (!attachment) return <p key={index}>{block}</p>;
      return <figure className="post-attachment" key={index}>
        {/* Lossless local variants preserve the original and avoid on-demand transforms. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.src}
          srcSet={[500,768,1000].map(width=>`${attachment.src.replace(".webp",`-${width}.webp`)} ${width}w`).concat(`${attachment.src} ${attachment.width}w`).join(", ")}
          alt={attachment.alt}
          width={attachment.width}
          height={attachment.height}
          sizes="(max-width: 600px) calc(100vw - 110px), (max-width: 612px) calc(90vw - 50px), 500px"
          loading="lazy"
          decoding="async"
        />
        <figcaption>
          <span>{attachment.caption}</span>
          <a href={attachment.src} target="_blank" rel="noopener noreferrer" aria-label={`Abrir imagen completa · ${attachment.caption}`}>Abrir imagen completa</a>
        </figcaption>
      </figure>;
    })}
  </div>;
}
