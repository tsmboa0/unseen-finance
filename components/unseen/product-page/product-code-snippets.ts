export type CodeToken = {
  className?: string;
  text: string;
};

/** Aligned with landing `codeSnippets.gateway`. */
const gateway: CodeToken[][] = [
  [
    { className: "code-keyword", text: "import" },
    { text: " { " },
    { className: "code-function", text: "UnseenClient" },
    { text: " } " },
    { className: "code-keyword", text: "from" },
    { text: " " },
    { className: "code-string", text: "'@unseen_fi/sdk'" },
    { text: ";" },
  ],
  [{ text: "" }],
  [
    { className: "code-keyword", text: "const" },
    { text: " " },
    { className: "code-function", text: "unseen" },
    { text: " = " },
    { className: "code-keyword", text: "new" },
    { text: " " },
    { className: "code-function", text: "UnseenClient" },
    { text: "({" },
  ],
  [
    { text: "  apiKey: " },
    { className: "code-function", text: "process" },
    { text: ".env." },
    { className: "code-function", text: "UNSEEN_API_KEY" },
    { text: "!," },
  ],
  [
    { text: "  network: " },
    { className: "code-string", text: "'devnet'" },
    { text: "," },
  ],
  [{ text: "});" }],
  [{ text: "" }],
  [{ className: "code-comment", text: "// Create a shielded checkout session" }],
  [
    { className: "code-keyword", text: "const" },
    { text: " " },
    { className: "code-function", text: "payment" },
    { text: " = " },
    { className: "code-keyword", text: "await" },
    { text: " unseen.payments." },
    { className: "code-function", text: "create" },
    { text: "({" },
  ],
  [
    { text: "  amount: " },
    { className: "code-number", text: "50_000_000" },
    { text: ", " },
    { className: "code-comment", text: "// raw token units (e.g. 50 USDC)" },
  ],
  [
    { text: "  reference: " },
    { className: "code-string", text: "'order_123'" },
    { text: "," },
  ],
  [
    { text: "  description: " },
    { className: "code-string", text: "'Premium plan'" },
    { text: "," },
  ],
  [{ text: "});" }],
  [{ text: "" }],
  [
    { text: "console." },
    { className: "code-function", text: "log" },
    { text: "(payment.checkoutUrl);" },
  ],
  [{ text: "" }],
  [{ className: "code-comment", text: "// After the customer pays, verify on-chain" }],
  [
    { className: "code-keyword", text: "const" },
    { text: " " },
    { className: "code-function", text: "result" },
    { text: " = " },
    { className: "code-keyword", text: "await" },
    { text: " unseen.payments." },
    { className: "code-function", text: "verify" },
    { text: "(payment.id);" },
  ],
  [
    { className: "code-keyword", text: "if" },
    { text: " (result.status === " },
    { className: "code-string", text: "'confirmed'" },
    { text: ") {" },
  ],
  [
    { text: "  console." },
    { className: "code-function", text: "log" },
    { text: "(" },
    { className: "code-string", text: "'Confirmed:'" },
    { text: ", result.txSignature);" },
  ],
  [{ text: "}" }],
];

/** Aligned with landing `codeSnippets.x402`. */
const x402: CodeToken[][] = [
  [
    { className: "code-keyword", text: "import" },
    { text: " { " },
    { className: "code-function", text: "UnseenClient" },
    { text: " } " },
    { className: "code-keyword", text: "from" },
    { text: " " },
    { className: "code-string", text: "'@unseen_fi/sdk'" },
    { text: ";" },
  ],
  [{ text: "" }],
  [
    { className: "code-keyword", text: "const" },
    { text: " " },
    { className: "code-function", text: "unseen" },
    { text: " = " },
    { className: "code-keyword", text: "new" },
    { text: " " },
    { className: "code-function", text: "UnseenClient" },
    { text: "({" },
  ],
  [
    { text: "  apiKey: " },
    { className: "code-function", text: "process" },
    { text: ".env." },
    { className: "code-function", text: "UNSEEN_API_KEY" },
    { text: "!," },
  ],
  [
    { text: "  network: " },
    { className: "code-string", text: "'mainnet'" },
    { text: "," },
  ],
  [{ text: "});" }],
  [{ text: "" }],
  [
    {
      className: "code-comment",
      text: "// Paid API access: create a session, return checkout (e.g. after HTTP 402)",
    },
  ],
  [
    { className: "code-keyword", text: "const" },
    { text: " " },
    { className: "code-function", text: "payment" },
    { text: " = " },
    { className: "code-keyword", text: "await" },
    { text: " unseen.payments." },
    { className: "code-function", text: "create" },
    { text: "({" },
  ],
  [
    { text: "  amount: " },
    { className: "code-number", text: "100_000_000" },
    { text: "," },
  ],
  [
    { text: "  reference: " },
    { className: "code-string", text: "`api_${requestId}`" },
    { text: "," },
  ],
  [
    { text: "  description: " },
    { className: "code-string", text: "'Premium API access'" },
    { text: "," },
  ],
  [{ text: "});" }],
  [{ text: "" }],
  [
    { className: "code-keyword", text: "return" },
    { text: " " },
    { className: "code-function", text: "Response" },
    { text: "." },
    { className: "code-function", text: "redirect" },
    { text: "(payment.checkoutUrl, " },
    { className: "code-number", text: "302" },
    { text: ");" },
  ],
];

/** Product pages that ship with an SDK snippet in the marketing template. */
export type SdkProductSlug = "gateway" | "x402";

export const PRODUCT_CODE_SNIPPETS: Record<SdkProductSlug, CodeToken[][]> = {
  gateway,
  x402,
};

export const PRODUCT_CODE_FILE_LABEL: Record<SdkProductSlug, string> = {
  gateway: "payments.ts",
  x402: "api-route.ts",
};
