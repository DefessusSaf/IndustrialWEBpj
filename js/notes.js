(() => {
  const container = document.querySelector("[data-notes]");
  const form = document.querySelector("[data-note-form]");
  const status = document.querySelector("[data-note-status]");
  const submit = form?.querySelector("button[type=submit]");
  const cancel = form?.querySelector("[data-cancel-edit]");
  let editingId = null;
  let currentUser = null;
  if (!container || !form) return;

  async function request(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Ошибка запроса.");
    return data;
  }

  function report(text, isError = false) {
    status.textContent = text;
    status.classList.toggle("is-error", isError);
  }

  function resetForm() {
    form.reset();
    editingId = null;
    submit.textContent = "Опубликовать заметку ↗";
    cancel.hidden = true;
  }

  function createNote(note) {
    const article = document.createElement("article");
    article.className = "listener-note";
    const meta = document.createElement("p");
    meta.className = "note-meta";
    meta.textContent = `NOTE / ${String(note.id).padStart(3, "0")} · ${note.author}`;
    const title = document.createElement("h3");
    title.textContent = note.title;
    const description = document.createElement("p");
    description.textContent = note.description || "Без дополнительного описания.";
    article.append(meta, title, description);
    if (currentUser && Number(note.author_id) === Number(currentUser.id)) {
      const actions = document.createElement("div");
      actions.className = "note-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Редактировать";
      edit.addEventListener("click", () => {
        editingId = note.id;
        form.elements.title.value = note.title;
        form.elements.description.value = note.description;
        submit.textContent = "Сохранить изменения ↗";
        cancel.hidden = false;
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        form.elements.title.focus();
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "danger-button";
      remove.textContent = "Удалить";
      remove.addEventListener("click", async () => {
        if (!window.confirm("Удалить эту заметку?")) return;
        try {
          const result = await request(`/api/notes/${note.id}`, { method: "DELETE" });
          report(result.message);
          await loadNotes();
        } catch (error) {
          report(error.message, true);
        }
      });
      actions.append(edit, remove);
      article.append(actions);
    }
    return article;
  }

  async function loadNotes() {
    try {
      const notes = await request("/api/notes");
      container.replaceChildren();
      if (!notes.length) {
        const empty = document.createElement("p");
        empty.className = "notes-empty";
        empty.textContent = "Заметок пока нет. Возможно, первая будет вашей.";
        container.append(empty);
        return;
      }
      notes.forEach((note) => container.append(createNote(note)));
    } catch (error) {
      report(error.message, true);
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = { title: form.elements.title.value, description: form.elements.description.value };
    try {
      const result = await request(editingId ? `/api/notes/${editingId}` : "/api/notes", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      report(editingId ? "Изменения сохранены." : "Заметка опубликована.");
      resetForm();
      await loadNotes();
      return result;
    } catch (error) {
      report(error.message, true);
    }
  });

  cancel.addEventListener("click", resetForm);
  request("/api/me").then((user) => { currentUser = user; }).catch(() => { currentUser = null; }).finally(loadNotes);
})();
