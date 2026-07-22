<script lang="ts">
  import { settings, saveSettingsChecked, setTicketMessage } from "../lib/settings.svelte";
  import { prepareLogo } from "../lib/image";
  import { buildTicketHtml, type TicketData } from "../lib/ticket";
  import { t } from "../lib/i18n.svelte";

  let { onclose }: { onclose: () => void } = $props();

  // Work on a draft; commit to settings only on Save.
  let studioName = $state(settings.studioName);
  let ticketNote = $state(settings.ticketNote);
  let ticketMessage = $state(settings.ticketMessage);
  let logoTop = $state(settings.logoTop);
  let logoBottom = $state(settings.logoBottom);
  let sizeWarn = $state("");

  // Shrink on the way in rather than refusing big files: a logo only prints a
  // couple of centimetres wide, and a multi-megabyte data URI inside
  // settings.json is what made these vanish in the first place.
  async function readImage(file: File | undefined, set: (v: string) => void): Promise<void> {
    if (!file) return;
    sizeWarn = "";
    const prepared = await prepareLogo(file);
    if (!prepared) {
      sizeWarn = t.customizeTicket.imageUnreadable;
      return;
    }
    if (prepared.bytes > 1_500_000) {
      sizeWarn = t.customizeTicket.imageTooLarge;
      return;
    }
    set(prepared.dataUri);
  }

  const previewData = $derived<TicketData>({
    studioName: studioName || t.customizeTicket.workshopNamePlaceholder,
    logoTop: logoTop || undefined,
    logoBottom: logoBottom || undefined,
    note: ticketNote || undefined,
    client: t.customizeTicket.previewClient,
    date: "17 July 2026",
    firingType: "High Reduction",
    firingTotal: "100,00 €",
    sharePct: 0.47,
    shape: "cylinder",
    extras: [],
    lines: [
      { label: "High Reduction", value: "46,51 €" },
      { label: t.ticket.total, value: "47,00 €", strong: true },
    ],
    total: "47,00 €",
    thanks: t.ticket.defaultThanks(studioName || "…"),
  });
  const previewHtml = $derived(buildTicketHtml(previewData));
  const msgIsDefault = $derived(!ticketMessage.trim());
  const msgPreview = $derived(
    (ticketMessage.trim() ? ticketMessage : t.ticket.defaultMessageTemplate)
      .replace(/\{client\}/g, t.customizeTicket.previewClient)
      .replace(/\{total\}/g, "47,00 €"),
  );

  let saveError = $state("");
  async function save(): Promise<void> {
    settings.studioName = studioName.trim() || "My Studio";
    settings.ticketNote = ticketNote;
    setTicketMessage(ticketMessage);
    settings.logoTop = logoTop;
    settings.logoBottom = logoBottom;
    // Wait for the write and only close if it landed. Closing on a failed save
    // is what hid this: everything looked right until the next restart.
    if (await saveSettingsChecked()) onclose();
    else saveError = t.customizeTicket.saveFailed;
  }
</script>

