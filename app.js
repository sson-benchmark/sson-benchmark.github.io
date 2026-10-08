(function () {
  "use strict";
  const data = window.SSON_DATA;
  const config = window.SSON_CONFIG || { links: {} };
  if (!data) return;
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  document.querySelectorAll("[data-resource]").forEach((link) => {
    const url = String((config.links || {})[link.dataset.resource] || "").trim();
    let valid = false;
    try { valid = Boolean(url) && ["https:", "http:", "file:"].includes(new URL(url, window.location.href).protocol); } catch (_) { valid = false; }
    if (valid) {
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      link.setAttribute("aria-disabled", "false");
      const status = link.querySelector(".release-status");
      if (status) { if (link.classList.contains("resource-tile")) status.textContent = "Open resource ↗"; else status.remove(); }
    } else {
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("title", "This resource link will be added when it is released.");
    }
  });

  let exampleIndex = 0;
  let selected = null;
  let revealed = false;
  const letters = ["A", "B", "C", "D"];
  const answerPanel = document.getElementById("answer-panel");
  const checkButton = document.getElementById("check-answer");
  const revealButton = document.getElementById("reveal-answer");

  function paintChoice() {
    const example = data.examples[exampleIndex];
    document.querySelectorAll(".view-panel").forEach((panel) => {
      const letter = panel.dataset.view;
      panel.classList.toggle("is-correct", revealed && letter === example.answer);
      panel.classList.toggle("is-wrong", revealed && letter === selected && selected !== example.answer);
      const choice = panel.querySelector(".view-choice");
      choice.setAttribute("aria-pressed", String(letter === selected));
      let label = letter === selected ? "Selected " + letter : "Choose " + letter;
      if (revealed && letter === example.answer) label = "Intruder " + letter;
      else if (revealed && letter === selected) label = "Your choice " + letter;
      panel.querySelector(".choice-status").textContent = label;
    });
  }

  function showExample(index) {
    exampleIndex = (index + data.examples.length) % data.examples.length;
    const example = data.examples[exampleIndex];
    selected = null;
    revealed = false;
    answerPanel.hidden = true;
    answerPanel.innerHTML = "";
    checkButton.disabled = true;
    checkButton.textContent = "Check answer";
    revealButton.hidden = false;
    document.getElementById("selection-message").textContent = "Select A, B, C or D.";
    document.getElementById("example-counter").textContent = "Example " + String(exampleIndex + 1).padStart(2, "0") + " / 06";
    document.getElementById("example-title").textContent = example.title;
    document.querySelectorAll("[data-example]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.example === example.id)));
    document.querySelectorAll(".view-choice img").forEach((img, i) => {
      img.src = example.images[i];
      img.alt = "View " + letters[i] + " of the " + example.category.toLowerCase() + " example";
    });
    paintChoice();
  }

  function showAnswer() {
    const example = data.examples[exampleIndex];
    revealed = true;
    const title = selected === null ? "The inconsistent view is " + example.answer + "." : selected === example.answer ? "Correct. The intruder is " + example.answer + "." : "The intruder is " + example.answer + ".";
    answerPanel.innerHTML = "<h4>" + escapeHTML(title) + "</h4><p>" + escapeHTML(example.explanation) + "</p><ul>" + example.evidence.map((e) => "<li>" + escapeHTML(e) + "</li>").join("") + "</ul>";
    answerPanel.hidden = false;
    checkButton.disabled = true;
    checkButton.textContent = "Explanation shown";
    revealButton.hidden = true;
    document.getElementById("selection-message").textContent = selected ? "Your selection was " + selected + "." : "Answer revealed without a selection.";
    paintChoice();
  }

  document.querySelectorAll("[data-example]").forEach((button) => button.addEventListener("click", () => showExample(data.examples.findIndex((e) => e.id === button.dataset.example))));
  document.querySelectorAll("[data-choice]").forEach((button) => button.addEventListener("click", () => {
    if (revealed) return;
    selected = button.dataset.choice;
    checkButton.disabled = false;
    document.getElementById("selection-message").textContent = "View " + selected + " selected.";
    paintChoice();
  }));
  checkButton.addEventListener("click", () => { if (selected) showAnswer(); });
  revealButton.addEventListener("click", showAnswer);
  document.getElementById("previous-example").addEventListener("click", () => showExample(exampleIndex - 1));
  document.getElementById("next-example").addEventListener("click", () => showExample(exampleIndex + 1));

  const dialog = document.getElementById("image-dialog");
  document.querySelectorAll("[data-enlarge]").forEach((button) => button.addEventListener("click", () => {
    const example = data.examples[exampleIndex];
    const letter = button.dataset.enlarge;
    const url = example.images[letters.indexOf(letter)];
    if (typeof dialog.showModal !== "function") { window.open(url, "_blank", "noopener"); return; }
    document.getElementById("dialog-label").textContent = example.category + " · View " + letter;
    const img = document.getElementById("dialog-image");
    img.src = url;
    img.alt = "Enlarged view " + letter + " of the " + example.category.toLowerCase() + " example";
    dialog.showModal();
  }));
  document.getElementById("close-dialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });

  let metric = "acc";
  let sortKey = 0;
  let sortDirection = -1;
  function renderResults() {
    const sorted = data.models.slice().sort((a, b) => {
      if (sortKey === "name") return sortDirection * a.name.localeCompare(b.name);
      return sortDirection * (a[metric][sortKey] - b[metric][sortKey]);
    });
    const best = data.categories.map((_, i) => Math.max(...data.models.map((m) => m[metric][i])));
    document.getElementById("results-body").innerHTML = sorted.map((model) => "<tr><th scope=\"row\">" + escapeHTML(model.name) + "</th>" + model[metric].map((value, i) => "<td class=\"" + (i === 0 ? "overall " : "") + (value === best[i] ? "best" : "") + "\">" + value.toFixed(2) + "</td>").join("") + "</tr>").join("");
    const ref = document.getElementById("results-reference");
    if (metric === "acc") ref.innerHTML = "<tr><th scope=\"row\">Human</th>" + data.human.map((v) => "<td>" + v.toFixed(2) + "</td>").join("") + "</tr><tr><th scope=\"row\">Random choice</th>" + data.categories.map(() => "<td>25.00</td>").join("") + "</tr>";
    else ref.innerHTML = "<tr><th scope=\"row\">Human</th><td colspan=\"7\">True solve was not measured for human participants</td></tr>";
    document.querySelectorAll("[data-sort]").forEach((button) => {
      const key = button.dataset.sort === "name" ? "name" : Number(button.dataset.sort);
      const active = key === sortKey;
      button.parentElement.setAttribute("aria-sort", active ? (sortDirection === -1 ? "descending" : "ascending") : "none");
      button.querySelector("span").textContent = active ? (sortDirection === -1 ? "↓" : "↑") : "↕";
    });
    document.getElementById("metric-definition").textContent = metric === "acc" ? "Answer accuracy is the percentage of questions with the correct final choice." : "True solve is the percentage of all questions answered correctly with factual, sufficient stated evidence.";
  }
  document.querySelectorAll("[data-metric]").forEach((button) => button.addEventListener("click", () => {
    metric = button.dataset.metric;
    document.querySelectorAll("[data-metric]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    renderResults();
  }));
  document.querySelectorAll("[data-sort]").forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.sort === "name" ? "name" : Number(button.dataset.sort);
    sortDirection = key === sortKey ? -sortDirection : (key === "name" ? 1 : -1);
    sortKey = key;
    renderResults();
  }));

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) document.querySelectorAll(".nav-wrap nav a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id));
    }), { rootMargin: "-15% 0px -65% 0px", threshold: 0 });
    document.querySelectorAll("main section[id]").forEach((section) => observer.observe(section));
  }
  renderResults();
  showExample(0);
})();
