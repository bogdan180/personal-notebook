class Note {
    constructor(title, text, date, tags) {
        this.id = crypto.randomUUID();
        this.title = title;
        this.text = text;
        this.date = date;
        this.tags = tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag !== "");
    }
}

class NotebookManager {
    constructor() {
        this.notes = [];
    }

    add(note) {
        this.notes.push(note);
    }

    save() {
        const data = JSON.stringify(this.notes);
        localStorage.setItem("notebook-notes", data);
    }

    search(query) {
        const escapedQuery = query
            .trim()
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const pattern = new RegExp(escapedQuery, "i");

        return this.notes.filter((note) => {
            return pattern.test(note.title) || pattern.test(note.text);
        });
    }

    getTags() {
        const tags = this.notes.flatMap((note) => note.tags);

        return [...new Set(tags)].sort((a, b) => a.localeCompare(b, "uk"));
    }

    filterByTag(notes, tag) {
        if (tag === null) {
            return notes;
        }

        return notes.filter((note) => note.tags.includes(tag));
    }

    sortByDate(notes, order) {
        return [...notes].sort((a, b) => {
            if (order === "oldest") {
                return a.date.localeCompare(b.date);
            }

            return b.date.localeCompare(a.date);
        });
    }

    load() {
        const data = localStorage.getItem("notebook-notes");

        if (data === null) {
            return;
        }

        try {
            const savedNotes = JSON.parse(data);

            this.notes = savedNotes.map((item) => {
                const note = new Note(
                    item.title,
                    item.text,
                    item.date,
                    item.tags.join(",")
                );

                note.id = item.id;

                return note;
            });
        } catch (error) {
            console.error("Не вдалося прочитати збережені нотатки:", error);
        }
    }

    update(id, title, text, date, tags) {
        const note = this.notes.find((note) => note.id === id);

        if (!note) {
            return;
        }

        note.title = title;
        note.text = text;
        note.date = date;
        note.tags = tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag !== "");
    }
    
    remove(id) {
        this.notes = this.notes.filter((note) => note.id !== id);
    }
}

const notebook = new NotebookManager();

const noteForm = document.querySelector("#note-form");

const submitButton = noteForm.querySelector('button[type="submit"]');
let editingId = null;

const notesList = document.querySelector("#notes-list");

const searchInput = document.querySelector("#note-search");

function highlightMatches(element, text, query) {
    element.textContent = "";

    const trimmedQuery = query.trim();

    if (trimmedQuery === "") {
        element.textContent = text;
        return;
    }

    const escapedQuery = trimmedQuery.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

    const pattern = new RegExp(escapedQuery, "gi");

    let lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
        const beforeMatch = text.slice(lastIndex, match.index);
        element.append(document.createTextNode(beforeMatch));

        const mark = document.createElement("mark");
        mark.textContent = match[0];
        element.append(mark);

        lastIndex = match.index + match[0].length;
    }

    element.append(document.createTextNode(text.slice(lastIndex)));
}

const tagFilters = document.querySelector("#tag-filters");
let selectedTag = null;

function renderTagFilters() {
    const tags = notebook.getTags();

    if (selectedTag !== null && !tags.includes(selectedTag)) {
        selectedTag = null;
    }

    tagFilters.replaceChildren();

    const options = [null, ...tags];

    options.forEach((tag) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tag-filter";
        button.dataset.tag = tag ?? "";
        button.textContent = tag === null ? "Усі теги" : "#" + tag;

        const isActive = tag === selectedTag;

        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));

        tagFilters.append(button);
    });
}

const sortSelect = document.querySelector("#note-sort");

function renderNotes() {
    renderTagFilters();
    notesList.replaceChildren();

    const foundNotes = notebook.search(searchInput.value);
    const filteredNotes = notebook.filterByTag(foundNotes, selectedTag);
    const visibleNotes = notebook.sortByDate(
        filteredNotes,
        sortSelect.value
    );

    if (visibleNotes.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-message";

    if (notebook.notes.length === 0) {
            message.textContent = "Нотаток ще немає. Додай першу через форму.";
        } else {
            message.textContent =
                "Нічого не знайдено. Зміни пошуковий запит або вибери інший тег.";
        }

        notesList.append(message);

        return;
    }

    visibleNotes.forEach((note) => {
        const card = document.createElement("article");
        card.className = "note-card";
        card.dataset.id = note.id;

        const title = document.createElement("h3");
        highlightMatches(title, note.title, searchInput.value);

        const date = document.createElement("time");
        date.dateTime = note.date;
        date.textContent = note.date;

        const text = document.createElement("p");
        text.className = "note-text";
        highlightMatches(text, note.text, searchInput.value);

        const tags = document.createElement("p");
        tags.className = "note-tags";
        tags.textContent = note.tags
            .map((tag) => "#" + tag)
            .join(" ");

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "edit-btn";
        editButton.textContent = "Редагувати";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Видалити";

        const actions = document.createElement("div");
        actions.className = "note-actions";
        actions.append(editButton, deleteButton);

        card.append(title, date, text, tags, actions);
        notesList.append(card);
    });
}

