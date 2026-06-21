function setupForm(formEl) {
  if (!formEl) return;
  var input = formEl.querySelector('input[type="email"]');
  var status = formEl.querySelector(".form-status");
  var countrySelect = formEl.querySelector("select");
  var checkboxes = formEl.querySelectorAll('.market-chip input[type="checkbox"]');

  formEl.addEventListener("submit", function (event) {
    event.preventDefault();
    var email = input.value.trim();
    if (!email) return;

    var country = countrySelect ? countrySelect.value : null;
    if (country === "") country = null;

    var markets = [];
    checkboxes.forEach(function (cb) {
      if (cb.checked) markets.push(cb.value);
    });

    var submitBtn = formEl.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    status.textContent = "Submitting...";

    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, country: country, markets: markets }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.message === "already registered") {
          status.textContent = "You're already on the list!";
        } else {
          status.textContent = "You're in! We'll reach out when the beta opens.";
        }
        submitBtn.disabled = true;
        input.disabled = true;
        if (countrySelect) countrySelect.disabled = true;
        checkboxes.forEach(function (cb) { cb.disabled = true; });
      })
      .catch(function () {
        status.textContent = "Something went wrong. Try again.";
        submitBtn.disabled = false;
      });
  });
}

setupForm(document.querySelector("#hero-form"));
setupForm(document.querySelector("#waitlist .email-form"));

/* ── Chat widget ── */
(function () {
  var form = document.getElementById("chat-form");
  var input = document.getElementById("chat-input");
  var messages = document.getElementById("chat-messages");
  if (!form || !input || !messages) return;

  var history = [];

  function addBubble(text, role) {
    var div = document.createElement("div");
    div.className = "chat-bubble " + role;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;

    addBubble(text, "user");
    history.push({ role: "user", text: text });
    input.value = "";
    input.disabled = true;
    form.querySelector("button").disabled = true;

    var typing = addBubble("Thinking...", "typing");

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: history }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        messages.removeChild(typing);
        var reply = data.reply || data.error || "Sorry, something went wrong.";
        addBubble(reply, "bot");
        history.push({ role: "model", text: reply });
      })
      .catch(function () {
        messages.removeChild(typing);
        addBubble("Connection error. Try again.", "bot");
      })
      .finally(function () {
        input.disabled = false;
        form.querySelector("button").disabled = false;
        input.focus();
      });
  });
})();
