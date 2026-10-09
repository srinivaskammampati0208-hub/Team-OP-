const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const ROOT = __dirname;
const DAILY_API_BASE = "https://api.daily.co/v1";
const ROOM_DURATION_SECONDS = 60 * 60;
const MAX_REQUESTS_PER_MINUTE = 5;
const doctors = new Map([
  ["sample-1", "Dr. Sample One"],
  ["sample-2", "Dr. Sample Two"],
  ["sample-3", "Dr. Sample Three"],
]);
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
]);

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024) {
      const error = new Error("Request body is too large.");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Send a valid JSON request.");
    error.status = 400;
    throw error;
  }
}

async function dailyRequest(fetchImpl, apiKey, endpoint, body) {
  const response = await fetchImpl(`${DAILY_API_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The video provider returned an unreadable response.");
  }
  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? `The video provider could not create the call (${response.status}): ${result.error}`
        : `The video provider could not create the call (${response.status}).`
    );
  }
  return result;
}

function createServer({
  apiKey = process.env.DAILY_API_KEY,
  fetchImpl = fetch,
} = {}) {
  const requestTimes = new Map();

  return http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, "http://localhost");

    if (request.method === "POST" && requestUrl.pathname === "/api/calls") {
      const origin = request.headers.origin;
      if (origin) {
        try {
          if (new URL(origin).host !== request.headers.host) {
            sendJson(response, 403, { detail: "Cross-origin requests are not allowed." });
            return;
          }
        } catch {
          sendJson(response, 403, { detail: "The request origin is invalid." });
          return;
        }
      }
      if (!request.headers["content-type"]?.startsWith("application/json")) {
        sendJson(response, 415, { detail: "Content-Type must be application/json." });
        return;
      }

      const now = Date.now();
      const clientAddress = request.socket.remoteAddress || "unknown";
      const recentRequests = (requestTimes.get(clientAddress) || []).filter(
        (time) => now - time < 60_000
      );
      if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
        sendJson(response, 429, { detail: "Too many call requests. Try again in a minute." });
        return;
      }
      recentRequests.push(now);
      requestTimes.set(clientAddress, recentRequests);

      try {
        const body = await readJsonBody(request);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          sendJson(response, 400, { detail: "Send a JSON object with a selected demo clinician." });
          return;
        }
        const doctorName = doctors.get(body.doctor_id);
        if (!doctorName) {
          sendJson(response, 400, { detail: "Select a valid demo clinician." });
          return;
        }
        if (!apiKey) {
          sendJson(response, 503, {
            detail: "Video calls are not configured. Set DAILY_API_KEY on the server.",
          });
          return;
        }

        const expiresAt = Math.floor(now / 1000) + ROOM_DURATION_SECONDS;
        const room = await dailyRequest(fetchImpl, apiKey, "rooms", {
          privacy: "private",
          properties: {
            exp: expiresAt,
            max_participants: 2,
            eject_at_room_exp: true,
          },
        });
        if (typeof room.name !== "string" || typeof room.url !== "string") {
          throw new Error("The video provider returned invalid room details.");
        }

        const createMeetingToken = (name, isOwner) =>
          dailyRequest(fetchImpl, apiKey, "meeting-tokens", {
            properties: {
              room_name: room.name,
              exp: expiresAt,
              user_id: crypto.randomUUID(),
              user_name: name,
              is_owner: isOwner,
            },
          });
        const [patientToken, clinicianToken] = await Promise.all([
          createMeetingToken("HealAI patient", false),
          createMeetingToken("Invited clinician", true),
        ]);
        if (
          typeof patientToken.token !== "string" ||
          typeof clinicianToken.token !== "string"
        ) {
          throw new Error("The video provider returned invalid meeting tokens.");
        }

        const patientUrl = new URL(room.url);
        const clinicianInviteUrl = new URL(room.url);
        patientUrl.searchParams.set("t", patientToken.token);
        clinicianInviteUrl.searchParams.set("t", clinicianToken.token);
        sendJson(response, 201, {
          doctor_name: doctorName,
          patient_url: patientUrl.toString(),
          doctor_invite_url: clinicianInviteUrl.toString(),
        });
      } catch (error) {
        sendJson(response, error.status || 502, {
          detail: error.message || "Could not create the video room.",
        });
      }
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 404, { detail: "Not found." });
      return;
    }

    let filePath;
    try {
      const pathname = decodeURIComponent(requestUrl.pathname);
      const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
      filePath = path.resolve(ROOT, relativePath);
    } catch {
      response.writeHead(400);
      response.end("Bad request.");
      return;
    }

    if (path.dirname(filePath) !== ROOT || !mimeTypes.has(path.extname(filePath))) {
      response.writeHead(404);
      response.end("Not found.");
      return;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500);
        response.end(error.code === "ENOENT" ? "Not found." : "Unable to read file.");
        return;
      }
      response.writeHead(200, {
        "Content-Type": mimeTypes.get(path.extname(filePath)),
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      });
      response.end(request.method === "HEAD" ? undefined : content);
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8000);
  createServer().listen(port, "127.0.0.1", () => {
    console.log(`HealAI is available at http://127.0.0.1:${port}`);
  });
}

module.exports = { createServer };
