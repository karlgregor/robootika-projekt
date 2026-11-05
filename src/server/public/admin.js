const $ = (selector) => document.querySelector(selector);
let settings;
async function api(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}
function notice(message) { $('#notice').textContent = message; }
function input(type, value, label) {
  const element = document.createElement('input'); element.type = type;
  if (type === 'checkbox') element.checked = value; else element.value = value;
  element.setAttribute('aria-label', label); return element;
}
function render() {
  $('#assistant-context').value = settings.context || '';
  $('#ai-enabled').checked = settings.aiEnabled;
  $('#questions-enabled').checked = settings.questionsEnabled;
  $('#log-transcripts').checked = settings.logTranscripts;
  $('#commands').replaceChildren();
  settings.commands.forEach((command) => {
    const row = document.createElement('div'); row.className = 'command-row';
    const enabled = input('checkbox', command.enabled, `Enable ${command.command}`);
    enabled.onchange = () => { command.enabled = enabled.checked; };
    const name = document.createElement('code'); name.textContent = command.command;
    const description = input('text', command.description, `${command.command} description`);
    description.maxLength = 500; description.required = true;
    description.oninput = () => { command.description = description.value; };
    row.append(enabled, name, description); $('#commands').append(row);
  });
  $('#rules').replaceChildren();
  settings.rules.forEach((rule, index) => {
    const row = document.createElement('div'); row.className = 'rule';
    const enabled = input('checkbox', rule.enabled, 'Enable phrase rule');
    enabled.onchange = () => { rule.enabled = enabled.checked; };
    const mode = document.createElement('select'); mode.setAttribute('aria-label', 'Rule matching');
    for (const [value, label] of [['semantic', 'Meaning / hint (AI)'], ['exact', 'Exact phrase']]) {
      const option = document.createElement('option'); option.value = value; option.textContent = label; mode.append(option);
    }
    mode.value = rule.matchMode || 'exact'; mode.onchange = () => { rule.matchMode = mode.value; };
    const phrase = input('text', rule.phrase, 'Meaning or phrase'); phrase.placeholder = 'e.g. The user hints that the room feels stuffy'; phrase.required = true; phrase.maxLength = 1000;
    phrase.oninput = () => { rule.phrase = phrase.value; };
    const command = document.createElement('select'); command.setAttribute('aria-label', 'Action');
    [...settings.commands.map((c) => c.command), 'NONE'].forEach((value) => {
      const option = document.createElement('option'); option.value = value; option.textContent = value; command.append(option);
    });
    command.value = rule.command; command.onchange = () => { rule.command = command.value; };
    const reply = input('text', rule.replyText, 'Assistant reply'); reply.placeholder = 'Assistant says…'; reply.required = true; reply.maxLength = 1000;
    reply.oninput = () => { rule.replyText = reply.value; };
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove';
    remove.onclick = () => { settings.rules.splice(index, 1); render(); };
    row.append(enabled, mode, phrase, command, reply, remove); $('#rules').append(row);
  });
}
async function load() { settings = await api('/api/v1/admin/settings'); render(); }
async function refreshLogs() {
  const logs = await api('/api/v1/admin/logs');
  const nodes = logs.map((entry) => { const pre = document.createElement('pre'); pre.textContent = JSON.stringify(entry, null, 2); return pre; });
  $('#logs').replaceChildren(...nodes);
  if (!nodes.length) $('#logs').textContent = 'No activity yet.';
}
$('#settings-form').onsubmit = async (event) => {
  event.preventDefault(); $('#save').disabled = true;
  settings.aiEnabled = $('#ai-enabled').checked;
  settings.questionsEnabled = $('#questions-enabled').checked;
  settings.logTranscripts = $('#log-transcripts').checked;
  try {
    settings = await api('/api/v1/admin/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(settings) });
    render(); notice('Saved. Settings are active.'); await refreshLogs();
  } catch (error) { notice(error.message); } finally { $('#save').disabled = false; }
};
for (const [selector, key] of [['#ai-enabled', 'aiEnabled'], ['#questions-enabled', 'questionsEnabled'], ['#log-transcripts', 'logTranscripts']]) {
  $(selector).onchange = () => { settings[key] = $(selector).checked; };
}
$('#assistant-context').oninput = () => { settings.context = $('#assistant-context').value; };
$('#add-rule').onclick = () => { settings.rules.push({ phrase: '', command: 'NONE', replyText: '', enabled: true, matchMode: 'semantic' }); render(); notice('Unsaved changes.'); };
$('#reload').onclick = () => { load().then(() => notice('Saved settings loaded.')).catch((e) => notice(e.message)); };
$('#refresh').onclick = () => { refreshLogs().catch((e) => notice(e.message)); };
$('#clear').onclick = async () => { try { await api('/api/v1/admin/logs', { method: 'DELETE' }); await refreshLogs(); } catch (e) { notice(e.message); } };
$('#try-form').onsubmit = async (event) => {
  event.preventDefault(); $('#try-result').textContent = 'Processing…';
  try {
    const result = await api('/api/v1/interpret-text', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: $('#try-text').value }) });
    $('#try-result').textContent = JSON.stringify(result, null, 2); await refreshLogs();
  } catch (e) { $('#try-result').textContent = e.message; }
};
Promise.all([load(), refreshLogs()]).catch((e) => notice(e.message));
setInterval(() => { if ($('#auto-refresh').checked) refreshLogs().catch((e) => notice(e.message)); }, 3000);
