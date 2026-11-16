"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAdminFetch } from "../AdminSessionBoundary";
import type { EnlacesFilters } from "@/lib/enlaces-admin";
import type { EnlacesPhase } from "@/lib/enlaces-shared";

/** Export of the filtered list and the manual publication of results. */
export default function EnlacesTools({ filters, total, phase, undecided, selected }: { filters: EnlacesFilters; total: number; phase: EnlacesPhase; undecided: number; selected: number }) {
  const request = useAdminFetch(), router = useRouter(), lock = useRef(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");

  async function run(task: () => Promise<void>) {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage("");
    try { await task(); } catch { setMessage("No pudimos completar la acción. Revisa tu conexión."); }
    finally { lock.current = false; setBusy(false); }
  }
  const exportList = () => run(async () => {
    const response = await request("/api/admin/enlaces/exportar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filters }) });
    if (!response.ok) { setMessage(((await response.json().catch(() => ({}))) as { error?: string }).error ?? "No pudimos preparar el archivo."); return; }
    const blob = await response.blob(), url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "enlaces-apj-2027.csv";
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(`Archivo listo con ${response.headers.get("x-export-rows") ?? ""} postulaciones. La descarga quedó registrada.`);
  });
  const results = (action: "publish" | "unpublish") => run(async () => {
    const question = action === "publish"
      ? `¿Publicar los resultados? Se mostrarán los nombres de ${selected} personas seleccionadas o suplentes que lo autorizaron y cada persona verá su resultado en su cuenta.${undecided ? ` Hay ${undecided} postulaciones sin decidir, que se verán como en revisión.` : ""}`
      : "¿Retirar los resultados de la página pública? Las personas dejarán de ver su resultado en su cuenta.";
    if (!window.confirm(question)) return;
    const response = await request("/api/admin/enlaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const data = await response.json().catch(() => ({})) as { error?: string; message?: string };
    setMessage(data.error ?? data.message ?? "Listo."); if (response.ok) router.refresh();
  });

  return <div className="people-tools">
    <div className="people-tools-actions">
      <button type="button" className="button button-secondary" disabled={busy || total === 0} onClick={() => void exportList()}>{busy ? "Un momento…" : "Exportar a Excel"}</button>
      {phase === "closed" && <button type="button" className="button button-primary" disabled={busy} onClick={() => void results("publish")}>Publicar resultados</button>}
      {phase === "results" && <button type="button" className="button button-secondary" disabled={busy} onClick={() => void results("unpublish")}>Retirar resultados</button>}
      <p role="status" aria-live="polite">{message || (phase === "open" || phase === "before" ? "Los resultados se publican aquí después del cierre." : "")}</p>
    </div>
  </div>;
}
