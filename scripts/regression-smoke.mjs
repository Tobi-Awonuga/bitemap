const BASE_URL = process.env.QA_API_URL ?? "http://localhost:4000";

async function runCheck(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    return true;
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function expectStatus(path, init, expectedStatus) {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (res.status !== expectedStatus) {
    const body = await res.text().catch(() => "");
    throw new Error(`Expected ${expectedStatus}, got ${res.status}. Body: ${body}`);
  }
}

async function expectHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (res.status !== 200) {
    throw new Error(`Expected 200, got ${res.status}`);
  }
  const body = await res.json().catch(() => null);
  if (!body || body.status !== "ok") {
    throw new Error("Health payload must contain { status: 'ok' }");
  }
}

async function main() {
  console.log(`Running regression smoke checks against ${BASE_URL}`);

  const checks = await Promise.all([
    runCheck("health endpoint", expectHealth),
    runCheck("login validation rejects malformed payload", () =>
      expectStatus(
        "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "invalid" }),
        },
        400,
      ),
    ),
    runCheck("forgot-password validation rejects malformed payload", () =>
      expectStatus(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "invalid" }),
        },
        400,
      ),
    ),
    runCheck("protected endpoint rejects missing token", () =>
      expectStatus("/api/users/me", { method: "GET" }, 401),
    ),
  ]);

  if (checks.every(Boolean)) {
    console.log("Regression smoke checks passed.");
    return;
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error("Smoke runner failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
