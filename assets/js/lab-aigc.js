/* lab-aigc.js —— 在浏览器里真实读写 PNG AIGC 元数据 + 演示哈希链 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var esc = Lab.escape;
  var GENESIS = '0'.repeat(64);
  var CHAIN_FIELDS = ['request_id', 'ts', 'op', 'actor', 'format', 'result', 'risk_flags', 'file_sha256', 'phash', 'producer_keyed', 'produce_id_keyed', 'label', 'manifest_digest'];
  var AIGC_KEYWORD = [65, 73, 71, 67, 0]; /* "AIGC\0" */

  var state = {
    sourceBytes: null, bytes: null, sourceHash: '', bytesHash: '', labeledHash: '',
    wire: null, manifest: null, lastVerify: null, ledger: [], chainBrokenSeq: null,
    objectUrl: '', variant: 0
  };

  /* ------------------------------------------------------------------ 字节工具 */
  function utf8(s) { return new TextEncoder().encode(s); }
  function decodeUtf8(b) { return new TextDecoder('utf-8').decode(b); }
  function concatBytes() {
    var total = 0, i;
    for (i = 0; i < arguments.length; i++) total += arguments[i].length;
    var out = new Uint8Array(total), off = 0;
    for (i = 0; i < arguments.length; i++) { out.set(arguments[i], off); off += arguments[i].length; }
    return out;
  }
  function tagName(bytes, off) {
    return String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]);
  }
  function isPng(bytes) {
    return bytes && bytes.length > 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  }
  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function makeChunk(type, payload) {
    var typeBytes = utf8(type);
    var body = concatBytes(typeBytes, payload);
    var out = new Uint8Array(12 + payload.length);
    var dv = new DataView(out.buffer);
    dv.setUint32(0, payload.length);
    out.set(body, 4);
    dv.setUint32(8 + payload.length, crc32(body));
    return out;
  }
  function parseChunks(bytes) {
    if (!isPng(bytes)) throw new Error('不是 PNG 文件');
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var pos = 8, chunks = [], last = '';
    while (pos + 12 <= bytes.length) {
      var len = dv.getUint32(pos);
      var type = tagName(bytes, pos + 4);
      var dataStart = pos + 8, dataEnd = dataStart + len, end = dataEnd + 4;
      if (end > bytes.length) throw new Error('PNG 块被截断：' + type);
      var expect = dv.getUint32(dataEnd);
      var actual = crc32(bytes.slice(pos + 4, dataEnd));
      if (expect !== actual) throw new Error('PNG 块 ' + type + ' 的 CRC 校验失败');
      chunks.push({ type: type, data: bytes.slice(dataStart, dataEnd), start: pos, end: end });
      pos = end; last = type;
    }
    if (last !== 'IEND' || pos !== bytes.length) throw new Error('PNG 未以完整 IEND 结束');
    return chunks;
  }
  function isAigc(chunk) {
    if (['iTXt', 'tEXt', 'zTXt'].indexOf(chunk.type) < 0) return false;
    if (chunk.data.length < AIGC_KEYWORD.length) return false;
    for (var i = 0; i < AIGC_KEYWORD.length; i++) if (chunk.data[i] !== AIGC_KEYWORD[i]) return false;
    return true;
  }
  function findNull(data, start) {
    for (var i = start; i < data.length; i++) if (data[i] === 0) return i;
    return -1;
  }
  function readWire(bytes) {
    var chunks = parseChunks(bytes);
    var found = null;
    chunks.forEach(function (c) {
      if (!isAigc(c)) return;
      var data = c.data, p = AIGC_KEYWORD.length;
      if (c.type === 'tEXt') {
        found = new TextDecoder('latin1').decode(data.slice(p));
        return;
      }
      if (c.type === 'zTXt') throw new Error('演示不支持 zTXt 压缩块');
      var flag = data[p++], method = data[p++];
      var langEnd = findNull(data, p);
      if (langEnd < 0) throw new Error('iTXt 缺少 language 终止符');
      p = langEnd + 1;
      var transEnd = findNull(data, p);
      if (transEnd < 0) throw new Error('iTXt 缺少 translated keyword 终止符');
      p = transEnd + 1;
      if (flag === 1) throw new Error('演示不支持压缩 iTXt');
      found = decodeUtf8(data.slice(p)).replace(/\0+$/, '');
    });
    return found;
  }
  function writeWire(bytes, wire) {
    var chunks = parseChunks(bytes);
    if (!chunks.length || chunks[0].type !== 'IHDR') throw new Error('PNG 缺少 IHDR 首块');
    var payload = concatBytes(new Uint8Array(AIGC_KEYWORD), new Uint8Array([0, 0, 0, 0]), utf8(wire));
    var chunk = makeChunk('iTXt', payload);
    var out = [bytes.slice(0, 8)];
    chunks.forEach(function (c, index) {
      if (isAigc(c)) return;
      out.push(bytes.slice(c.start, c.end));
      if (index === 0) out.push(chunk);
    });
    return concatBytes.apply(null, out);
  }
  function removeWire(bytes) {
    var chunks = parseChunks(bytes);
    var out = [bytes.slice(0, 8)];
    chunks.forEach(function (c) { if (!isAigc(c)) out.push(bytes.slice(c.start, c.end)); });
    return concatBytes.apply(null, out);
  }
  function appendText(bytes, keyword, text) {
    var chunks = parseChunks(bytes);
    var chunk = makeChunk('tEXt', concatBytes(utf8(keyword + '\0'), utf8(text)));
    var out = [bytes.slice(0, 8)];
    var inserted = false;
    chunks.forEach(function (c) {
      if (c.type === 'IEND' && !inserted) { out.push(chunk); inserted = true; }
      out.push(bytes.slice(c.start, c.end));
    });
    return concatBytes.apply(null, out);
  }

  /* ------------------------------------------------------------------ 哈希与标签 */
  function toHex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  async function sha256Hex(bytes) {
    if (!crypto || !crypto.subtle) throw new Error('当前环境不支持 Web Crypto（请用 https 或 localhost 打开）');
    return toHex(await crypto.subtle.digest('SHA-256', bytes));
  }
  function canonical(obj) {
    var keys = Object.keys(obj).sort(), out = {};
    keys.forEach(function (k) { out[k] = obj[k]; });
    return JSON.stringify(out);
  }
  async function buildManifest() {
    var producer = $('aigcProducer').value.trim();
    var produceId = $('aigcProduceId').value.trim();
    if (!producer || !produceId) throw new Error('ContentProducer 与 ProduceID 不能为空');
    var code = (await sha256Hex(utf8(producer + '|' + produceId))).slice(0, 16);
    return { ContentProducer: producer, Label: 1, ProduceID: produceId, ReservedCode1: code };
  }
  async function parseWire(wire) {
    var text = wire.strip ? wire.strip() : String(wire).trim();
    if (/^AIGC[:=]/i.test(text)) text = text.slice(5);
    var obj;
    try { obj = JSON.parse(text); } catch (e) { throw new Error('wire 不是合法 JSON'); }
    ['Label', 'ContentProducer', 'ProduceID'].forEach(function (k) {
      if (obj[k] == null || obj[k] === '') throw new Error('缺少必填字段 ' + k);
    });
    if (obj.Label !== 1) throw new Error('生成方只能写 Label=1');
    var expected = (await sha256Hex(utf8(obj.ContentProducer + '|' + obj.ProduceID))).slice(0, 16);
    if (obj.ReservedCode1 !== expected) throw new Error('完整性码不匹配：字段被改过');
    return { manifest: obj, canonical: canonical(obj) };
  }
  function wireOf(manifest) { return 'AIGC:' + canonical(manifest); }

  /* ------------------------------------------------------------------ 示例图 */
  var PALETTES = [
    ['#08111f', '#122a4a', '#00e5ff', '#ff4d9d', '#f5f0e8'],
    ['#150b24', '#2b1747', '#ffb347', '#7af0c8', '#f5f0e8'],
    ['#0b1a16', '#123b33', '#9ef0a8', '#f2c14e', '#f5f0e8']
  ];
  async function drawSample() {
    var canvas = $('aigcCanvas'), ctx = canvas.getContext('2d');
    var p = PALETTES[state.variant % PALETTES.length];
    state.variant++;
    var g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, p[0]); g.addColorStop(1, p[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.28;
    for (var i = 0; i < 7; i++) {
      ctx.strokeStyle = p[2]; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(canvas.width * (0.15 + i * 0.13), canvas.height * (0.2 + (i % 3) * 0.22), 80 + i * 22, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = p[3]; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(70, 400); ctx.lineTo(250, 210); ctx.lineTo(410, 380); ctx.lineTo(610, 150); ctx.lineTo(830, 360); ctx.stroke();
    ctx.fillStyle = p[2];
    for (var j = 0; j < 9; j++) {
      ctx.beginPath(); ctx.arc(90 + j * 92, 470 + (j % 2) * 18, 4, 0, 7); ctx.fill();
    }
    ctx.fillStyle = p[4];
    ctx.font = '800 74px "Baloo 2", "Segoe UI", sans-serif';
    ctx.fillText('AIGC LAB', 64, 120);
    ctx.font = '600 22px "JetBrains Mono", Consolas, monospace';
    ctx.fillStyle = p[2];
    ctx.fillText('SYNTHETIC SAMPLE · PNG · 900 × 560', 68, 162);
    ctx.font = '500 18px "JetBrains Mono", Consolas, monospace';
    ctx.fillStyle = p[4];
    ctx.fillText('generated locally · no upload · no tracking', 68, 520);
    var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
    if (!blob) throw new Error('示例图生成失败');
    await setSource(new Uint8Array(await blob.arrayBuffer()));
  }
  async function setSource(bytes) {
    state.sourceBytes = bytes;
    state.bytes = bytes;
    state.sourceHash = await sha256Hex(bytes);
    state.bytesHash = state.sourceHash;
    state.labeledHash = '';
    state.wire = null;
    state.manifest = null;
    state.lastVerify = null;
    state.ledger = [];
    state.chainBrokenSeq = null;
    renderImage();
    renderAll();
  }
  function renderImage() {
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = URL.createObjectURL(new Blob([state.bytes], { type: 'image/png' }));
    $('aigcPreview').src = state.objectUrl;
  }

  /* ------------------------------------------------------------------ 台账 */
  async function appendEntry(op, result, fileHash, digest, risks) {
    var seq = state.ledger.length + 1;
    var prev = seq === 1 ? GENESIS : state.ledger[state.ledger.length - 1].entry_hash;
    var row = {
      request_id: 'demo-' + String(seq).padStart(4, '0'),
      ts: new Date().toISOString(),
      op: op,
      actor: 'console',
      format: 'png',
      result: result,
      risk_flags: (risks || []).join(','),
      file_sha256: fileHash || '',
      phash: '',
      producer_keyed: '',
      produce_id_keyed: '',
      label: 1,
      manifest_digest: digest || ''
    };
    var body = CHAIN_FIELDS.map(function (f) { return row[f] == null ? '' : String(row[f]); }).join('|');
    row.entry_hash = await sha256Hex(utf8(seq + '|' + prev + '|' + body));
    row.prev_hash = prev;
    row.seq = seq;
    state.ledger.push(row);
    renderChain();
    renderSteps();
  }
  async function checkChain() {
    if (!state.ledger.length) { setChainVerdict('台账还是空的：先写入一次标识。', ''); return; }
    var prev = GENESIS, broken = null;
    for (var i = 0; i < state.ledger.length; i++) {
      var e = state.ledger[i];
      var body = CHAIN_FIELDS.map(function (f) { return e[f] == null ? '' : String(e[f]); }).join('|');
      var expected = await sha256Hex(utf8(e.seq + '|' + prev + '|' + body));
      if (e.prev_hash !== prev || e.entry_hash !== expected) { broken = e.seq; break; }
      prev = expected;
    }
    state.chainBrokenSeq = broken;
    renderChain();
    if (broken) setChainVerdict('链断在 seq ' + broken + '：prev_hash 或 entry_hash 与重算不符。', 'bad');
    else setChainVerdict('全链通过：' + state.ledger.length + ' 条记录逐条接上。', 'ok');
  }
  function tamperChain() {
    if (!state.ledger.length) { setChainVerdict('台账还是空的，没有可篡改的记录。', ''); return; }
    var idx = state.ledger.length > 1 ? 1 : 0;
    state.ledger[idx].result = 'tampered';
    state.chainBrokenSeq = null;
    renderChain();
    setChainVerdict('已把 seq ' + state.ledger[idx].seq + ' 的 result 改成 tampered，但没有重算 entry_hash；点「校验整条链」看断点。', 'warn');
  }
  function renderChain() {
    var host = $('aigcChain');
    if (!state.ledger.length) {
      host.innerHTML = '<div class="lab-empty">还没有记录。写入或核验一次，这里会出现第一条。</div>';
      return;
    }
    host.innerHTML = state.ledger.map(function (e) {
      var broken = state.chainBrokenSeq === e.seq;
      var cls = broken ? ' broken' : '';
      var chip = e.result === 'ok' || e.result === 'written' ? 'ok' : (e.result === 'tampered' ? 'warn' : 'bad');
      return '<div class="lab-block' + cls + '"><div class="h"><span class="seq">#' + e.seq + '</span><span class="lab-chip ' + chip + '">' + esc(e.op) + ' / ' + esc(e.result) + '</span><span class="hash">prev ' + esc(Lab.shortHash(e.prev_hash, 16)) + '</span></div>' +
        '<div class="hash">entry ' + esc(Lab.shortHash(e.entry_hash, 24)) + '</div>' +
        '<div class="hash">file ' + esc(Lab.shortHash(e.file_sha256, 24)) + ' · digest ' + esc(Lab.shortHash(e.manifest_digest, 16)) + '</div></div>';
    }).join('');
  }

  /* ------------------------------------------------------------------ 渲染 */
  function setVerdict(ok, title, detail) {
    var chip = ok === true ? '<span class="lab-chip ok">PASS</span>' : ok === false ? '<span class="lab-chip bad">FAIL</span>' : '<span class="lab-chip info">READY</span>';
    $('aigcVerdict').innerHTML = '<div class="lab-chips">' + chip + '<span class="lab-chip">' + esc(title) + '</span></div><p class="desc" style="margin-top:8px">' + esc(detail) + '</p>';
  }
  function setChainVerdict(text, cls) {
    var host = $('aigcChainVerdict');
    var label = { ok: 'PASS', bad: 'FAIL', warn: 'WARN' }[cls] || '';
    host.innerHTML = '<div class="lab-note" style="margin:8px 0">' + (label ? '<span class="lab-chip ' + cls + '">' + label + '</span> ' : '') + esc(text) + '</div>';
  }
  function renderStatus() {
    var chips = ['<span class="lab-chip info">PNG</span>', '<span class="lab-chip">' + (state.bytes ? state.bytes.length.toLocaleString('en-US') + ' B' : '—') + '</span>'];
    if (state.manifest) chips.push('<span class="lab-chip ok">已写入标识</span>');
    else chips.push('<span class="lab-chip">无标识</span>');
    if (state.lastVerify === true) chips.push('<span class="lab-chip ok">最近核验通过</span>');
    if (state.lastVerify === false) chips.push('<span class="lab-chip bad">最近核验失败</span>');
    if (state.labeledHash && state.bytesHash && state.labeledHash !== state.bytesHash) chips.push('<span class="lab-chip warn">当前字节已变</span>');
    $('aigcStatus').innerHTML = chips.join('');
  }
  function renderFileMeta() {
    $('aigcFileMeta').innerHTML =
      '<div class="lab-meta"><div class="k">源文件 SHA-256</div><div class="v">' + esc(Lab.shortHash(state.sourceHash, 24)) + '</div></div>' +
      '<div class="lab-meta"><div class="k">当前文件 SHA-256</div><div class="v">' + esc(Lab.shortHash(state.bytesHash, 24)) + '</div></div>' +
      '<div class="lab-meta"><div class="k">写入后 SHA-256</div><div class="v">' + esc(Lab.shortHash(state.labeledHash, 24)) + '</div></div>';
  }
  function renderManifest() {
    var host = $('aigcManifest');
    if (!state.manifest) { host.innerHTML = '<div class="lab-empty">还没写入标识字段。</div>'; return; }
    host.innerHTML = Object.keys(state.manifest).map(function (k) {
      return '<div class="lab-meta"><div class="k">' + esc(k) + '</div><div class="v">' + esc(state.manifest[k]) + '</div></div>';
    }).join('');
  }
  function renderSteps() {
    var steps = [
      { n: '1', label: '生成 / 载入 PNG', done: !!state.sourceBytes },
      { n: '2', label: '标识字段 + 完整性码', done: !!state.manifest },
      { n: '3', label: '写入 iTXt（不改像素）', done: !!state.labeledHash },
      { n: '4', label: '读回核验', done: state.lastVerify != null, fail: state.lastVerify === false },
      { n: '5', label: '追加哈希链记录', done: state.ledger.length > 0 }
    ];
    $('aigcSteps').innerHTML = steps.map(function (s) {
      var cls = s.fail ? 'fail' : (s.done ? 'done' : '');
      return '<div class="lab-flow-step ' + cls + '"><span class="n">' + s.n + '</span><div>' + esc(s.label) + '</div></div>';
    }).join('');
  }
  function renderWire() {
    $('aigcWire').textContent = state.wire || '（还没写入）';
  }
  function renderAll() {
    renderStatus(); renderFileMeta(); renderManifest(); renderWire(); renderSteps(); renderChain();
  }

  /* ------------------------------------------------------------------ 操作 */
  async function onWrite() {
    try {
      if (!state.bytes) throw new Error('先载入一张 PNG');
      var manifest = await buildManifest();
      var wire = wireOf(manifest);
      var labeled = writeWire(state.bytes, wire);
      var readback = readWire(labeled);
      var ok = readback === wire;
      var hash = await sha256Hex(labeled);
      var digest = (await sha256Hex(utf8(canonical(manifest)))).slice(0, 32);
      state.bytes = labeled;
      state.bytesHash = hash;
      state.labeledHash = hash;
      state.wire = wire;
      state.manifest = manifest;
      state.lastVerify = null;
      await appendEntry('write', ok ? 'written' : 'written_unverified', hash, digest, ok ? [] : ['readback_failed']);
      renderImage();
      setVerdict(ok, ok ? '写入并读回一致' : '写入完成，但读回不一致', ok ? '标识字段已写入 iTXt，并立即读回逐字段比对；像素没有重编码。' : '写入成功但读回失败，真实实现会记 written_unverified，不把可疑产物静默丢掉。');
      renderAll();
    } catch (e) {
      setVerdict(false, '写入失败', e.message || String(e));
    }
  }

  async function onVerify() {
    if (!state.bytes) { setVerdict(false, '核验失败', '先载入一张 PNG'); return; }
    var currentHash = await sha256Hex(state.bytes);
    try {
      var wire = readWire(state.bytes);
      if (!wire) throw new Error('找不到 AIGC 标识');
      var parsed = await parseWire(wire);
      var digest = (await sha256Hex(utf8(parsed.canonical))).slice(0, 32);
      var lastWrite = null;
      for (var i = state.ledger.length - 1; i >= 0; i--) {
        if (state.ledger[i].op === 'write') { lastWrite = state.ledger[i]; break; }
      }
      if (!lastWrite) throw new Error('台账里没有写入记录，无法核对文件指纹');
      if (lastWrite.file_sha256 !== currentHash) throw new Error('文件指纹与台账不一致：当前文件不是写入时那一份');
      state.manifest = parsed.manifest;
      state.wire = wire;
      state.lastVerify = true;
      await appendEntry('verify', 'ok', currentHash, digest, []);
      setVerdict(true, '核验通过', '标识字段齐全、完整性码匹配、文件指纹与台账一致。');
    } catch (e) {
      state.lastVerify = false;
      var d = '';
      try { var m = readWire(state.bytes); if (m) d = (await sha256Hex(utf8(canonical(JSON.parse(m.replace(/^AIGC[:=]/, '')))))).slice(0, 32); } catch (x) {}
      await appendEntry('verify', 'fail', currentHash, d, [e.message]);
      setVerdict(false, '核验失败', e.message || String(e));
    }
    renderAll();
  }

  async function onTamperLabel() {
    try {
      var wire = readWire(state.bytes);
      if (!wire) throw new Error('当前文件没有标识，先写入');
      var obj = JSON.parse(wire.replace(/^AIGC[:=]/, ''));
      obj.ContentProducer = obj.ContentProducer + '（已被改）';
      var tampered = 'AIGC:' + canonical(obj);
      state.bytes = writeWire(state.bytes, tampered);
      state.bytesHash = await sha256Hex(state.bytes);
      state.wire = tampered;
      state.manifest = obj;
      state.lastVerify = null;
      renderImage();
      setVerdict(false, '字段已篡改', 'ContentProducer 改了，但 ReservedCode1 还是旧的；点「核验标识」看完整性码怎么抓它。');
      renderAll();
    } catch (e) { setVerdict(false, '篡改失败', e.message || String(e)); }
  }

  async function onTamperFile() {
    try {
      if (!state.bytes) throw new Error('先载入一张 PNG');
      state.bytes = appendText(state.bytes, 'Comment', 'tampered-by-demo');
      state.bytesHash = await sha256Hex(state.bytes);
      state.lastVerify = null;
      renderImage();
      setVerdict(false, '已追加一段字节', '标识还在，像素也没变，但文件指纹变了；点「核验标识」看台账怎么发现它。');
      renderAll();
    } catch (e) { setVerdict(false, '追加失败', e.message || String(e)); }
  }

  async function onRemove() {
    try {
      if (!state.bytes) throw new Error('先载入一张 PNG');
      state.bytes = removeWire(state.bytes);
      state.bytesHash = await sha256Hex(state.bytes);
      state.wire = null;
      state.manifest = null;
      state.lastVerify = null;
      renderImage();
      setVerdict(false, '标识已删除', 'iTXt 块被移除；点「核验标识」，这次失败的原因是“找不到标识”，不是字段不符。');
      renderAll();
    } catch (e) { setVerdict(false, '删除失败', e.message || String(e)); }
  }

  async function onReset() {
    try {
      state.ledger = []; state.chainBrokenSeq = null;
      await drawSample();
      setChainVerdict('', '');
      setVerdict(null, '已重置', '换了一张示例图，台账清空；点「写入标识」开始。');
    } catch (e) { setVerdict(false, '重置失败', e.message || String(e)); }
  }

  async function onUpload(ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try {
      var bytes = new Uint8Array(await file.arrayBuffer());
      if (!isPng(bytes)) throw new Error('本演示只支持 PNG（JPEG/MP3/MP4 在真实项目里由对应承载位处理）');
      await setSource(bytes);
      setChainVerdict('', '');
      setVerdict(null, '已载入 PNG', '文件只在当前浏览器内处理；点「写入标识」。');
    } catch (e) { setVerdict(false, '载入失败', e.message || String(e)); }
    ev.target.value = '';
  }

  /* ------------------------------------------------------------------ 绑定
   * 所有会改 state 的操作串行执行：重置要生成图片、写入要算两次 SHA-256，
   * 连点会让“重置还没完成就写入”把台账写进上一张图的状态里。 */
  var busy = false;
  var ACTION_IDS = ['aigcWrite', 'aigcVerify', 'aigcTamperLabel', 'aigcTamperFile', 'aigcRemove', 'aigcReset', 'aigcSample', 'aigcChainCheck', 'aigcChainTamper', 'aigcChainReset'];
  function setBusy(b) {
    busy = b;
    ACTION_IDS.forEach(function (id) { var el = $(id); if (el) el.disabled = b; });
    var file = $('aigcFile'); if (file) file.disabled = b;
    if (b) $('aigcStatus').innerHTML = '<span class="lab-chip info">处理中…</span>';
  }
  async function run(fn) {
    if (busy) return;
    setBusy(true);
    try { await fn(); }
    catch (e) { setVerdict(false, '操作失败', e.message || String(e)); }
    finally { setBusy(false); renderAll(); }
  }

  $('aigcWrite').addEventListener('click', function () { run(onWrite); });
  $('aigcVerify').addEventListener('click', function () { run(onVerify); });
  $('aigcTamperLabel').addEventListener('click', function () { run(onTamperLabel); });
  $('aigcTamperFile').addEventListener('click', function () { run(onTamperFile); });
  $('aigcRemove').addEventListener('click', function () { run(onRemove); });
  $('aigcReset').addEventListener('click', function () { run(onReset); });
  $('aigcSample').addEventListener('click', function () { run(onReset); });
  $('aigcFile').addEventListener('change', function (ev) { run(function () { return onUpload(ev); }); });
  $('aigcChainCheck').addEventListener('click', function () { run(checkChain); });
  $('aigcChainTamper').addEventListener('click', function () { run(tamperChain); });
  $('aigcChainReset').addEventListener('click', function () {
    run(async function () {
      state.ledger = []; state.chainBrokenSeq = null;
      renderChain(); setChainVerdict('台账已清空。', '');
    });
  });

  setVerdict(null, '就绪', '示例图正在本地生成，请稍候…');
  run(async function () {
    await drawSample();
    setVerdict(null, '就绪', '示例图已在本地生成；点「写入标识」开始。');
  });
})();
