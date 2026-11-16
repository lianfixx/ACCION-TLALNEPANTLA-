import { enlacesAgeReference, enlacesNotice, enlacesState, ownEnlacesApplication } from "./enlaces";
import { enlacesDocuments, type EnlacesDocument } from "./enlaces-documents";
import type { EnlacesApplication, EnlacesPhase } from "./enlaces-shared";

export type EnlacesView = {
  state: { phase: EnlacesPhase; opensAt: number; closesAt: number };
  application: EnlacesApplication | null;
  documents: EnlacesDocument[];
  accountName: string;
  ageReference: string;
  notice: { ready: boolean; token: string; sections: { title: string; body: string }[] };
};

/** What the applicant sees. The committee's decision stays hidden until the results are published. */
export async function enlacesView(accountId: string, accountName: string): Promise<EnlacesView> {
  const [state, notice, own, documents] = await Promise.all([enlacesState(), enlacesNotice(), ownEnlacesApplication(accountId), enlacesDocuments(accountId)]);
  const decided = own && ["selected", "substitute", "not_selected"].includes(own.status);
  const application = own && decided && state.phase !== "results" ? { ...own, status: "in_review" as const } : own;
  // Only what the form needs from the notice: the stored snapshot stays on the server.
  const { ready, token, sections } = notice;
  return { state: { phase: state.phase, opensAt: state.opensAt, closesAt: state.closesAt }, application, documents, accountName, ageReference: enlacesAgeReference(), notice: { ready, token, sections } };
}
