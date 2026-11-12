(() => {
  const forms = document.querySelectorAll("[data-auth-form]");
  const message = document.querySelector("[data-auth-message]");
  const profile = document.querySelector("[data-profile]");
  const guest = document.querySelector("[data-guest]");
  const logoutButton = document.querySelector("[data-logout]");
  if (!forms.length) return;

  async function request(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Ошибка запроса.");
    return data;
  }

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
  }

  async function showProfile() {
    try {
      const user = await request("/api/me");
      guest.hidden = true;
      profile.hidden = false;
      profile.querySelector("[data-profile-name]").textContent = user.name;
      profile.querySelector("[data-profile-email]").textContent = user.email;
    } catch {
      guest.hidden = false;
      profile.hidden = true;
    }
  }

  forms.forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    try {
      const result = await request(form.dataset.authForm, { method: "POST", body: JSON.stringify(values) });
      showMessage(result.message);
      if (form.dataset.authForm === "/api/login") {
        form.reset();
        await showProfile();
      }
    } catch (error) {
      showMessage(error.message, true);
    }
  }));

  logoutButton?.addEventListener("click", async () => {
    try {
      const result = await request("/api/logout", { method: "POST", body: "{}" });
      showMessage(result.message);
      await showProfile();
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  showProfile();
})();
