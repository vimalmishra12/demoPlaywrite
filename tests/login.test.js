// tests/login.test.js
import { test, expect, describe, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { chromium } from "playwright";
import { LoginPage } from "../pages/login.page.js";
import { getJsonData } from "../core/utils/jsonUtils.js";
import { env } from "../core/utils/env.js";

const BASE_LOGIN_URL = env?.LOGIN_URL || "https://www.cambridgeone.org/login";

describe("Validation of Login Page (all tests)", () => {
  let browser;
  let context;
  let page;
  let loginPage;

  beforeAll(async () => {
    console.log("[beforeAll] launching browser (HEADLESS=", env?.HEADLESS, ")");
    browser = await chromium.launch({ headless: env?.HEADLESS ?? false });
  });

  afterAll(async () => {
    console.log("[afterAll] closing browser");
    await browser?.close();
  });

  // create a fresh context+page for each test (keeps tests isolated)
  beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
    loginPage = new LoginPage(page);
  });

  afterEach(async () => {
    await context.close();
  });

  // Keep UI identity test
  test("TST_IDEN_TC_2 — Validate Login Page UI", async () => {
    console.log("[TST_IDEN_TC_2] start");
    await loginPage.goto(BASE_LOGIN_URL);
    await loginPage.acceptCookies();
    const init = await loginPage.isInitialized();
    expect(init.pageStatus).toBe(true);

    const uiData = await loginPage.login_Data();
    console.log("[TST_IDEN_TC_2] uiData:", uiData);

    expect(uiData.page_header).not.toBeNull();
    const loginBtnValue = await page.getAttribute(loginPage.login_btn, "value").catch(() => null);
    const loginBtnText = (await page.textContent(loginPage.login_btn).catch(() => "")).trim();
    expect(Boolean(loginBtnValue || loginBtnText)).toBeTruthy();
    expect(Boolean(uiData.signup_btn)).toBeTruthy();
    console.log("[TST_IDEN_TC_2] done");
  });

  // ====== COMBINED FLOW: username -> password -> login (no relaunch) ======
  test("TST_LOGIN_FLOW — Enter username, password and login (single flow)", async () => {
    console.log("[TST_LOGIN_FLOW] start (single flow, no page reload between steps)");

    const data = getJsonData(
      "./testResources/testcaseData/ExperienceApp/production/logindata.json",
      "C1.login.user.validStudent1"
    );

    // navigate once
    await loginPage.goto(BASE_LOGIN_URL);
    await loginPage.acceptCookies();

    // sanity check
    const init = await loginPage.isInitialized();
    expect(init.pageStatus).toBe(true);

    // enter username then password without navigating again
    await loginPage.set_userName_tbox(data.email);
    await loginPage.set_password_tbox(data.password);

    // click login and assert dashboard
    const res = await loginPage.click_login_btn();
    expect(res.pageStatus).toBe(true);

    const currentUrl = page.url();
    expect(/dashboard|home|library|app/i.test(currentUrl)).toBeTruthy();

    console.log("[TST_LOGIN_FLOW] done (url)", currentUrl);
  }, 120000);

  // TST_LOGI_TC_6 — Click on Sign-Up button (isolated test)
  test("TST_LOGI_TC_6 — Click on Sign-Up button", async () => {
    console.log("[TST_LOGI_TC_6] start (fresh context ensures logged out)");
    await loginPage.goto(BASE_LOGIN_URL);
    await loginPage.acceptCookies();

    await page.waitForSelector(loginPage.signup_btn, { timeout: 15000 });
    const result = await loginPage.click_signup_btn();

    // accept either navigation to signup url or presence of signup form elements
    const navigated = result?.pageStatus === true || /signup/i.test(page.url());
    let hasSignupForm = false;
    try {
      await Promise.race([
        page.waitForSelector("input[type='email']", { timeout: 7000 }),
        page.waitForSelector("input[name='email']", { timeout: 7000 }),
        page.waitForSelector("text=Create account", { timeout: 7000 }),
        page.waitForSelector("text=Sign up", { timeout: 7000 })
      ]);
      hasSignupForm = true;
    } catch {
      hasSignupForm = false;
    }

    console.log("[TST_LOGI_TC_6] navigated:", navigated, "hasSignupForm:", hasSignupForm, "url:", page.url());
    expect(navigated || hasSignupForm).toBeTruthy();
    console.log("[TST_LOGI_TC_6] done");
  }, 60000);

  // TST_LOGI_TC_4 — Click Forgot Password link (isolated test)
  test("TST_LOGI_TC_4 — Click Forgot Password link", async () => {
    console.log("[TST_LOGI_TC_4] start (fresh context ensures logged out)");
    await loginPage.goto(BASE_LOGIN_URL);
    await loginPage.acceptCookies();

    await page.waitForSelector(loginPage.forgotPassword, { timeout: 15000 });
    const result = await loginPage.click_forgotPassword();

    if (result && result.pageStatus) {
      expect(result.pageStatus).toBe(true);
      expect(/reset|forgot|password/i.test(page.url())).toBeTruthy();
      console.log("[TST_LOGI_TC_4] done via pageStatus/url:", page.url());
      return;
    }

    let forgotDetected = false;
    try {
      await Promise.race([
        page.waitForSelector("input[type='email']", { timeout: 7000 }),
        page.waitForSelector("input[name='email']", { timeout: 7000 }),
        page.waitForSelector("text=Reset password", { timeout: 7000 }),
        page.waitForSelector("text=Forgotten your password?", { timeout: 7000 })
      ]);
      forgotDetected = true;
    } catch {
      forgotDetected = false;
    }

    console.log("[TST_LOGI_TC_4] page.url:", page.url(), "forgotDetected:", forgotDetected);
    expect(forgotDetected || /reset|forgot|password/i.test(page.url())).toBeTruthy();
    console.log("[TST_LOGI_TC_4] done (fallback)");
  }, 60000);
});
