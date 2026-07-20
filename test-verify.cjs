const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  console.log("=== 1. LOGIN FAILURE — wrong password ===");
  await page.goto("http://localhost:8081/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.fill('input[id="email"]', "malekbensalabensalah@gmail.com");
  await page.fill('input[id="password"]', "definitelywrongpassword");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "verify-1-login-fail.png", fullPage: true });
  const errToast = await page.locator("[data-sonner-toast]");
  const errToastCount = await errToast.count();
  console.log("Error toast count:", errToastCount);
  if (errToastCount > 0) {
    const toastText = await errToast.first().textContent();
    console.log("Error toast text:", toastText);
  }
  const errBanner = await page.locator("text=Invalid").count();
  console.log("Error banner (invalid):", errBanner);

  console.log("\n=== 2. LOGIN SUCCESS ===");
  await page.fill('input[id="email"]', "");
  await page.fill('input[id="password"]', "");
  await page.fill('input[id="email"]', "malekbensalabensalah@gmail.com");
  await page.fill('input[id="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: "verify-2a-login-success-toast.png", fullPage: true });
  const successToastCount = await page.locator("[data-sonner-toast]").count();
  console.log("Success toast count:", successToastCount);
  if (successToastCount > 0) {
    const t = await page.locator("[data-sonner-toast]").first().textContent();
    console.log("Toast text:", t);
  }
  // Check for completion animation
  const svgCount = await page.locator('svg[viewBox="0 0 24 24"]').count();
  console.log("Checkmark SVGs on page:", svgCount);
  const welcomeText = await page.locator("text=Welcome back").count();
  console.log('"Welcome back" text visible:', welcomeText);
  const redirectingText = await page.locator("text=Redirecting").count();
  console.log('"Redirecting" text visible:', redirectingText);
  // Wait for navigation to dashboard
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "verify-2b-dashboard.png", fullPage: true });
  console.log("Current URL after login:", page.url());

  console.log("\n=== 3. CALENDAR — appointment text ===");
  await page.goto("http://localhost:8081/dashboard/calendar", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  // Navigate back one week to see appointments (July 11-17)
  const prevBtn = page
    .locator("button")
    .filter({ has: page.locator(".alt-arrow-left, svg") })
    .first();
  // Use the SVG icon approach - find buttons with AltArrowLeft icon
  // Actually, look for the nav buttons. The prev button has AltArrowLeft icon
  const prevBtns = page.locator("button:has(svg)");
  const prevCount = await prevBtns.count();
  console.log("Found", prevCount, "buttons with SVGs");
  // Take screenshot first to see current state
  await page.screenshot({ path: "verify-3a-calendar-initial.png", fullPage: true });
  // Click the left arrow button (first button with AltArrowLeft)
  const leftArrow = page.locator("button").filter({ hasText: "" }).first();
  // Try clicking the very first icon button (navigation previous)
  const allButtons = page.locator("button");
  const btnCount = await allButtons.count();
  for (let i = 0; i < btnCount; i++) {
    const html = await allButtons.nth(i).innerHTML();
    if (html.includes("AltArrowLeft") || html.includes("svg")) {
      console.log("Button", i, ":", html.slice(0, 100));
    }
  }
  // Click the AltArrowLeft button (first icon button in toolbar)
  const iconBtns = page.locator('button[class*="h-8 w-8"]');
  const iconCount = await iconBtns.count();
  console.log("Icon buttons (h-8 w-8):", iconCount);
  if (iconCount >= 1) {
    await iconBtns.first().click();
    await page.waitForTimeout(500);
    // Click again to go back far enough for July 13 data
    await iconBtns.first().click();
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "verify-3b-calendar-navigated.png", fullPage: true });
  // Now check for appointment text
  const custText = await page.locator("text=Emma").count();
  console.log('Customer name "Emma" visible:', custText);
  const serviceText = await page.locator("text=Consultation").count();
  console.log('Service "Consultation" visible:', serviceText);

  console.log("\n=== 4. SIDEBAR TOGGLE ===");
  const collapseBtn = page.locator('button[title="Collapse sidebar"]');
  if (await collapseBtn.isVisible()) {
    console.log("Collapse button visible");
    await collapseBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "verify-4a-sidebar-collapsed.png", fullPage: true });
    console.log("Clicked collapse");
  }
  const expandBtn = page.locator('button[title="Expand sidebar"]');
  if (await expandBtn.isVisible()) {
    console.log("Expand button visible");
    await expandBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "verify-4b-sidebar-expanded.png", fullPage: true });
    console.log("Clicked expand");
  }

  console.log("\n=== 5. SIGNOUT ===");
  // Log out via the user menu button at the bottom of sidebar
  // The sidebar user area has a button with Logout icon
  await page.goto("http://localhost:8081/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  // Find the logout button in the sidebar (it contains the user name and Logout icon)
  const sidebarButtons = page.locator("aside button");
  const sbCount = await sidebarButtons.count();
  console.log("Sidebar buttons:", sbCount);
  // The last button in the sidebar is the logout/user button
  if (sbCount > 0) {
    await sidebarButtons.last().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "verify-5-logout.png", fullPage: true });
    console.log("Current URL after logout:", page.url());
  }

  console.log("\n=== DONE ===");
  await browser.close();
})();
