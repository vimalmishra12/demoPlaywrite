import fs from "fs";
import path from "path";
import { expect } from "vitest";
import { env } from "../core/utils/env.js"; 
const selectorsPath = path.resolve(process.cwd(), "testResources/selectors/selectors.json");
let selectors = {};
try {
  const all = JSON.parse(fs.readFileSync(selectorsPath, "utf8"));
  selectors = all && all.login ? all.login : {};
} catch (e) {
  console.warn("[login.page] Could not load selectors.json, using built-in defaults.", e.message);
}
const FALLBACK = {
  page_header: 'h2[class="gigya-composite-control gigya-composite-control-header login-heading"]',
  brandLogo: 'img[alt="Cambridge Logo"]',
  userName_tbox: 'input[id^="gigya-loginID-"]',
  password_tbox: 'input[id^="gigya-password-"]',
  loginPassword_eye: 'a[aria-label="Show"]',
  forgotPassword: 'a[title="Forgotten your password?"]',
  login_btn: 'input[value="Log in"], button:has-text("Log in")',
  signup_btn: 'a[title="Don\'t have an account yet?"]',
  cookie_accept_btn: 'a[qid="cookies-2"], button:has-text("Accept All")'
};

selectors = { ...FALLBACK, ...selectors };

export class LoginPage {
  constructor(page) {
    this.page = page;

    this.page_header = selectors.page_header;
    this.brandLogo = selectors.brandLogo;
    this.userName_tbox = selectors.userName_tbox;
    this.password_tbox = selectors.password_tbox;
    this.loginPassword_eye = selectors.loginPassword_eye;
    this.forgotPassword = selectors.forgotPassword;
    this.login_btn = selectors.login_btn;
    this.signup_btn = selectors.signup_btn;
    this.cookie_accept_btn = selectors.cookie_accept_btn;
  }

  async goto(urlOrPath) {
    let target = urlOrPath;

    // if no argument passed, prefer env.LOGIN_URL, then env.BASE_URL + LOGIN_PATH, then fallback constant
    if (!target) {
      if (env && env.LOGIN_URL) {
        target = env.LOGIN_URL;
      } else if (env && env.BASE_URL) {
        const loginPath = env.LOGIN_PATH || "/login";
        target = (env.BASE_URL || "").replace(/\/$/, "") + loginPath;
      } else {
        // hard-coded fallback so tests never try to navigate to an invalid relative URL
        target = "https://www.cambridgeone.org/login";
      }
    } else if (typeof target === "string" && target.startsWith("/")) {
      // relative path provided: try to prepend env.BASE_URL, else fallback to Cambridge site
      const base = (env && env.BASE_URL) ? env.BASE_URL.replace(/\/$/, "") : "https://www.cambridgeone.org";
      target = base + target;
    } // else if full URL is provided, use as-is

    console.log("🌍 Navigating to:", target);
    await this.page.goto(target, { waitUntil: "domcontentloaded" });
    const title = await this.page.title();
    console.log("✅ Page title:", title);
    return title;
  }

  async isInitialized() {
    console.log("🔍 Checking if login page loaded...");
    await this.page.waitForLoadState("domcontentloaded");
    const visible = await this.page
      .waitForSelector(this.userName_tbox, { timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    console.log("👀 Username textbox visible:", visible);
    return { pageStatus: visible };
  }

  async acceptCookies() {
    try {
      const visible = await this.page.isVisible(this.cookie_accept_btn);
      if (visible) {
        console.log("🍪 Accepting cookies...");
        await this.page.click(this.cookie_accept_btn);
      }
    } catch (e) {
      console.log("No cookie popup visible.", e?.message || "");
    }
  }

  async login_Data() {
    const obj = {
      page_header: await this.safeText(this.page_header),
      brandLogo: await this.page.isVisible(this.brandLogo).catch(() => false),
      userName_tbox: await this.page.getAttribute(this.userName_tbox, "placeholder").catch(() => null),
      password_tbox: await this.page.getAttribute(this.password_tbox, "placeholder").catch(() => null),
      forgotPassword: await this.safeText(this.forgotPassword),
      login_btn: await this.safeText(this.login_btn),
      signup_btn: await this.safeText(this.signup_btn),
    };
    console.log("🧾 login_Data:", obj);
    return obj;
  }

  async safeText(selector) {
    try {
      return await this.page.textContent(selector);
    } catch {
      return null;
    }
  }

  async set_userName_tbox(value) {
    console.log("👤 Entering username:", value);
    await this.page.waitForSelector(this.userName_tbox, { timeout: 10000 });
    await this.page.fill(this.userName_tbox, value);
    const typed = await this.page.inputValue(this.userName_tbox);
    expect(typed).toBe(value);
    console.log("✅ Username entered successfully.");
    return true;
  }

  async set_password_tbox(value) {
    console.log("🔐 Entering password...");
    await this.page.waitForSelector(this.password_tbox, { timeout: 10000 });
    await this.page.fill(this.password_tbox, value);
    const typed = await this.page.inputValue(this.password_tbox);
    expect(typed).toBe(value);
    console.log("✅ Password entered successfully.");
    return true;
  }

  async click_loginPassword_eye() {
    console.log("👁️ Clicking password eye...");
    const exists = await this.page.isVisible(this.loginPassword_eye);
    if (exists) {
      await this.page.click(this.loginPassword_eye);
      console.log("✅ Password eye clicked.");
    } else {
      console.log("⚠️ Password eye icon not found.");
    }
    return exists;
  }

  async click_forgotPassword() {
    console.log("🔗 Clicking forgot password...");
    const clicked = await this.page.click(this.forgotPassword).catch(() => false);
    await this.page.waitForLoadState("load").catch(() => {});
    const currentUrl = this.page.url();
    console.log("➡️ Redirected to:", currentUrl);
    return { pageStatus: clicked && /reset|forgot|password/i.test(currentUrl) };
  }

  async click_login_btn() {
    console.log("🔘 Clicking login button...");
    await this.page.waitForSelector(this.login_btn, { timeout: 10000 });
    await this.page.click(this.login_btn);

    await Promise.race([
      this.page.waitForURL(/dashboard|home|library|app/i, { timeout: 60000 }),
      this.page.waitForSelector("header, .dashboard, .main-content", { timeout: 60000 }),
    ]).catch(() => console.warn("⚠️ Dashboard URL or element not detected yet."));

    const url = this.page.url();
    console.log("➡️ After login URL:", url);
    return { pageStatus: !/login/i.test(url) };
  }

  async click_signup_btn() {
    console.log("📝 Clicking signup button...");
    await this.page.waitForSelector(this.signup_btn, { timeout: 10000 });
    await this.page.click(this.signup_btn);
    await this.page.waitForLoadState("load").catch(() => {});
    const url = this.page.url();
    console.log("➡️ Redirected to:", url);
    return { pageStatus: /signup/i.test(url) };
  }
}