<div class="scrim" role="presentation" onclick={onclose}></div>
<div class="panel" role="dialog" aria-label={t.customizeTicket.ariaLabel}>
  <!-- Left: the form -->
  <section class="form">
    <div class="fhead">
      <h2>{t.customizeTicket.title}</h2>
      <p class="faint">{t.customizeTicket.subtitle}</p>
    </div>

    <label class="field">
      <span class="fl">{t.customizeTicket.workshopName}</span>
      <input bind:value={studioName} placeholder={t.customizeTicket.workshopNamePlaceholder} />
      <span class="hint">{t.customizeTicket.workshopNameHint}</span>
    </label>

    <div class="field">
      <span class="fl">{t.customizeTicket.logoTop}</span>
      <div class="logo">
        {#if logoTop}
          <img class="thumb" src={logoTop} alt="Top logo" />
          <button class="link" onclick={() => (logoTop = "")}>{t.customizeTicket.remove}</button>
        {:else}
          <label class="upload">
            {t.customizeTicket.upload}
            <input type="file" accept="image/*" onchange={(e) => readImage(e.currentTarget.files?.[0], (v) => (logoTop = v))} />
          </label>
          <span class="hint">{t.customizeTicket.logoTopHint}</span>
        {/if}
      </div>
    </div>

    <div class="field">
      <span class="fl">{t.customizeTicket.logoBottom}</span>
      <div class="logo">
        {#if logoBottom}
          <img class="thumb" src={logoBottom} alt="Footer logo" />
          <button class="link" onclick={() => (logoBottom = "")}>{t.customizeTicket.remove}</button>
        {:else}
          <label class="upload">
            {t.customizeTicket.upload}
            <input type="file" accept="image/*" onchange={(e) => readImage(e.currentTarget.files?.[0], (v) => (logoBottom = v))} />
          </label>
          <span class="hint">{t.customizeTicket.logoBottomHint}</span>
        {/if}
      </div>
    </div>

    <label class="field">
      <span class="fl">{t.customizeTicket.noteLabel}</span>
      <textarea class="msg" rows="3" bind:value={ticketNote} placeholder={t.customizeTicket.notePlaceholder}></textarea>
      <span class="hint">{t.customizeTicket.noteHint}</span>
    </label>

    <label class="field">
      <span class="fl">{t.customizeTicket.messageLabel}</span>
      <textarea class="msg" rows="3" bind:value={ticketMessage} placeholder={t.ticket.defaultMessageTemplate}></textarea>
      <span class="hint">{@html t.customizeTicket.messageHint("{client}", "{total}")}</span>
      <span class="hint">{msgIsDefault ? t.customizeTicket.messageFollowsLanguage : t.customizeTicket.messageCustomized}</span>
      <span class="msgprev">“{msgPreview}”</span>
    </label>

    {#if sizeWarn}<span class="warn">{sizeWarn}</span>{/if}
    {#if saveError}<span class="warn">{saveError}</span>{/if}

    <div class="actions">
      <button class="save" onclick={save}>{t.customizeTicket.save}</button>
      <button class="cancel" onclick={onclose}>{t.customizeTicket.cancel}</button>
    </div>
  </section>

  <!-- Right: live ticket preview -->
  <section class="preview">
    <span class="plabel">{t.customizeTicket.livePreview}</span>
    <div class="pframe"><iframe class="tframe" srcdoc={previewHtml} title="Ticket preview"></iframe></div>
  </section>

  <button class="close" onclick={onclose} aria-label={t.common.close}>×</button>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 50;
  }
  .panel {
    position: fixed;
    inset: 4vh 5vw;
    z-index: 51;
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 18px;
    overflow: hidden;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 26px 28px;
    overflow-y: auto;
    min-height: 0;
  }
  .fhead h2 {
    margin: 0 0 4px;
    font-size: 19px;
    font-weight: 600;
  }
  .fhead p {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    max-width: 60ch;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .fl {
    font-size: 12px;
    color: var(--text-dim);
  }
  input,
  .msg {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 11px;
    color: var(--text);
    font: inherit;
    font-size: 14px;
    width: 100%;
  }
  .msg {
    font-size: 13px;
    resize: vertical;
    line-height: 1.5;
  }
  input:focus,
  .msg:focus {
    outline: none;
    border-color: var(--text-faint);
  }
  .hint {
    font-size: 11px;
    color: var(--text-faint);
    line-height: 1.5;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .thumb {
    max-width: 140px;
    max-height: 54px;
    object-fit: contain;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 5px 8px;
  }
  .upload {
    display: inline-flex;
    align-items: center;
    background: var(--panel-2);
    border: 1px dashed color-mix(in srgb, var(--accent) 35%, var(--line));
    border-radius: 8px;
    padding: 8px 14px;
    color: var(--text-dim);
    font-size: 13px;
    cursor: pointer;
  }
  .upload:hover {
    border-color: var(--accent);
    color: var(--text);
  }
  .upload input {
    display: none;
  }
  .link {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 12px;
    text-decoration: underline;
    cursor: pointer;
  }
  .link:hover {
    color: #e88;
  }
  .msgprev {
    font-size: 12px;
    color: var(--text-faint);
    font-style: italic;
    line-height: 1.5;
  }
  .warn {
    font-size: 11.5px;
    color: var(--amber);
  }
  .actions {
    display: flex;
    gap: 10px;
    margin-top: 4px;
  }
  .save {
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: 9px;
    padding: 10px 22px;
    font-size: 14px;
    font-weight: 600;
  }
  .save:hover {
    opacity: 0.9;
  }
  .cancel {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 9px;
    padding: 10px 18px;
    color: var(--text-dim);
    font-size: 14px;
  }
  .cancel:hover {
    color: var(--text);
    border-color: var(--text-faint);
  }
  .preview {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
    padding: 26px;
    background: var(--panel-2);
    border-left: 1px solid var(--line);
    overflow-y: auto;
    min-height: 0;
  }
  .plabel {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-weight: 600;
    align-self: flex-start;
  }
  .pframe {
    width: 520px;
    max-width: 100%;
    height: 736px;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    flex-shrink: 0;
  }
  .tframe {
    width: 794px;
    height: 1123px;
    border: none;
    transform: scale(0.655);
    transform-origin: top left;
  }
  .close {
    position: absolute;
    top: 12px;
    right: 16px;
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 22px;
    line-height: 1;
    padding: 4px 8px;
  }
  .close:hover {
    color: var(--text);
  }
  @media (max-width: 820px) {
    .panel {
      grid-template-columns: 1fr;
    }
    .preview {
      display: none;
    }
  }
</style>
