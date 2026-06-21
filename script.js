function setupForm(formEl) {
  if (!formEl) return;
  var input = formEl.querySelector('input[type="email"]');
  var status = formEl.querySelector(".form-status");
  var emailRow = formEl.querySelector(".email-row");
  var followup = formEl.querySelector(".followup-questions");
  var savedEmail = null;

  formEl.addEventListener("submit", function (event) {
    event.preventDefault();
    var email = input.value.trim();
    if (!email) return;

    status.textContent = "Submitting...";

    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.message === "already registered") {
          status.textContent = "You're already on the list!";
        } else {
          status.textContent = "You're in! We'll reach out when the beta opens.";
        }
        savedEmail = email;
        emailRow.classList.add("done");
        if (followup) {
          followup.hidden = false;
        }
      })
      .catch(function () {
        status.textContent = "Something went wrong. Try again.";
      });
  });

  // Follow-up preferences submission
  if (followup) {
    var submitBtn = followup.querySelector(".followup-submit");
    var followupStatus = followup.querySelector(".followup-status");
    var countrySelect = followup.querySelector("select");
    var checkboxes = followup.querySelectorAll('.market-chip input[type="checkbox"]');

    submitBtn.addEventListener("click", function () {
      var country = countrySelect.value;
      if (!country) {
        followupStatus.textContent = "Please select your country.";
        followupStatus.style.color = "#DC2626";
        return;
      }

      var markets = [];
      checkboxes.forEach(function (cb) {
        if (cb.checked) markets.push(cb.value);
      });

      if (markets.length === 0) {
        followupStatus.textContent = "Please select at least one market.";
        followupStatus.style.color = "#DC2626";
        return;
      }

      submitBtn.disabled = true;
      followupStatus.textContent = "Saving...";
      followupStatus.style.color = "";

      fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: savedEmail,
          country: country,
          markets: markets,
        }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) {
            followupStatus.style.color = "";
            followupStatus.textContent = "Thanks! We'll personalize your experience.";
            submitBtn.style.display = "none";
            countrySelect.disabled = true;
            checkboxes.forEach(function (cb) { cb.disabled = true; });
          } else {
            followupStatus.textContent = data.error || "Something went wrong.";
            followupStatus.style.color = "#DC2626";
            submitBtn.disabled = false;
          }
        })
        .catch(function () {
          followupStatus.textContent = "Connection error. Try again.";
          followupStatus.style.color = "#DC2626";
          submitBtn.disabled = false;
        });
    });
  }
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
