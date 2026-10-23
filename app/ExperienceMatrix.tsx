import GlassScene from "./GlassScene";
export default function ExperienceMatrix() {
  return <div className="matrix-visual" data-motion="matrix" role="img" aria-label="Aprender, conectar y resolver se encuentran en una experiencia que deja un siguiente paso">
    <GlassScene />
    <span className="matrix-circle matrix-learn">Aprender</span>
    <span className="matrix-circle matrix-connect">Conectar</span>
    <span className="matrix-circle matrix-solve">Resolver</span>
    <strong>Siguiente<br />paso</strong>
  </div>;
}
