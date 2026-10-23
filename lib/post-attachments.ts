/** Only these owner-approved local images can be embedded in a publication. */
export const postAttachments = [
  {
    marker: "[[flyer-cafecito-juvenil]]",
    src: "/images/actualidad/flyer-cafecito-juvenil.webp",
    alt: "Cartel azul de Cafecito Juvenil Tlalnepantla, con tres siluetas de perfil en tonos coral, lila y azul y el emblema del PAN.",
    caption: "Cartel original de Cafecito Juvenil Tlalnepantla",
    width: 1254,
    height: 1254,
  },
  {
    marker: "[[aviso-transporte-box-lunch]]",
    src: "/images/actualidad/aviso-transporte-box-lunch.webp",
    alt: "Anuncio de Cafecito Juvenil Tlalnepantla que confirma box lunch y transporte oficial, con un ajolote ilustrado, una caja de comida y una camioneta.",
    caption: "Anuncio original de transporte y box lunch, con la mascota de aquella etapa",
    width: 1254,
    height: 1254,
  },
] as const;

export function attachmentForBlock(block: string) {
  return postAttachments.find((attachment) => attachment.marker === block.trim());
}
