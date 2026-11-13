import { Fragment } from "react";

/** Plain text from the panel: each line break becomes <br />. No HTML is interpreted. */
export function Lines({ text }: { text: string }) {
  return <>{text.split("\n").map((line, index) => <Fragment key={index}>{index > 0 && <br />}{line}</Fragment>)}</>;
}

/** Title followed by its highlighted ending, on a new line (stacked) or after a space. */
export function HeadingText({ title, emphasis, stacked = false }: { title: string; emphasis: string; stacked?: boolean }) {
  return <><Lines text={title} />{emphasis && <>{stacked ? <br /> : " "}<em>{emphasis}</em></>}</>;
}
