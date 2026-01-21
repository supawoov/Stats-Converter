// Minimal client script to parse uploaded JSON files and render stat tables.
// Supports drag/drop or file input, up to 3 files.

const fileInput = document.getElementById('fileInput');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const tablesEl = document.getElementById('tables');
const dropArea = document.getElementById('dropArea');
const dropToggle = document.getElementById('dropAreaToggle');

let selectedFiles = [];

fileInput.addEventListener('change', e => {
  selectedFiles = Array.from(e.target.files).slice(0,3);
});

dropToggle.addEventListener('click', () => {
  dropArea.classList.toggle('hidden');
});

dropArea.addEventListener('dragover', e => {
  e.preventDefault();
  dropArea.style.borderColor = '#7aa64a';
});
dropArea.addEventListener('dragleave', e => {
  e.preventDefault();
  dropArea.style.borderColor = '#d1d5db';
});
dropArea.addEventListener('drop', e => {
  e.preventDefault();
  dropArea.style.borderColor = '#d1d5db';
  const dtFiles = Array.from(e.dataTransfer.files).filter(f => f.type === '' || f.name.endsWith('.json'));
  if(!dtFiles.length) return alert('Please drop JSON files.');
  selectedFiles = dtFiles.slice(0,3);
  fileInput.files = createFileList(selectedFiles);
});

convertBtn.addEventListener('click', convert);
clearBtn.addEventListener('click', () => {
  tablesEl.innerHTML = '';
  selectedFiles = [];
  fileInput.value = '';
});

function createFileList(files){
  // helper to set input.files programmatically
  const dataTransfer = new DataTransfer();
  files.forEach(f => dataTransfer.items.add(f));
  return dataTransfer.files;
}

function convert(){
  const files = selectedFiles.length ? selectedFiles.slice(0,3) : Array.from(fileInput.files).slice(0,3);
  if(!files.length) return alert('Select up to 3 JSON files');
  tablesEl.innerHTML = '';
  let gameCounter = 1;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      try{
        const json = JSON.parse(e.target.result);
        appendGameTitle(gameCounter++);
        renderTeam('Blue', json.players || []);
        renderTeam('Red', json.players || []);
      }catch(err){
        const errMsg = document.createElement('div');
        errMsg.textContent = `Error parsing ${file.name}: ${err.message}`;
        errMsg.style.color = 'crimson';
        tablesEl.appendChild(errMsg);
      }
    };
    reader.readAsText(file);
  });
}

function appendGameTitle(n){
  const h2 = document.createElement('h2');
  h2.textContent = `Game ${n}`;
  tablesEl.appendChild(h2);
}

function renderTeam(team, players){
  const skaters = players.filter(p => p.team === team && p.position !== 'G');
  const goalie = players.find(p => p.team === team && p.position === 'G');
  buildSkaters(`${team} Skaters`, skaters, team);
  if(goalie) buildGoalie(`${team} Goalie`, goalie, team);
}

function sum(data, key){
  return data.reduce((t,p)=>t + (Number(p?.[key]) || 0), 0);
}

