(() => {
  const target = document.querySelector("[data-service-status]");
  if (!target) return;
  fetch("/api/status")
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((data) => { target.textContent = data.status === "success" ? "STATUS / ONLINE" : "STATUS / CHECK"; })
    .catch(() => { target.textContent = "STATUS / OFFLINE"; });
})();