const noteText = document.querySelector("#note-text");
const textCounter = document.querySelector("#text-counter");

function updateTextCounter() {
    const length = noteText.value.length;
    const limit = noteText.maxLength;

    textCounter.textContent = `${length} / ${limit} символів`;

    textCounter.classList.toggle(
        "counter-warning",
        length >= limit * 0.9
    );
}

noteText.addEventListener("input", updateTextCounter);

function validateForm(title, text, date, tags) {
    const checks = [
        {
            selector: "#note-title",
            valid: /^[^\r\n]{3,100}$/u.test(title),
            message: "Заголовок має містити від 3 до 100 символів."
        },
        {
            selector: "#note-text",
            valid: /^[\s\S]{1,1000}$/u.test(text),
            message: "Текст має містити від 1 до 1000 символів."
        },
        {
            selector: "#note-date",
            valid: /^\d{4}-\d{2}-\d{2}$/.test(date),
            message: "Вибери дату в календарі."
        },
        {
            selector: "#note-tags",
            valid: tags === "" ||
                /^[\p{L}\p{N}_-]+(?:\s*,\s*[\p{L}\p{N}_-]+)*$/u.test(tags),
            message: "Теги вводь через кому, без пробілів усередині тегів."
        }
    ];

    const errors = [];

    checks.forEach((check) => {
        const field = document.querySelector(check.selector);

        field.classList.toggle("invalid", !check.valid);
        field.setAttribute("aria-invalid", String(!check.valid));

        if (!check.valid) {
            errors.push(check.message);
        }
    });

    document.querySelector("#form-error").textContent = errors.join(" ");

    return errors.length === 0;
}

noteForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = document.querySelector("#note-title").value.trim();
    const text = document.querySelector("#note-text").value.trim();
    const date = document.querySelector("#note-date").value;
    const tags = document.querySelector("#note-tags").value.trim();

    if (!validateForm(title, text, date, tags)) {
        return;
    }

    if (editingId === null) {
        const note = new Note(title, text, date, tags);
        notebook.add(note);
    } else {
        notebook.update(editingId, title, text, date, tags);
    }

    notebook.save();
    renderNotes();

    editingId = null;
    noteForm.reset();
    updateTextCounter();
    submitButton.textContent = "Додати нотатку";
});

notesList.addEventListener("click", (event) => {
    const button = event.target.closest(".edit-btn, .delete-btn");

    if (!button) {
        return;
    }

    const card = button.closest(".note-card");
    const id = card.dataset.id;

    if (button.classList.contains("edit-btn")) {
        const note = notebook.notes.find((note) => note.id === id);

        if (!note) {
            return;
        }

        document.querySelector("#note-title").value = note.title;
        document.querySelector("#note-text").value = note.text;
        updateTextCounter();
        document.querySelector("#note-date").value = note.date;
        document.querySelector("#note-tags").value = note.tags.join(", ");

        editingId = id;
        submitButton.textContent = "Зберегти зміни";

        document.querySelector("#note-title").focus();

        return;
    }

    const confirmed = confirm("Видалити цю нотатку?");

    if (!confirmed) {
        return;
    }

    notebook.remove(id);

    if (editingId === id) {
        editingId = null;
        noteForm.reset();
        updateTextCounter();
        submitButton.textContent = "Додати нотатку";
    }

    notebook.save();
    renderNotes();
});

tagFilters.addEventListener("click", (event) => {
    const button = event.target.closest(".tag-filter");

    if (!button) {
        return;
    }

    selectedTag = button.dataset.tag || null;

    renderNotes();
});

sortSelect.addEventListener("change", renderNotes);

searchInput.addEventListener("input", renderNotes);

notebook.load();
renderNotes();