function buildSkaters(title, data, team){
  if(!data.length) return;
  const cls = team === 'Blue' ? 'blue' : 'red';

  const container = document.createElement('div');

  const actions = document.createElement('div');
  actions.className = 'table-actions';
  const copyBtn = document.createElement('button');
  copyBtn.className = 'small-btn';
  copyBtn.textContent = 'Copy table';
  const csvBtn = document.createElement('button');
  csvBtn.className = 'small-btn';
  csvBtn.textContent = 'Export CSV';

  actions.appendChild(copyBtn);
  actions.appendChild(csvBtn);
  container.appendChild(actions);

  const h3 = document.createElement('h3');
  h3.textContent = title;
  container.appendChild(h3);

  const table = document.createElement('table');
  table.className = cls;

  const header = document.createElement('tr');
  header.innerHTML = `<th>Name</th><th>Pos</th><th>G</th><th>A</th><th>SOG</th><th>Pass</th>
    <th>Ex</th><th>Ent</th><th>TO</th><th>TK</th><th>Touches</th><th>TOI</th><th>+/-</th>`;
  table.appendChild(header);

  data.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(p.name||'')}</td>
      <td>${escapeHtml(p.position||'')}</td>
      <td>${num(p.goals)}</td><td>${num(p.assists)}</td><td>${num(p.sog)}</td>
      <td>${num(p.passes)}</td><td>${num(p.exits)}</td><td>${num(p.entries)}</td>
      <td>${num(p.turnovers)}</td><td>${num(p.takeaways)}</td><td>${num(p.puckTouches)}</td>
      <td>${p.timeOnIce ?? ''}</td><td>${p.plusMinus ?? ''}</td>`;
    table.appendChild(tr);
  });

  const totals = document.createElement('tr');
  totals.className = 'totals';
  totals.innerHTML = `<td>TEAM TOTALS</td><td></td>
    <td>${sum(data,'goals')}</td><td>${sum(data,'assists')}</td><td>${sum(data,'sog')}</td>
    <td>${sum(data,'passes')}</td><td>${sum(data,'exits')}</td><td>${sum(data,'entries')}</td>
    <td>${sum(data,'turnovers')}</td><td>${sum(data,'takeaways')}</td>
    <td>${sum(data,'puckTouches')}</td><td>${sum(data,'timeOnIce')}</td><td>${sum(data,'plusMinus')}</td>`;
  table.appendChild(totals);

  container.appendChild(table);
  tablesEl.appendChild(container);

  copyBtn.addEventListener('click', () => copyTableToClipboard(table));
  csvBtn.addEventListener('click', () => {
    const csv = tableToCSV(table);
    downloadCSV(csv, `${title.replace(/\s+/g,'_')}.csv`);
  });
}

function buildGoalie(title, g, team){
  const cls = team === 'Blue' ? 'blue' : 'red';
  const container = document.createElement('div');

  const actions = document.createElement('div');
  actions.className = 'table-actions';
  const copyBtn = document.createElement('button');
  copyBtn.className = 'small-btn';
  copyBtn.textContent = 'Copy table';
  const csvBtn = document.createElement('button');
  csvBtn.className = 'small-btn';
  csvBtn.textContent = 'Export CSV';
  actions.appendChild(copyBtn);
  actions.appendChild(csvBtn);
  container.appendChild(actions);

  const h3 = document.createElement('h3');
  h3.textContent = title;
  container.appendChild(h3);

  const table = document.createElement('table');
  table.className = cls;
  const header = document.createElement('tr');
  header.innerHTML = `<th>Name</th><th>Shots</th><th>Saves</th><th>GA</th><th>SV%</th>`;
  table.appendChild(header);

  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${escapeHtml(g.name||'')}</td>
    <td>${num(g.shotsFaced)}</td><td>${num(g.saves)}</td><td>${num(g.goalsAllowed)}</td>
    <td>${g.saveperc!=null ? (Number(g.saveperc)*100).toFixed(1) : ''}</td>`;
  table.appendChild(tr);

  container.appendChild(table);
  tablesEl.appendChild(container);

  copyBtn.addEventListener('click', () => copyTableToClipboard(table));
  csvBtn.addEventListener('click', () => {
    const csv = tableToCSV(table);
    downloadCSV(csv, `${title.replace(/\s+/g,'_')}.csv`);
  });
}

// small helpers
function num(v){ return v==null || v==='' ? '' : Number(v); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function copyTableToClipboard(table){
  try{
    // Use range selection to copy table contents as text
    const range = document.createRange();
    range.selectNode(table);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('copy');
    sel.removeAllRanges();
    alert('Table copied to clipboard (paste into Excel).');
  }catch(e){
    alert('Copy failed: ' + e.message);
  }
}

function tableToCSV(table){
  const rows = Array.from(table.querySelectorAll('tr'));
  return rows.map(r => {
    const cols = Array.from(r.querySelectorAll('th,td'));
    return cols.map(c => {
      // escape quotes
      let txt = c.textContent.trim();
      if(txt.includes('"') || txt.includes(',') || txt.includes('\n')){
        txt = '"' + txt.replace(/"/g,'""') + '"';
      }
      return txt;
    }).join(',');
  }).join('\n');
}

function downloadCSV(csv, filename){
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}