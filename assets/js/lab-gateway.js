/* lab-gateway.js —— 预算/限流沙盘 + Text-to-SQL 安检门（纯前端演示） */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var esc = Lab.escape;

  /* ------------------------------------------------------------------ 预算沙盘 */
  var BURST = 10;
  var RPM = 60;

  function runBudget() {
    var rate = +$('budgetRate').value;
    var cost = +$('budgetCost').value;
    var daily = +$('budgetDaily').value;
    var tokens = BURST;
    var acc = 0;
    var spend = 0;
    var allowed = 0, rateLimited = 0, budgetBlocked = 0;
    var bars = [];

    for (var s = 0; s < 60; s++) {
      tokens = Math.min(BURST, tokens + RPM / 60);
      acc += rate / 60;
      var a = 0, r = 0, b = 0;
      while (acc >= 1) {
        acc -= 1;
        if (tokens < 1) { rateLimited++; r++; }
        else if (spend + cost > daily + 1e-9) { budgetBlocked++; b++; }
        else { tokens -= 1; spend += cost; allowed++; a++; }
      }
      bars.push({ a: a, r: r, b: b, total: a + r + b });
    }

    var total = allowed + rateLimited + budgetBlocked;
    var remaining = Math.max(0, daily - spend);
    $('budgetKpis').innerHTML =
      kpi('放行', allowed, 'ok') +
      kpi('限流 429', rateLimited, 'warn') +
      kpi('预算拦截', budgetBlocked, 'bad') +
      kpi('已花费', Lab.fmtMoney(spend), '') +
      kpi('预算余额', Lab.fmtMoney(remaining), '');

    var max = Math.max.apply(null, bars.map(function (x) { return x.total; }).concat([1]));
    var host = $('budgetTimeline');
    host.textContent = '';
    bars.forEach(function (x, i) {
      var el = document.createElement('i');
      var kind = x.b > 0 ? 'budget' : (x.r > 0 ? 'rate' : (x.a > 0 ? '' : 'idle'));
      el.className = kind;
      el.style.height = Math.max(4, x.total / max * 100) + '%';
      el.title = '第 ' + (i + 1) + ' 秒：放行 ' + x.a + ' / 限流 ' + x.r + ' / 预算拦截 ' + x.b;
      host.appendChild(el);
    });

    var note = '共 ' + total + ' 次请求：放行 ' + allowed + '，限流 ' + rateLimited + '，预算拦截 ' + budgetBlocked + '。';
    if (rateLimited && budgetBlocked) {
      note += ' 两道路径都撞到了：先被令牌桶挡住，再被日预算挡住——key 被复制后，攻击者和正常调用方共享同一套桶与预算。';
    } else if (rateLimited) {
      note += ' 这一次主要撞的是令牌桶：请求速率超过 60 次/分，网关返回 429（GW-RATE-LIMITED）。';
    } else if (budgetBlocked) {
      note += ' 这一次主要撞的是预算：速率没超，但花费先到了日预算上限（GW-BUDGET-DAILY）。';
    } else {
      note += ' 这次没有触发闸门；把速率或单次成本往上拉，就能看到 429 或预算拦截。';
    }
    $('budgetNote').textContent = note;
  }

  function kpi(label, value, cls) {
    return '<div class="lab-kpi ' + cls + '"><div class="v">' + esc(value) + '</div><div class="l">' + esc(label) + '</div></div>';
  }

  /* --------------------------------------------------------------- SQL 安检门 */

  var CATALOG = {
    departments: { cols: ['id', 'name', 'region', 'cost_center'], mask: {}, rls: false },
    employees: { cols: ['id', 'name', 'dept_id', 'role', 'grade', 'hire_date', 'status'], mask: { name: 'partial' }, rls: true },
    attendance: { cols: ['id', 'employee_id', 'work_day', 'check_in', 'check_out', 'worked_hours', 'late_minutes'], mask: {}, rls: false, rlsPath: { col: 'employee_id', ref: 'employees', refCol: 'id' } },
    payroll_runs: { cols: ['id', 'employee_id', 'dept_id', 'period', 'base_salary', 'bonus', 'currency'], mask: { base_salary: 'partial', bonus: 'partial' }, rls: true },
    sales_orders: { cols: ['id', 'customer_id', 'dept_id', 'amount_cents', 'channel', 'created_at'], mask: {}, rls: true },
    customer_pii: { cols: ['id', 'name', 'phone', 'email', 'id_card', 'dept_id'], mask: { name: 'partial', phone: 'partial', email: 'partial', id_card: 'redact' }, rls: true, hidden: ['id_card'] }
  };

  var KEYWORDS = new Set(('select from where group by order having limit offset as join left right inner outer on and or not in is null like between union all distinct case when then else end asc desc').split(' '));
  var ALLOWED_FUNCTIONS = new Set(('count sum total avg min max group_concat abs round coalesce ifnull nullif iif if case cast length lower upper trim ltrim rtrim replace instr substr substring printf char hex typeof unicode lpad rpad date time datetime julianday strftime unixepoch from_unixtime row_number rank dense_rank lag lead ntile first_value last_value nth_value json_extract json_array_length json_valid json_type json_quote str_position exists'.split(' ')));
  var WRITE_WORDS = /\b(insert|update|delete|drop|alter|truncate|create|replace|attach|detach|pragma|vacuum)\b/i;

  var SAMPLES = {
    employees: [
      { id: 1, name: '张伟', dept_id: 1, role: '后端', grade: 5, hire_date: '2022-03-01', status: '在职' },
      { id: 2, name: '李娜', dept_id: 1, role: '算法', grade: 6, hire_date: '2021-08-16', status: '在职' },
      { id: 3, name: '王强', dept_id: 6, role: 'HR', grade: 4, hire_date: '2023-01-09', status: '在职' }
    ],
    payroll_runs: [
      { id: 1, employee_id: 1, dept_id: 1, period: '2025-09', base_salary: 18000, bonus: 3000, currency: 'CNY' },
      { id: 2, employee_id: 2, dept_id: 1, period: '2025-09', base_salary: 24000, bonus: 5000, currency: 'CNY' },
      { id: 3, employee_id: 3, dept_id: 6, period: '2025-09', base_salary: 15000, bonus: 2000, currency: 'CNY' }
    ],
    customer_pii: [
      { id: 1, name: '张伟', phone: '13812345678', email: 'zhang@example.com', id_card: '440101199001011234', dept_id: 1 },
      { id: 2, name: '李娜', phone: '13987654321', email: 'li@example.com', id_card: '440101199202022345', dept_id: 1 },
      { id: 3, name: '王强', phone: '13600001111', email: 'wang@example.com', id_card: '440101198803033456', dept_id: 6 }
    ]
  };

  function stripStrings(sql) {
    return sql.replace(/'(?:[^']|'')*'/g, "''").replace(/"(?:[^"]|"")*"/g, '""');
  }
  function cleanId(s) { return String(s).replace(/[`"\[\]]/g, ''); }

  function splitTop(s, sep) {
    var out = [], cur = '', depth = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      if (c === sep && depth === 0) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out;
  }

  function extractTables(sql) {
    var re = /\b(?:from|join)\s+([a-zA-Z_][\w]*)/gi, m, out = [];
    while ((m = re.exec(sql))) {
      var t = cleanId(m[1]).toLowerCase();
      if (out.indexOf(t) < 0) out.push(t);
    }
    return out;
  }

  function extractAliases(sql) {
    var re = /\b(?:from|join)\s+([a-zA-Z_][\w]*)\s+(?:as\s+)?([a-zA-Z_][\w]*)/gi, m, out = {};
    while ((m = re.exec(sql))) {
      var alias = cleanId(m[2]).toLowerCase();
      if (!KEYWORDS.has(alias) && alias !== 'on') out[alias] = cleanId(m[1]).toLowerCase();
    }
    return out;
  }

  function selectList(sql) {
    var m = sql.match(/\bselect\b([\s\S]*?)\bfrom\b/i);
    if (!m) {
      var m2 = sql.match(/\bselect\b([\s\S]*)$/i);
      return m2 ? m2[1].trim() : '';
    }
    return m[1].trim();
  }

  function analyzeColumns(sql, tables, aliases) {
    var list = selectList(sql);
    var parts = splitTop(list, ',');
    var selected = [], unknown = [], hidden = [], masks = {}, star = false;
    var known = {};
    tables.forEach(function (t) { (CATALOG[t] ? CATALOG[t].cols : []).forEach(function (c) { known[c] = true; }); });

    parts.forEach(function (raw) {
      var expr = raw.trim();
      if (!expr) return;
      if (/\*$/.test(expr)) {
        star = true;
        var owner = expr.replace(/\.\*$/, '').trim().toLowerCase();
        var targets = (owner && aliases[owner]) ? [aliases[owner]] : tables;
        targets.forEach(function (t) {
          if (!CATALOG[t]) return;
          CATALOG[t].cols.forEach(function (c) {
            if ((CATALOG[t].hidden || []).indexOf(c) >= 0) hidden.push(c);
            else selected.push(c);
            if (CATALOG[t].mask[c]) masks[c] = CATALOG[t].mask[c];
          });
        });
        return;
      }
      var noAlias = expr.replace(/\s+as\s+[a-zA-Z_][\w]*$/i, '').trim();
      var ids = noAlias.match(/[a-zA-Z_][\w]*/g) || [];
      var exprCols = [];
      ids.forEach(function (id) {
        var low = id.toLowerCase();
        if (KEYWORDS.has(low) || ALLOWED_FUNCTIONS.has(low) || aliases[low]) return;
        if (CATALOG[low]) return;
        if (known[low]) {
          exprCols.push(low);
        } else {
          unknown.push(low);
        }
      });
      exprCols.forEach(function (c) {
        if (!selected.some(function (x) { return x.name === c && x.expr === noAlias; })) {
          selected.push({ name: c, expr: noAlias, derived: noAlias.toLowerCase() !== c });
        }
        tables.forEach(function (t) {
          if (CATALOG[t] && CATALOG[t].hidden && CATALOG[t].hidden.indexOf(c) >= 0) hidden.push(c);
          if (CATALOG[t] && CATALOG[t].mask[c]) masks[c] = CATALOG[t].mask[c];
        });
      });
    });

    return { selected: selected, unknown: unique(unknown), hidden: unique(hidden), masks: masks, star: star };
  }

  function unique(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  function findFunctions(sql) {
    var re = /([a-zA-Z_][\w]*)\s*\(/g, m, out = [];
    while ((m = re.exec(sql))) {
      var f = m[1].toLowerCase();
      if (f === 'in' || f === 'exists') continue;
      out.push(f);
    }
    return unique(out);
  }

  function buildRules(sql, ctx) {
    var rules = [
      { id: 'GRD-000', name: '可解析', pri: 5 },
      { id: 'GRD-001', name: '单语句', pri: 10 },
      { id: 'GRD-002', name: '只允许 SELECT', pri: 20 },
      { id: 'GRD-004', name: '表白名单', pri: 30 },
      { id: 'GRD-003', name: '标识符可解析', pri: 40 },
      { id: 'GRD-005', name: '列白名单', pri: 50 },
      { id: 'GRD-006', name: '函数白名单', pri: 60 },
      { id: 'GRD-007', name: '禁止加锁与写出', pri: 70 },
      { id: 'GRD-008', name: '偏移上限', pri: 80 },
      { id: 'GRD-009', name: '行级权限谓词注入', pri: 90 },
      { id: 'GRD-010', name: '外层行数上限', pri: 100 },
      { id: 'GRD-011', name: '语句超时（执行器）', pri: 110 }
    ];
    var blocked = null;
    rules.forEach(function (r) {
      if (blocked) { r.status = 'skip'; r.why = '前序规则已拦截'; return; }
      switch (r.id) {
        case 'GRD-000':
          if (!ctx.parseOk) { r.status = 'block'; r.why = '括号或引号不闭合，无法解析'; blocked = r; }
          else { r.status = 'pass'; r.why = 'AST 可构建'; }
          break;
        case 'GRD-001':
          if (ctx.statements.length > 1) { r.status = 'block'; r.why = '检测到多条语句'; blocked = r; }
          else { r.status = 'pass'; r.why = '单条语句'; }
          break;
        case 'GRD-002':
          if (!ctx.selectOnly) { r.status = 'block'; r.why = '不是 SELECT 查询'; blocked = r; }
          else { r.status = 'pass'; r.why = '只读查询'; }
          break;
        case 'GRD-004':
          if (ctx.badTables.length) { r.status = 'block'; r.why = '不在目录：' + ctx.badTables.join(', '); blocked = r; }
          else if (!ctx.tables.length) { r.status = 'block'; r.why = '没有识别到表'; blocked = r; }
          else { r.status = 'pass'; r.why = ctx.tables.join(', '); }
          break;
        case 'GRD-003':
          if (ctx.cols.unknown.length) { r.status = 'block'; r.why = '未知列：' + ctx.cols.unknown.join(', '); blocked = r; }
          else { r.status = 'pass'; r.why = '列均可在目录中解析'; }
          break;
        case 'GRD-005':
          if (ctx.cols.hidden.length) { r.status = 'block'; r.why = '不暴露列：' + ctx.cols.hidden.join(', '); blocked = r; }
          else { r.status = 'pass'; r.why = '列可返回'; }
          break;
        case 'GRD-006':
          if (ctx.badFunctions.length) { r.status = 'block'; r.why = '函数不在白名单：' + ctx.badFunctions.join(', '); blocked = r; }
          else { r.status = 'pass'; r.why = ctx.functions.length ? ctx.functions.join(', ') : '无函数调用'; }
          break;
        case 'GRD-007':
          if (ctx.locking) { r.status = 'block'; r.why = '锁定读或 SELECT INTO'; blocked = r; }
          else { r.status = 'pass'; r.why = '无锁定/写出'; }
          break;
        case 'GRD-008':
          if (ctx.offset > 5000) { r.status = 'block'; r.why = 'OFFSET ' + ctx.offset + ' > 5000'; blocked = r; }
          else { r.status = 'pass'; r.why = ctx.offset ? 'OFFSET ' + ctx.offset : '无 OFFSET'; }
          break;
        case 'GRD-009':
          r.status = 'pass';
          r.why = ctx.rls.length ? '注入 ' + ctx.rls.length + ' 条谓词' : '无 RLS 键表';
          break;
        case 'GRD-010':
          r.status = 'pass';
          r.why = '外层 LIMIT ' + ctx.maxRows;
          break;
        case 'GRD-011':
          r.status = 'skip';
          r.why = '由执行器落实（演示不执行）';
          break;
      }
    });
    return { rules: rules, blocked: blocked };
  }

  function review(sql) {
    var raw = sql.trim();
    var stripped = stripStrings(raw);
    var statements = raw.split(';').map(function (s) { return s.trim(); }).filter(Boolean);
    var first = (stripped.match(/^\s*([a-zA-Z]+)/) || [])[1] || '';
    var parseOk = balanced(raw);
    /* FOR UPDATE / LOCK IN SHARE MODE 是锁定读，不是写语句：先剥掉再判 GRD-002，
     * 留给 GRD-007；否则 UPDATE 这个词会抢先命中“只允许 SELECT”。 */
    var withoutLocking = stripped.replace(/\bfor\s+(update|share)\b|\block\s+in\s+share\s+mode\b/gi, '');
    var selectOnly = /^(select|with)$/i.test(first) && !WRITE_WORDS.test(withoutLocking);
    var tables = extractTables(stripped);
    var aliases = extractAliases(stripped);
    var badTables = tables.filter(function (t) { return !CATALOG[t]; });
    var cols = analyzeColumns(stripped, tables, aliases);
    var functions = findFunctions(stripped);
    var badFunctions = functions.filter(function (f) { return !ALLOWED_FUNCTIONS.has(f); });
    var locking = /\bfor\s+(update|share)\b|\block\s+in\s+share\s+mode\b|\bselect\s+into\b/i.test(stripped);
    var offsetMatch = stripped.match(/\boffset\s+(\d+)/i);
    var offset = offsetMatch ? +offsetMatch[1] : 0;
    var rls = [];
    tables.forEach(function (t) {
      var meta = CATALOG[t];
      if (!meta) return;
      if (meta.rls) rls.push({ table: t, sql: 'dept_id IN (:rls_0)' });
      else if (meta.rlsPath) rls.push({ table: t, sql: meta.rlsPath.col + ' IN (SELECT ' + meta.rlsPath.refCol + ' FROM ' + meta.rlsPath.ref + ' WHERE dept_id IN (:rls_0))' });
    });
    var ctx = {
      statements: statements, parseOk: parseOk, selectOnly: selectOnly, tables: tables,
      badTables: badTables, cols: cols, functions: functions, badFunctions: badFunctions,
      locking: locking, offset: offset, rls: rls, maxRows: 200
    };
    var built = buildRules(stripped, ctx);
    return { ctx: ctx, rules: built.rules, blocked: built.blocked, raw: raw };
  }

  function balanced(sql) {
    var depth = 0, q = null;
    for (var i = 0; i < sql.length; i++) {
      var c = sql[i];
      if (q) {
        if (c === q) q = null;
      } else if (c === "'" || c === '"') q = c;
      else if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth < 0) return false; }
    }
    return depth === 0 && !q;
  }

  function canonicalSQL(res) {
    var sql = res.raw.trim().replace(/;\s*$/, '').replace(/\s+/g, ' ');
    if (res.ctx.cols.star) {
      var cols = res.ctx.cols.selected.map(function (c) { return typeof c === 'string' ? c : c.name; });
      if (cols.length) sql = sql.replace(/\bselect\s+\*/i, 'SELECT ' + unique(cols).join(', '));
    }
    if (res.ctx.rls.length) {
      var pred = res.ctx.rls.map(function (r) { return r.sql; }).join(' AND ');
      if (/\bwhere\b/i.test(sql)) sql += ' AND ' + pred;
      else sql += ' WHERE ' + pred;
    }
    if (/\blimit\s+\d+/i.test(sql)) sql = sql.replace(/\blimit\s+\d+/i, 'LIMIT ' + res.ctx.maxRows);
    else sql += ' LIMIT ' + res.ctx.maxRows;
    return sql;
  }

  function maskValue(col, value) {
    if (value == null) return '—';
    var s = String(value);
    if (col === 'name') return s.slice(0, 1) + '*';
    if (col === 'phone') return s.slice(0, 3) + '****' + s.slice(-4);
    if (col === 'email') return s.slice(0, 1) + '***@' + (s.split('@')[1] || '***');
    if (col === 'base_salary' || col === 'bonus') return s.slice(0, 2) + '***';
    if (col === 'id_card') return '***';
    return s;
  }

  function renderPreview(res) {
    var host = $('sqlPreview');
    if (res.blocked) {
      host.innerHTML = '<div class="lab-empty">被规则拦下，没有执行结果。</div>';
      return;
    }
    var table = res.ctx.tables[0];
    var rows = SAMPLES[table];
    if (!rows) {
      host.innerHTML = '<div class="lab-empty">这条查询没有内置演示数据；真实项目会在 SQLite 上执行。</div>';
      return;
    }
    var wanted = [];
    res.ctx.cols.selected.forEach(function (c) {
      if (typeof c === 'string') {
        if (wanted.indexOf(c) < 0) wanted.push(c);
      } else if (wanted.indexOf(c.name) < 0) {
        wanted.push(c.name);
      }
    });
    if (!wanted.length) wanted = CATALOG[table].cols.filter(function (c) { return (CATALOG[table].hidden || []).indexOf(c) < 0; });
    var show = rows.slice(0, 3);
    var html = '<div class="lab-table-wrap"><table class="lab-table"><thead><tr>';
    var derived = {};
    res.ctx.cols.selected.forEach(function (c) { if (typeof c !== 'string' && c.derived) derived[c.name] = c.expr; });
    wanted.forEach(function (c) { html += '<th>' + esc(derived[c] || c) + '</th>'; });
    html += '</tr></thead><tbody>';
    show.forEach(function (row) {
      html += '<tr>';
      wanted.forEach(function (c) {
        var v = row[c];
        var masked = res.ctx.cols.masks[c] ? maskValue(c, v) : v;
        if (derived[c] && res.ctx.cols.masks[c]) masked = '***';
        html += '<td class="' + (res.ctx.cols.masks[c] ? 'num' : '') + '">' + esc(masked == null ? '—' : masked) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div><p class="lab-note">演示只预览第一张表的前 3 行；真实执行器会按 <code>masks</code> 对结果值打码，掩码作用在值上，不拼进 SQL。</p>';
    host.innerHTML = html;
  }

  function renderSQL() {
    var res = review($('sqlInput').value);
    var rulesHost = $('sqlRules');
    rulesHost.innerHTML = res.rules.map(function (r) {
      var cls = r.status;
      return '<div class="lab-rule ' + cls + '"><span class="id">' + r.id + '</span><span class="why">' + esc(r.name) + ' · ' + esc(r.why) + '</span><span class="st">' + (r.status === 'pass' ? 'PASS' : r.status === 'block' ? 'BLOCK' : 'SKIP') + '</span></div>';
    }).join('');

    if (res.blocked) {
      $('sqlVerdict').innerHTML = '<div class="lab-chips"><span class="lab-chip bad">BLOCK · ' + res.blocked.id + '</span><span class="lab-chip">' + esc(res.blocked.name) + '</span></div><p class="desc" style="margin-top:8px">' + esc(res.blocked.why) + '。返回 200 + verdict=block；这不是 HTTP 错误，链路完整跑完了。</p>';
      $('sqlCanonical').textContent = '（被拦截，没有生成执行文本）';
      $('sqlParams').innerHTML = '';
      $('sqlMasks').innerHTML = '';
      renderPreview(res);
      return;
    }

    var canon = canonicalSQL(res);
    $('sqlVerdict').innerHTML = '<div class="lab-chips"><span class="lab-chip ok">ALLOW</span><span class="lab-chip info">canonical SQL 已重生成</span></div><p class="desc" style="margin-top:8px">规则全部通过；下面这串才是实际执行文本，模型原文不会直接进数据库。</p>';
    $('sqlCanonical').textContent = canon;
    $('sqlParams').innerHTML =
      '<div class="lab-meta"><div class="k">rls_0（租户部门）</div><div class="v">1</div></div>' +
      '<div class="lab-meta"><div class="k">max_rows</div><div class="v">200</div></div>';
    var maskKeys = Object.keys(res.ctx.cols.masks);
    $('sqlMasks').innerHTML = maskKeys.length
      ? maskKeys.map(function (k) { return '<span class="lab-chip warn">' + esc(k) + ' → ' + esc(res.ctx.cols.masks[k]) + '</span>'; }).join('')
      : '<span class="lab-chip">无敏感列</span>';
    renderPreview(res);
  }

  /* ------------------------------------------------------------------ 绑定 */
  $('budgetRate').addEventListener('input', function () { $('budgetRateVal').textContent = this.value; });
  $('budgetRun').addEventListener('click', runBudget);
  $('budgetReset').addEventListener('click', function () {
    $('budgetRate').value = 120; $('budgetRateVal').textContent = '120';
    $('budgetCost').value = '0.004'; $('budgetDaily').value = '0.20';
    runBudget();
  });
  $('sqlRun').addEventListener('click', renderSQL);
  document.querySelectorAll('#sqlSamples [data-sql]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('sqlInput').value = b.getAttribute('data-sql');
      renderSQL();
    });
  });

  runBudget();
  renderSQL();
})();
