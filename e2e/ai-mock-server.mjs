/**
 * Stand-in for the Anthropic API during e2e runs. The app's Anthropic SDK is
 * pointed here with ANTHROPIC_BASE_URL, so no application code changes.
 *
 * `messages.parse()` (structured outputs) is just a normal Messages response
 * whose single text block contains the JSON string; the SDK JSON-parses and
 * zod-validates it client side. We look at the system prompt to decide which
 * canned payload to return.
 *
 * Streaming (`messages.stream`, used by document generation) is not implemented
 * because no e2e spec generates a document. Such a request returns 501.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.E2E_AI_MOCK_PORT ?? 54321);

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

function commentIdsFrom(body) {
  const text = body?.messages?.map((m) => m.content).join("\n") ?? "";
  return [...text.matchAll(/^ID:\s*(.+)$/gm)].map((match) => match[1].trim());
}

function cannedPayload(body) {
  const system = String(body?.system ?? "");

  if (system.includes("actioning a batch of comments")) {
    const ids = commentIdsFrom(body);
    return {
      summary: "Actioned the queued comments in one revision.",
      responses: ids.map((id) => ({
        comment_id: id,
        reply: "Tightened this passage and made the ask concrete.",
      })),
      revised_document:
        "# Investor update\n\n" +
        "This quarter the team shipped the editor and the new onboarding flow.\n\n" +
        "Revenue is early but growing, and we are asking three warm intros for the next round.\n",
    };
  }

  if (system.includes("dated task for a day-by-day planner")) {
    const text = body?.messages?.map((m) => m.content).join("\n") ?? "";
    const today = /Current date: (\d{4}-\d{2}-\d{2})/.exec(text)?.[1];
    const entry = /<entry>\n([\s\S]*?)\n<\/entry>/.exec(text)?.[1] ?? "";
    const date = new Date(`${today}T12:00:00Z`);
    if (/tomorrow/i.test(entry)) date.setUTCDate(date.getUTCDate() + 1);
    return {
      date: /someday/i.test(entry) ? null : date.toISOString().slice(0, 10),
      time: /3pm/i.test(entry) ? "15:00" : null,
      task: entry.replace(/\b(tomorrow|3pm|someday)\b/gi, "").trim(),
      clarification: /someday/i.test(entry) ? "Which day do you mean?" : null,
    };
  }

  if (system.includes("planning coach")) {
    return { feedback: "A light day: book the dentist slot first, then batch the rest." };
  }

  // Planning follow-up questions.
  return {
    questions: [
      { order: 1, question: "Who is the primary reader of this document?" },
      { order: 2, question: "What decision should it help them make?" },
      { order: 3, question: "What is the single most important point?" },
    ],
  };
}

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url?.startsWith("/v1/messages")) {
    const body = await readBody(req);

    if (body?.stream) {
      res.writeHead(501, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "e2e AI mock: streaming not implemented" }));
      return;
    }

    const payload = cannedPayload(body);
    res.writeHead(200, {
      "content-type": "application/json",
      "request-id": "req_e2e_mock",
    });
    res.end(
      JSON.stringify({
        id: "msg_e2e_mock",
        type: "message",
        role: "assistant",
        model: body?.model ?? "claude-sonnet-5",
        stop_reason: "end_turn",
        stop_sequence: null,
        content: [{ type: "text", text: JSON.stringify(payload) }],
        usage: {
          input_tokens: 400,
          output_tokens: 120,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      }),
    );
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`e2e AI mock listening on http://127.0.0.1:${PORT}`);
});
