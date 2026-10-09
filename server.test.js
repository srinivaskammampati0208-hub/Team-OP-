const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { createServer } = require("./server");

let server;
let baseUrl;

before(async () => {
  server = createServer({
    apiKey: "test-key",
    fetchImpl: async (url, options) => {
      const endpoint = new URL(url).pathname;
      assert.equal(options.headers.Authorization, "Bearer test-key");
      if (endpoint.endsWith("/rooms")) {
        const roomProperties = JSON.parse(options.body);
        assert.equal(roomProperties.privacy, "private");
        assert.equal(roomProperties.properties.max_participants, 2);
        return Response.json({ name: "private-room", url: "https://healai.daily.co/private-room" });
      }
      assert.equal(endpoint.endsWith("/meeting-tokens"), true);
      const tokenProperties = JSON.parse(options.body).properties;
      assert.equal(tokenProperties.room_name, "private-room");
      assert.ok(tokenProperties.exp > Math.floor(Date.now() / 1000));
      return Response.json({
        token: tokenProperties.is_owner ? "clinician-token" : "patient-token",
      });
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
});

test("creates separate private-room links for the patient and invited clinician", async () => {
  const response = await fetch(`${baseUrl}/api/calls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doctor_id: "sample-1" }),
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.doctor_name, "Dr. Sample One");
  assert.equal(new URL(body.patient_url).searchParams.get("t"), "patient-token");
  assert.equal(new URL(body.doctor_invite_url).searchParams.get("t"), "clinician-token");
});

test("rejects unrecognized demo profiles", async () => {
  const response = await fetch(`${baseUrl}/api/calls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doctor_id: "unknown" }),
  });

  assert.equal(response.status, 400);
});

test("rejects non-object request bodies", async () => {
  const response = await fetch(`${baseUrl}/api/calls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "null",
  });

  assert.equal(response.status, 400);
});

test("reports when the video provider key is not configured", async () => {
  const unconfiguredServer = createServer({
    apiKey: "",
    fetchImpl: async () => {
      throw new Error("The provider should not be contacted without a key.");
    },
  });
  await new Promise((resolve) =>
    unconfiguredServer.listen(0, "127.0.0.1", resolve)
  );

  try {
    const response = await fetch(
      `http://127.0.0.1:${unconfiguredServer.address().port}/api/calls`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: "sample-1" }),
      }
    );
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.match(body.detail, /DAILY_API_KEY/);
  } finally {
    await new Promise((resolve, reject) =>
      unconfiguredServer.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("serves the application from the same origin", async () => {
  const response = await fetch(baseUrl);

  assert.equal(response.status, 200);
  assert.match(await response.text(), /Video call/);
});
