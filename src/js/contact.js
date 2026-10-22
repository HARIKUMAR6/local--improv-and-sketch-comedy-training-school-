/*
 * Contact page behavior (loaded only by contact.html).
 *
 * - Embeds the map only when site.json → contact.mapEmbedUrl holds a Google Maps
 *   or OpenStreetMap embed URL; otherwise no map is shown.
 * - Validates the contact form. There is no backend, so a valid message is
 *   confirmed on the page and the form is cleared; nothing is sent.
 *
 * The [data-contact-method] rows on this page (email, phone, address) are filled
 * in by js/main.js (initContactDetails), which runs first and also covers the
 * same rows in the shared footer on every page.
 */
(function () {
  "use strict";

  /* ---- Map ---------------------------------------------------------------- */

  var MAP_URL = /^https:\/\/(www\.google\.com\/maps\/embed\?|www\.openstreetmap\.org\/export\/embed\.html\?)/;

  function initMap() {
    var frame = document.querySelector("[data-map]");
    if (!frame) return;
    var src = (frame.getAttribute("data-map-src") || "").trim();
    if (!MAP_URL.test(src)) return;

    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = frame.getAttribute("data-map-title") || "Map";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.allowFullscreen = true;
    frame.appendChild(iframe);
    (frame.closest("[data-map-figure]") || frame).hidden = false;

    var fallback = document.querySelector("[data-map-fallback]");
    if (fallback) fallback.hidden = true;
  }

  /* ---- Form --------------------------------------------------------------- */

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var MIN_MESSAGE = 10;

  function check(field) {
    var value = field.value.trim();
    if (field.name === "name" && !value) return "Please enter your name.";
    if (field.name === "email") {
      if (!value) return "Please enter your email address.";
      if (!EMAIL.test(value) || field.validity.typeMismatch) return "Please enter a valid email address, like name@example.com.";
    }
    if (field.name === "topic" && !value) return "Please choose what your message is about.";
    if (field.name === "message") {
      if (!value) return "Please write a message.";
      if (value.length < MIN_MESSAGE) return "Please write a little more (at least " + MIN_MESSAGE + " characters).";
    }
    return "";
  }

  function show(field, message) {
    var error = document.getElementById(field.id + "-error");
    field.setAttribute("aria-invalid", message ? "true" : "false");
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
  }

  function initForm() {
    var form = document.querySelector("[data-contact-form]");
    if (!form) return;
    var fields = Array.prototype.slice.call(form.querySelectorAll("input, select, textarea"));
    var status = document.querySelector("[data-form-status]");
    var statusName = status && status.querySelector("[data-status-name]");
    var attempted = false;

    // After the first submit, errors update as the visitor fixes each field.
    fields.forEach(function (field) {
      field.addEventListener(field.tagName === "SELECT" ? "change" : "input", function () {
        if (status) status.hidden = true;
        if (attempted) show(field, check(field));
      });
      field.addEventListener("blur", function () {
        if (attempted) show(field, check(field));
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      attempted = true;

      var firstInvalid = null;
      fields.forEach(function (field) {
        var message = check(field);
        show(field, message);
        if (message && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      if (statusName) statusName.textContent = form.elements.namedItem("name").value.trim().split(/\s+/)[0];
      form.reset();
      attempted = false;
      fields.forEach(function (field) {
        show(field, "");
      });
      if (status) {
        status.hidden = false;
        status.focus();
      }
    });

    // Topic links elsewhere on the page preselect the enquiry type.
    document.querySelectorAll("[data-enquiry]").forEach(function (link) {
      link.addEventListener("click", function () {
        form.elements.topic.value = link.getAttribute("data-enquiry");
        if (attempted) show(form.elements.topic, check(form.elements.topic));
        window.requestAnimationFrame(function () {
          form.elements.namedItem("name").focus({ preventScroll: true });
        });
      });
    });
  }

  initMap();
  initForm();
})();
