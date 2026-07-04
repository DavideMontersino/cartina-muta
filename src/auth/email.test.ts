/**
 * Email module. With no key it logs and resolves via the stub (only when
 * EMAIL_DEV_STUB is on) so local/test flows see the link; with a key it POSTs
 * the expected Resend shape; with neither key nor stub it throws (never fakes
 * a successful send).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { EMAIL_FROM, sendEmail } from "./email";
import type { AuthEnv } from "./env";

const baseEnv: AuthEnv = {
  DB: {} as never,
  BETTER_AUTH_SECRET: "x",
  BETTER_AUTH_URL: "http://localhost",
};

const msg = {
  to: "player@example.com",
  subject: "Il tuo link di accesso a Cartina Muta",
  text: "Tocca per accedere: https://cartina-muta/x",
};

afterEach(() => vi.restoreAllMocks());

describe("sendEmail", () => {
  it("logs via the stub only when EMAIL_DEV_STUB is enabled and no key", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      sendEmail({ ...baseEnv, EMAIL_DEV_STUB: "1" }, msg),
    ).resolves.toBeUndefined();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(spy.mock.calls.flat().join(" ")).toContain("[email:stub]");
  });

  it("throws (never fakes success) when no key and no stub — production safety", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(sendEmail(baseEnv, msg)).rejects.toThrow(/not configured/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("POSTs the Resend shape when a key is present", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    await sendEmail({ ...baseEnv, RESEND_API_KEY: "re_test" }, msg);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer re_test",
    );
    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({
      from: EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
    });
  });

  it("throws when Resend returns a non-2xx response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rejected", { status: 422 }),
    );
    await expect(
      sendEmail({ ...baseEnv, RESEND_API_KEY: "re_test" }, msg),
    ).rejects.toThrow(/Resend 422/);
  });
});
