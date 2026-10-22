/*
 * Login portal behavior (loaded only by login.html).
 *
 * - Sign in / Create account tabs (ARIA tabs pattern: arrow keys, Home/End; #register opens
 *   the registration tab).
 * - Password visibility toggles.
 * - Inline validation for both forms.
 *
 * There is no authentication backend. A valid submission only shows a message saying so:
 * nobody is signed in, no account is created, the dashboard is not opened, and nothing
 * (passwords included) is written to localStorage, sessionStorage or cookies.
 */
(() => {
  "use strict";

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PASSWORD_MIN = 8;
  const PASSWORD_MAX = 128;

  /* ---- Tabs ----------------------------------------------------------------- */

  function initTabs() {
    const tabs = [...document.querySelectorAll("[data-auth-tab]")];
    const panels = [...document.querySelectorAll("[data-auth-panel]")];

    function select(name, options = {}) {
      tabs.forEach((tab) => {
        const active = tab.getAttribute("data-auth-tab") === name;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active && options.focus) tab.focus();
      });
      panels.forEach((panel) => {
        panel.hidden = panel.getAttribute("data-auth-panel") !== name;
      });
      // Keep the address shareable (login.html#register) without jumping the page.
      if (options.updateHash) history.replaceState(null, "", name === "register" ? "#register" : location.pathname);
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => select(tab.getAttribute("data-auth-tab"), { updateHash: true }));

      tab.addEventListener("keydown", (event) => {
        const rtl = document.documentElement.dir === "rtl";
        let next = null;
        if (event.key === "ArrowRight") next = index + (rtl ? -1 : 1);
        else if (event.key === "ArrowLeft") next = index + (rtl ? 1 : -1);
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        if (next === null) return;
        event.preventDefault();
        const target = tabs[(next + tabs.length) % tabs.length];
        select(target.getAttribute("data-auth-tab"), { focus: true, updateHash: true });
      });
    });

    if (location.hash === "#register") select("register");
    window.addEventListener("hashchange", () => {
      select(location.hash === "#register" ? "register" : "signin");
    });
  }

  /* ---- Password visibility ---------------------------------------------------- */

  function setVisible(toggle, visible) {
    const input = document.getElementById(toggle.getAttribute("aria-controls"));
    input.type = visible ? "text" : "password";
    toggle.setAttribute("aria-pressed", String(visible));
  }

  function initPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        setVisible(toggle, toggle.getAttribute("aria-pressed") !== "true");
      });
    });
  }

  /* ---- Forgot password: help text only (no recovery service exists) ---------- */

  function initForgot() {
    const toggle = document.querySelector("[data-forgot-toggle]");
    const help = document.querySelector("[data-forgot-help]");
    if (!toggle || !help) return;
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      help.hidden = !open;
    });
  }

  /* ---- Validation ------------------------------------------------------------- */

  function check(field, form) {
    const value = field.type === "password" || field.name === "confirm" ? field.value : field.value.trim();
    switch (field.name) {
      case "name":
        if (!value) return "Please enter your full name.";
        if (value.length < 2) return "Please enter at least 2 characters.";
        return "";
      case "email":
        if (!value) return "Please enter your email address.";
        if (!EMAIL.test(value) || field.validity.typeMismatch) return "Please enter a valid email address, like name@example.com.";
        return "";
      case "password":
        if (!value) return "Please enter your password.";
        if (form.getAttribute("data-auth-form") === "register") {
          if (value.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
          if (value.length > PASSWORD_MAX) return `Use ${PASSWORD_MAX} characters or fewer.`;
        }
        return "";
      case "confirm":
        if (!value) return "Please confirm your password.";
        if (value !== form.elements.namedItem("password").value) return "Passwords don’t match.";
        return "";
      default:
        return "";
    }
  }

  function show(field, message) {
    const error = document.getElementById(`${field.id}-error`);
    field.setAttribute("aria-invalid", message ? "true" : "false");
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
  }

  // Builds the honest result message with DOM nodes (the name the visitor typed is never parsed as HTML).
  function statusMessage(status, heading, text) {
    const link = document.createElement("a");
    link.className = "link";
    link.href = "contact.html";
    link.textContent = "Contact the team";
    const strong = document.createElement("strong");
    strong.textContent = heading;
    const body = document.createElement("p");
    body.append(strong, " ", text, " ");
    body.append(link, " for help with your account or enrolling in a class.");
    status.replaceChildren(body);
    status.hidden = false;
    status.focus();
  }

  function initForm(form) {
    const fields = [...form.querySelectorAll("input:not([type=checkbox])")];
    const status = form.querySelector("[data-auth-status]");
    const isRegister = form.getAttribute("data-auth-form") === "register";
    let attempted = false;

    // After the first submit, errors update as each field is fixed.
    fields.forEach((field) => {
      field.addEventListener("input", () => {
        status.hidden = true;
        if (!attempted) return;
        show(field, check(field, form));
        // Re-check the confirmation when the password it must match changes.
        if (field.name === "password" && form.elements.namedItem("confirm")) {
          const confirm = form.elements.namedItem("confirm");
          if (confirm.value) show(confirm, check(confirm, form));
        }
      });
      field.addEventListener("blur", () => {
        if (attempted) show(field, check(field, form));
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      attempted = true;

      let firstInvalid = null;
      fields.forEach((field) => {
        const message = check(field, form);
        show(field, message);
        if (message && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) {
        status.hidden = true;
        firstInvalid.focus();
        return;
      }

      // Passwords are cleared and hidden again; nothing is stored or sent.
      fields
        .filter((field) => field.name === "password" || field.name === "confirm")
        .forEach((field) => {
          field.value = "";
          field.removeAttribute("aria-invalid");
        });
      form.querySelectorAll("[data-password-toggle]").forEach((toggle) => setVisible(toggle, false));
      attempted = false;

      if (isRegister) {
        statusMessage(
          status,
          "No account has been created.",
          "Online registration isn’t connected to the school’s account system yet."
        );
      } else {
        statusMessage(
          status,
          "You haven’t been signed in.",
          "Online sign-in isn’t connected to the school’s account system yet."
        );
      }
    });
  }

  initTabs();
  initPasswordToggles();
  initForgot();
  document.querySelectorAll("[data-auth-form]").forEach(initForm);
})();
