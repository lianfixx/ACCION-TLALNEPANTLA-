import { enlacesAgeReference, enlacesNotice, enlacesState, ownEnlacesApplication } from "./enlaces";
import { enlacesDocuments, type EnlacesDocument } from "./enlaces-documents";
import type { EnlacesApplication, EnlacesPhase } from "./enlaces-shared";

/** The retention date follows the decision, so it never leaves the server. */
export type EnlacesApplicationView = Omit<EnlacesApplication, "retentionUntil">;
export type EnlacesView = {
  state: { phase: EnlacesPhase; opensAt: number; closesAt: number };
  application: EnlacesApplicationView | null;
  documents: EnlacesDocument[];
  accountName: string;
  ageReference: string;
  notice: { ready: boolean; token: string; sections: { title: string; body: string }[] };
};

/** What the applicant sees. The committee's decision stays hidden until the results are published. */
export async function enlacesView(accountId: string, accountName: string): Promise<EnlacesView> {
  const [state, notice, own, documents] = await Promise.all([enlacesState(), enlacesNotice(), ownEnlacesApplication(accountId), enlacesDocuments(accountId)]);
  const decided = own && ["selected", "substitute", "not_selected"].includes(own.status);
  let application: EnlacesApplicationView | null = null;
  if (own) {
    const { retentionUntil: _hidden, ...shown } = own; void _hidden;
    application = decided && state.phase !== "results" ? { ...shown, status: "in_review", seat: "" } : shown;
  }
  // Only what the form needs from the notice: the stored snapshot stays on the server.
  const { ready, token, sections } = notice;
  return { state: { phase: state.phase, opensAt: state.opensAt, closesAt: state.closesAt }, application, documents, accountName, ageReference: enlacesAgeReference(), notice: { ready, token, sections } };
}
