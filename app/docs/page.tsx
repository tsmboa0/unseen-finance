import { permanentRedirect } from "next/navigation";
import { UNSEEN_DOCS_URL } from "@/lib/docs-url";

export default function DocsPage() {
  permanentRedirect(UNSEEN_DOCS_URL);
}
