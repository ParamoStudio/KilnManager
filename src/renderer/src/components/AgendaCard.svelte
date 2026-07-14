<script lang="ts">
  import {
    app,
    contacts,
    addContactFull,
    updateContact,
    deleteContact,
    assignSelectionTo,
    type Contact,
  } from "../lib/firing.svelte";

  let { onclose }: { onclose: () => void } = $props();

  const forAssign = app.agendaAddFor === "assign";
  let sel = $state<string | "new" | null>(forAssign ? "new" : (contacts.list[0]?.id ?? "new"));
  let confirmDel = $state(false);

  const editing = $derived(sel && sel !== "new" ? contacts.list.find((c) => c.id === sel) : null);

  // Form fields (mirror the selected contact, or blank for "new")
  let name = $state("");
  let surname = $state("");
  let phone = $state("");
  let notes = $state("");

  $effect(() => {
    confirmDel = false;
    if (editing) {
      name = editing.name;
      surname = editing.surname ?? "";
      phone = editing.phone ?? "";
      notes = editing.notes ?? "";
    } else {
      name = "";
      surname = "";
      phone = "";
      notes = "";
    }
  });

  function save(): void {
    const n = name.trim();
    if (!n) return;
    if (editing) {
      updateContact(editing.id, { name: n, surname: surname.trim(), phone: phone.trim(), notes: notes.trim() });
    } else {
      const c = addContactFull({ name: n, surname: surname.trim(), phone: phone.trim(), notes: notes.trim() });
      if (app.agendaAddFor === "assign") {
        assignSelectionTo(c.name);
        onclose();
        return;
      }
      sel = c.id;
    }
  }
  function remove(): void {
    if (!editing) return;
    if (!confirmDel) {
      confirmDel = true;
      return;
    }
    const id = editing.id;
    sel = "new";
    deleteContact(id);
  }
  const fullName = (c: Contact): string => (c.surname ? `${c.name} ${c.surname}` : c.name);
</script>

<div class="scrim" role="presentation" onclick={onclose}></div>
<div class="card" role="dialog" aria-label="Agenda">
  <div class="head">
    <h3>Client agenda</h3>
    <button class="x" onclick={onclose} aria-label="Close">×</button>
  </div>

  <div class="body">
    <div class="list">
      <button class="add" class:active={sel === "new"} onclick={() => (sel = "new")}>+ New client</button>
      {#each contacts.list as c (c.id)}
        <button class="item" class:active={sel === c.id} onclick={() => (sel = c.id)}>
          <span class="nm">{fullName(c)}</span>
          {#if c.phone}<span class="faint ph">{c.phone}</span>{/if}
        </button>
      {/each}
      {#if contacts.list.length === 0}
        <p class="faint empty">No clients yet.</p>
      {/if}
    </div>

    <div class="form">
      <label>Name<input bind:value={name} placeholder="First name" /></label>
      <label>Surname<input bind:value={surname} placeholder="Surname" /></label>
      <label>Phone<input bind:value={phone} placeholder="Phone" /></label>
      <label>Notes<textarea bind:value={notes} maxlength="240" rows="3" placeholder="Notes about this client"></textarea></label>

      <div class="actions">
        {#if editing}
          <button class="del" class:confirm={confirmDel} onclick={remove}>{confirmDel ? "Confirm delete" : "Delete"}</button>
        {/if}
        <button class="save" onclick={save} disabled={!name.trim()}>{editing ? "Save" : "Add client"}</button>
      </div>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(3px);
    z-index: 70;
  }
  .card {
    position: fixed;
    z-index: 71;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 620px;
    max-width: 94vw;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 22px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.6);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  h3 {
    font-size: 17px;
    font-weight: 600;
  }
  .x {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 20px;
  }
  .body {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 18px;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 340px;
    overflow-y: auto;
  }
  .add {
    background: var(--panel-2);
    border: 1px dashed color-mix(in srgb, var(--accent) 40%, var(--line));
    border-radius: 8px;
    padding: 9px;
    color: var(--text);
    font-size: 13px;
  }
  .add.active {
    border-style: solid;
    border-color: var(--accent);
  }
  .item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    padding: 9px 11px;
    color: var(--text);
    text-align: left;
  }
  .item.active {
    border-color: var(--text-faint);
  }
  .nm {
    font-size: 13px;
  }
  .ph {
    font-size: 11px;
  }
  .empty {
    font-size: 12px;
    padding: 8px;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
  }
  input,
  textarea {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 11px;
    color: var(--text);
    font: inherit;
    resize: none;
  }
  input:focus,
  textarea:focus {
    outline: none;
    border-color: var(--text-faint);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }
  .del {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 14px;
    color: var(--text-dim);
    font-size: 13px;
    margin-right: auto;
  }
  .del.confirm {
    color: #e88;
    border-color: #e88;
  }
  .save {
    background: var(--accent);
    color: #111;
    border: none;
    border-radius: 8px;
    padding: 9px 18px;
    font-weight: 600;
    font-size: 13px;
  }
  .save:disabled {
    opacity: 0.4;
  }
</style>
