import Image from 'next/image';

export default function HeroMascot() {
  return <span className="hero-mascot" aria-hidden="true">
    <Image src="/images/mascot/cacomixtle-tlalnepantla.webp" width={1254} height={1254} alt="" priority unoptimized sizes="(max-width: 760px) 340px, (max-width: 1024px) 420px, 520px" />
  </span>;
}
