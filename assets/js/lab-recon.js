/* lab-recon.js —— 分层确定性匹配实验：严格匹配 vs 先比金额（纯前端演示） */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var esc = Lab.escape;

  /* 数据字段用短名，金额全部用“分”，避免浮点误差。 */
  function L(id, out, ch, dir, amt, fee, cur, st, txn, refund, origin, time, clear) {
    return { id: id, out: out, channel: ch, direction: dir, amount: amt, fee: fee, currency: cur, status: st, txn: txn, refund: refund, origin: origin, time: time, clearDate: clear };
  }
  function B(row, ch, txn, out, refund, dir, amt, fee, cur, st, time, clear) {
    return { row: row, channel: ch, txn: txn, out: out, refund: refund, direction: dir, amount: amt, fee: fee, currency: cur, status: st, time: time, clearDate: clear };
  }

  var DATA = {
    normal: {
      locals: [
        L('L01', 'ORD-1001', 'alipay', 'in', 10000, 60, 'CNY', 'paid', 'ALI-1001', null, null, '2026-10-20 10:00:00', '2026-10-20'),
        L('L02', 'ORD-1002', 'wechat', 'in', 20000, 120, 'CNY', 'paid', 'WX-1002', null, null, '2026-10-20 10:05:00', '2026-10-20'),
        L('L03', 'ORD-1003', 'alipay', 'in', 30000, 180, 'CNY', 'paid', 'ALI-1003', null, null, '2026-10-20 10:10:00', '2026-10-20'),
        L('L04', 'ORD-1004', 'wechat', 'in', 15000, 90, 'CNY', 'paid', 'WX-1004', null, null, '2026-10-20 10:15:00', '2026-10-20')
      ],
      bills: [
        B(1, 'alipay', 'ALI-1001', 'ORD-1001', null, 'in', 10000, 60, 'CNY', 'paid', '2026-10-20 10:00:00', '2026-10-20'),
        B(2, 'wechat', 'WX-1002', 'ORD-1002', null, 'in', 20000, 120, 'CNY', 'paid', '2026-10-20 10:05:00', '2026-10-20'),
        B(3, 'alipay', 'ALI-1003', 'ORD-1003', null, 'in', 30000, 180, 'CNY', 'paid', '2026-10-20 10:10:00', '2026-10-20'),
        B(4, 'wechat', 'WX-1004', 'ORD-1004', null, 'in', 15000, 90, 'CNY', 'paid', '2026-10-20 10:15:00', '2026-10-20')
      ]
    },
    error: {
      locals: [
        L('L01', 'ORD-2001', 'alipay', 'in', 10000, 60, 'CNY', 'paid', 'ALI-9001', null, null, '2026-10-20 10:00:00', '2026-10-20'),
        L('L02', 'ORD-2002', 'wechat', 'in', 20000, 120, 'CNY', 'paid', 'WX-9002', null, null, '2026-10-20 10:05:00', '2026-10-20'),
        L('L03', 'ORD-2003', 'alipay', 'in', 30000, 180, 'CNY', 'paid', 'ALI-9003', null, null, '2026-10-20 10:10:00', '2026-10-20'),
        L('L04', 'ORD-2004', 'wechat', 'in', 15000, 90, 'CNY', 'paid', 'WX-9004', null, null, '2026-10-20 10:15:00', '2026-10-20'),
        L('L05', 'ORD-2005', 'alipay', 'in', 8800, 53, 'CNY', 'paid', 'ALI-9005', null, null, '2026-10-20 10:20:00', '2026-10-20'),
        L('L06', 'ORD-2006', 'wechat', 'out', 5000, 30, 'CNY', 'paid', 'WX-R9006', 'RF-9006', 'ORD-2003', '2026-10-20 10:25:00', '2026-10-20'),
        L('L07', 'ORD-2007', 'wechat', 'in', 12000, 72, 'CNY', 'paid', 'WX-9007', null, null, '2026-10-20 10:30:00', '2026-10-20'),
        L('L08', 'ORD-2008', 'alipay', 'in', 7000, 42, 'CNY', 'paid', null, null, null, '2026-10-20 10:35:00', '2026-10-20'),
        L('L09', 'ORD-2009', 'alipay', 'in', 10000, 60, 'CNY', 'paid', 'ALI-9009', null, null, '2026-10-20 10:40:00', '2026-10-20'),
        L('L10', 'ORD-2010', 'wechat', 'in', 6000, 36, 'CNY', 'paid', 'WX-9010', null, null, '2026-10-20 10:45:00', '2026-10-20'),
        L('L11', 'ORD-2011', 'alipay', 'in', 4000, 24, 'CNY', 'paid', 'ALI-9011', null, null, '2026-10-20 10:50:00', '2026-10-20'),
        L('L12', 'ORD-2012', 'wechat', 'in', 2500, 15, 'CNY', 'closed', 'WX-9012', null, null, '2026-10-20 10:55:00', '2026-10-20'),
        L('L13', 'ORD-2013', 'alipay', 'in', 50000, 300, 'CNY', 'paid', null, null, null, '2026-10-19 23:55:00', '2026-10-19'),
        L('L14', 'ORD-2014', 'wechat', 'in', 7500, 45, 'CNY', 'paid', null, null, null, '2026-10-20 11:00:00', '2026-10-20'),
        L('L15', 'ORD-2015', 'alipay', 'in', 3300, 20, 'CNY', 'paid', 'ALI-9015', null, null, '2026-10-20 11:05:00', '2026-10-20'),
        L('L16', 'ORD-2016', 'wechat', 'in', 6600, 40, 'CNY', 'paid', null, null, null, '2026-10-20 11:10:00', '2026-10-20')
      ],
      bills: [
        B(1, 'alipay', 'ALI-9001', 'ORD-2001', null, 'in', 10000, 60, 'CNY', 'paid', '2026-10-20 10:00:00', '2026-10-20'),
        B(2, 'wechat', 'WX-9002', 'ORD-2002', null, 'in', 20000, 120, 'CNY', 'paid', '2026-10-20 10:05:00', '2026-10-20'),
        B(3, 'alipay', 'ALI-9003', 'ORD-2003', null, 'in', 30000, 180, 'CNY', 'paid', '2026-10-20 10:10:00', '2026-10-20'),
        B(4, 'wechat', 'WX-9004', 'ORD-2004', null, 'in', 15000, 90, 'CNY', 'paid', '2026-10-20 10:15:00', '2026-10-20'),
        B(5, 'alipay', 'ALI-9005', 'ORD-X2005', null, 'in', 8800, 53, 'CNY', 'paid', '2026-10-20 10:20:00', '2026-10-20'),
        B(6, 'wechat', 'WX-R9006-BILL', null, 'RF-9006', 'out', 5000, 30, 'CNY', 'paid', '2026-10-20 10:25:00', '2026-10-20'),
        B(7, 'alipay', 'ALI-9009', 'ORD-2009', null, 'in', 9900, 60, 'CNY', 'paid', '2026-10-20 10:40:00', '2026-10-20'),
        B(8, 'wechat', 'WX-9010', 'ORD-2010', null, 'in', 6000, 30, 'CNY', 'paid', '2026-10-20 10:45:00', '2026-10-20'),
        B(9, 'alipay', 'ALI-9011', 'ORD-2011', null, 'in', 4000, 24, 'USD', 'paid', '2026-10-20 10:50:00', '2026-10-20'),
        B(10, 'wechat', 'WX-9012', 'ORD-2012', null, 'in', 2500, 15, 'CNY', 'paid', '2026-10-20 10:55:00', '2026-10-20'),
        B(11, 'alipay', 'ALI-9013', 'ORD-2013', null, 'in', 50000, 300, 'CNY', 'paid', '2026-10-20 00:05:00', '2026-10-20'),
        B(12, 'wechat', 'WX-9101', null, null, 'in', 7500, 45, 'CNY', 'paid', '2026-10-20 11:00:00', '2026-10-20'),
        B(13, 'wechat', 'WX-9102', null, null, 'in', 7500, 45, 'CNY', 'paid', '2026-10-20 11:00:00', '2026-10-20'),
        B(14, 'alipay', 'ALI-9015', 'ORD-2015', null, 'in', 3300, 20, 'CNY', 'paid', '2026-10-20 11:05:00', '2026-10-20'),
        B(15, 'alipay', 'ALI-9015', 'ORD-2015', null, 'in', 3300, 20, 'CNY', 'paid', '2026-10-20 11:05:00', '2026-10-20'),
        B(16, 'wechat', 'WX-9016', null, null, 'in', 6600, 40, 'CNY', 'paid', '2026-10-20 11:11:00', '2026-10-20'),
        B(17, 'wechat', 'WX-9999', 'ORD-9999', null, 'in', 5900, 35, 'CNY', 'paid', '2026-10-20 11:10:00', '2026-10-20'),
        B(18, 'alipay', 'ALI-9917', 'ORD-9998', 'RF-9917', 'out', 2000, 12, 'CNY', 'paid', '2026-10-20 11:15:00', '2026-10-20')
      ]
    }
  };

  var TYPE_LABEL = {
    amount_mismatch: '金额不符', fee_mismatch: '手续费不符', currency_mismatch: '币种不符',
    status_conflict: '状态冲突', local_only: '本地单边', missing_bill_row: '账单缺行',
    channel_only: '渠道单边', refund_no_origin: '退款无原单', date_slip: '跨日清算',
    dup_payment: '重复出账', ambiguous: '证据不足（歧义）'
  };
  var ATTR = {
    amount_mismatch: ['RC-AMOUNT-DIVERGED', 'high', '核对本币应结金额与红包/优惠拆分口径，差额方向以账单为准'],
    fee_mismatch: ['RC-FEE-DIVERGED', 'low', '多为费率档位或四舍五入口径，按差额绝对值排队'],
    currency_mismatch: ['RC-CURRENCY-DIVERGED', 'medium', '查我方入账是否按结算币种记账，跨境单确认换算发生在哪一侧'],
    status_conflict: ['RC-STATUS-DIVERGED', 'high', '按资金归属决定退款或补单，改状态字段不算处置'],
    local_only: ['RC-LOCAL-NOT-SETTLED', 'medium', '确认这笔是否真被清算，或账单是否缺日'],
    missing_bill_row: ['RC-BILL-ROW-MISSING', 'high', '向渠道索取该清算日全量账单并核对清算日历'],
    channel_only: ['RC-MISSING-LOCAL-ORDER', 'high', '先查下单是否落库与异步通知是否丢，再决定补单还是原路退回'],
    refund_no_origin: ['RC-REFUND-WITHOUT-ORIGIN', 'medium', '查原单是否落在别的清算日或早已处置'],
    date_slip: ['RC-SETTLEMENT-DATE-SLIP', 'low', '核对渠道清算日历，通常无需资金处置'],
    dup_payment: ['RC-DUPLICATE-SETTLEMENT', 'high', '核对是否重复清算，要渠道出账凭证'],
    ambiguous: ['RC-EVIDENCE-INSUFFICIENT', 'medium', '补足唯一标识后再配，不许按金额硬猜']
  };
  var ORDER = ['dup_payment', 'amount_mismatch', 'fee_mismatch', 'currency_mismatch', 'status_conflict', 'date_slip', 'missing_bill_row', 'local_only', 'channel_only', 'refund_no_origin', 'ambiguous'];

  var state = { scene: 'error', strategy: 'strict', result: null };

  function money(c) { return '¥' + (Number(c) / 100).toFixed(2); }
  function dir(d) { return d === 'out' ? '退款' : '收款'; }
  function minute(ts) { return ts.slice(0, 16); }
  function ts(tsStr) { return new Date(tsStr.replace(' ', 'T') + '+08:00').getTime(); }
  function deltaS(a, b) { return Math.abs(ts(a) - ts(b)) / 1000; }
  function fmtTime(tsStr) { return tsStr.slice(5, 16); }

  function finding(type, subject, localId, billRow, extra) {
    var a = ATTR[type] || ['', 'medium', ''];
    return { type: type, label: TYPE_LABEL[type] || type, code: a[0], severity: a[1], next: a[2], subject: subject, localId: localId || null, billRow: billRow == null ? null : billRow, extra: extra || '' };
  }

  function addPair(result, tier, local, bill) {
    var id = 'P' + String(result.pairs.length + 1).padStart(2, '0');
    result.pairs.push({ id: id, tier: tier, local: local, bill: bill });
    result.usedLocal[local.id] = true;
    result.usedBill[bill.row] = true;
    result.pairByLocal[local.id] = id;
    result.pairByBill[bill.row] = id;
  }

  function postChecks(result, local, bill) {
    if (local.amount !== bill.amount) result.findings.push(finding('amount_mismatch', local.out, local.id, bill.row, money(local.amount) + ' vs ' + money(bill.amount)));
    if (local.fee !== bill.fee) result.findings.push(finding('fee_mismatch', local.out, local.id, bill.row, money(local.fee) + ' vs ' + money(bill.fee)));
    if (local.currency !== bill.currency) result.findings.push(finding('currency_mismatch', local.out, local.id, bill.row, local.currency + ' vs ' + bill.currency));
    if (local.status !== bill.status) result.findings.push(finding('status_conflict', local.out, local.id, bill.row, local.status + ' vs ' + bill.status));
  }

  function strictMatch(locals, bills) {
    var result = { pairs: [], findings: [], usedLocal: {}, usedBill: {}, pairByLocal: {}, pairByBill: {}, heldBill: {}, ambiguous: 0 };
    var dupRows = {};
    var groups = {};
    bills.forEach(function (b) {
      var key = b.channel + '|' + b.txn;
      (groups[key] = groups[key] || []).push(b);
    });
    Object.keys(groups).forEach(function (k) {
      var arr = groups[k];
      if (arr.length > 1) {
        arr.slice(1).forEach(function (b) {
          dupRows[b.row] = true;
          result.findings.push(finding('dup_payment', '渠道流水 ' + b.txn, null, b.row, '同一流水号出现 ' + arr.length + ' 行'));
        });
      }
    });
    var avail = bills.filter(function (b) { return !dupRows[b.row]; });

    function tryL1(tier, matchFn) {
      locals.forEach(function (l) {
        if (result.usedLocal[l.id]) return;
        var cands = avail.filter(function (b) {
          return !result.usedBill[b.row] && b.clearDate === l.clearDate && matchFn(l, b);
        });
        if (cands.length === 1) addPair(result, tier, l, cands[0]);
        else if (cands.length > 1) {
          result.ambiguous++;
          result.findings.push(finding('ambiguous', l.out, l.id, null, '严格键命中 ' + cands.length + ' 行'));
          result.usedLocal[l.id] = 'ambiguous';
          cands.forEach(function (b) { result.heldBill[b.row] = true; });
        }
      });
    }

    tryL1('L1a', function (l, b) { return b.channel === l.channel && b.direction === l.direction && b.out && b.out === l.out; });
    tryL1('L1b', function (l, b) { return l.txn && b.channel === l.channel && b.direction === l.direction && b.txn === l.txn; });
    tryL1('L1c', function (l, b) {
      return l.direction === 'out' && l.refund && b.refund === l.refund && b.amount === l.amount;
    });

    function residualLocals() {
      return locals.filter(function (l) { return !result.usedLocal[l.id]; });
    }
    function residualBills() {
      return avail.filter(function (b) { return !result.usedBill[b.row] && !result.heldBill[b.row]; });
    }

    function tryL2a() {
      var ls = residualLocals(), bs = residualBills();
      var byKeyL = {}, byKeyB = {};
      function key(x) { return x.channel + '|' + x.direction + '|' + x.amount + '|' + minute(x.time); }
      ls.forEach(function (l) { (byKeyL[key(l)] = byKeyL[key(l)] || []).push(l); });
      bs.forEach(function (b) { (byKeyB[key(b)] = byKeyB[key(b)] || []).push(b); });
      ls.forEach(function (l) {
        if (result.usedLocal[l.id]) return;
        var k = key(l);
        var cands = byKeyB[k] || [];
        if (!cands.length) return;
        if (cands.length === 1 && (byKeyL[k] || []).length === 1) addPair(result, 'L2a', l, cands[0]);
        else {
          result.ambiguous++;
          result.findings.push(finding('ambiguous', l.out, l.id, null, '降级键命中 ' + cands.length + ' 行'));
          result.usedLocal[l.id] = 'ambiguous';
          cands.forEach(function (b) { result.heldBill[b.row] = true; });
        }
      });
    }

    function tryL2b() {
      var ls = residualLocals(), bs = residualBills();
      ls.forEach(function (l) {
        if (result.usedLocal[l.id]) return;
        var cands = bs.filter(function (b) {
          return !result.usedBill[b.row] && b.channel === l.channel && b.direction === l.direction && b.amount === l.amount && deltaS(l.time, b.time) <= 90;
        });
        if (!cands.length) return;
        var b = cands[0];
        var reverse = ls.filter(function (x) {
          return !result.usedLocal[x.id] && x.channel === b.channel && x.direction === b.direction && x.amount === b.amount && deltaS(x.time, b.time) <= 90;
        });
        if (cands.length === 1 && reverse.length === 1) addPair(result, 'L2b', l, b);
        else {
          result.ambiguous++;
          result.findings.push(finding('ambiguous', l.out, l.id, null, '90 秒窗口命中 ' + cands.length + ' 行'));
          result.usedLocal[l.id] = 'ambiguous';
          cands.forEach(function (b) { result.heldBill[b.row] = true; });
        }
      });
    }

    tryL2a();
    tryL2b();

    /* L3：今天没配上，但在更晚的账单文件里被严格键命中。 */
    residualLocals().forEach(function (l) {
      if (result.usedLocal[l.id]) return;
      var cands = residualBills().filter(function (b) {
        return b.clearDate > l.clearDate && b.channel === l.channel && ((b.out && b.out === l.out) || (l.txn && b.txn === l.txn));
      });
      if (cands.length === 1) {
        addPair(result, 'L3', l, cands[0]);
        result.findings.push(finding('date_slip', l.out, l.id, cands[0].row, l.clearDate + ' → ' + cands[0].clearDate));
      }
    });

    result.pairs.forEach(function (p) { postChecks(result, p.local, p.bill); });

    residualLocals().forEach(function (l) {
      if (result.usedLocal[l.id]) return;
      if (l.status === 'closed') return;
      var type = l.txn ? 'missing_bill_row' : 'local_only';
      result.findings.push(finding(type, l.out, l.id, null, l.txn ? '回调有渠道号 ' + l.txn : '没有渠道号'));
    });
    residualBills().forEach(function (b) {
      var type = b.direction === 'out' ? 'refund_no_origin' : 'channel_only';
      result.findings.push(finding(type, b.txn, null, b.row, ''));
    });

    result.findings.sort(function (a, b) { return ORDER.indexOf(a.type) - ORDER.indexOf(b.type); });
    return result;
  }

  function naiveMatch(locals, bills) {
    var result = { pairs: [], findings: [], usedLocal: {}, usedBill: {}, pairByLocal: {}, pairByBill: {}, heldBill: {}, ambiguous: 0 };
    locals.forEach(function (l) {
      var cand = bills.find(function (b) {
        return !result.usedBill[b.row] && b.channel === l.channel && b.direction === l.direction && b.amount === l.amount;
      });
      if (cand) addPair(result, 'NAIVE', l, cand);
    });
    result.pairs.forEach(function (p) { postChecks(result, p.local, p.bill); });
    locals.forEach(function (l) {
      if (result.usedLocal[l.id]) return;
      if (l.status === 'closed') return;
      var type = l.txn ? 'missing_bill_row' : 'local_only';
      result.findings.push(finding(type, l.out, l.id, null, l.txn ? '回调有渠道号 ' + l.txn : '没有渠道号'));
    });
    bills.forEach(function (b) {
      if (result.usedBill[b.row]) return;
      var type = b.direction === 'out' ? 'refund_no_origin' : 'channel_only';
      result.findings.push(finding(type, b.txn, null, b.row, ''));
    });
    result.findings.sort(function (a, b) { return ORDER.indexOf(a.type) - ORDER.indexOf(b.type); });
    return result;
  }

  function run(scene, strategy) {
    var data = DATA[scene];
    return strategy === 'strict' ? strictMatch(data.locals, data.bills) : naiveMatch(data.locals, data.bills);
  }

  function typeSet(result) {
    var set = {};
    result.findings.forEach(function (f) { set[f.type] = true; });
    return Object.keys(set);
  }

  function renderKpis(result) {
    var types = typeSet(result);
    var coverage = state.scene === 'error' ? types.length + '/11 类' : '无差错';
    $('reconKpis').innerHTML =
      '<div class="lab-kpi"><div class="v">' + result.pairs.length + '</div><div class="l">配对数</div></div>' +
      '<div class="lab-kpi bad"><div class="v">' + result.findings.length + '</div><div class="l">差异条数</div></div>' +
      '<div class="lab-kpi warn"><div class="v">' + result.findings.filter(function (f) { return f.type === 'ambiguous'; }).length + '</div><div class="l">歧义（不硬猜）</div></div>' +
      '<div class="lab-kpi ok"><div class="v">' + coverage + '</div><div class="l">差错类型覆盖</div></div>';
  }

  function renderTables(result) {
    var locals = DATA[state.scene].locals;
    var bills = DATA[state.scene].bills;
    var lf = {}, bf = {};
    result.findings.forEach(function (f) {
      if (f.localId) lf[f.localId] = (lf[f.localId] || []).concat(f);
      if (f.billRow != null) bf[f.billRow] = (bf[f.billRow] || []).concat(f);
    });
    function cls(map, id) {
      if (!map[id]) return '';
      var hasBad = map[id].some(function (f) { return f.type !== 'ambiguous'; });
      return hasBad ? 'bad' : 'warn';
    }
    var lh = '<div class="lab-table-wrap"><table class="lab-table"><thead><tr><th>单号</th><th>渠道</th><th>方向</th><th>金额</th><th>渠道流水号</th><th>状态</th><th>结果</th></tr></thead><tbody>';
    locals.forEach(function (l) {
      var pid = result.pairByLocal[l.id];
      var issues = lf[l.id] || [];
      var rowCls = issues.length ? cls(lf, l.id) : (pid ? 'matched' : '');
      var cell = (pid ? '<span class="pair">' + pid + '</span> ' : '') +
        issues.map(function (f) { return '<span class="lab-chip ' + (f.type === 'ambiguous' ? 'warn' : 'bad') + '">' + esc(f.label) + '</span>'; }).join(' ');
      lh += '<tr class="' + rowCls + '"><td>' + esc(l.out) + '</td><td>' + esc(l.channel) + '</td><td>' + esc(dir(l.direction)) + '</td><td class="num">' + money(l.amount) + '</td><td>' + esc(l.txn || '—') + '</td><td>' + esc(l.status) + '</td><td>' +
        (cell || '<span class="muted">—</span>') + '</td></tr>';
    });
    lh += '</tbody></table></div>';
    $('reconLocalTable').innerHTML = lh;

    var bh = '<div class="lab-table-wrap"><table class="lab-table"><thead><tr><th>行</th><th>渠道</th><th>流水号</th><th>原单号</th><th>方向</th><th>金额</th><th>手续费</th><th>币种</th><th>清算日</th><th>结果</th></tr></thead><tbody>';
    bills.forEach(function (b) {
      var pid = result.pairByBill[b.row];
      var issues = bf[b.row] || [];
      var rowCls = issues.length ? cls(bf, b.row) : (pid ? 'matched' : '');
      var cell = (pid ? '<span class="pair">' + pid + '</span> ' : '') +
        issues.map(function (f) { return '<span class="lab-chip ' + (f.type === 'ambiguous' ? 'warn' : 'bad') + '">' + esc(f.label) + '</span>'; }).join(' ');
      if (!cell && result.heldBill[b.row]) {
        rowCls = 'warn';
        cell = '<span class="lab-chip warn">候选未定</span>';
      }
      bh += '<tr class="' + rowCls + '"><td>' + b.row + '</td><td>' + esc(b.channel) + '</td><td>' + esc(b.txn) + '</td><td>' + esc(b.out || '—') + '</td><td>' + esc(dir(b.direction)) + '</td><td class="num">' + money(b.amount) + '</td><td class="num">' + money(b.fee) + '</td><td>' + esc(b.currency) + '</td><td>' + esc(b.clearDate) + '</td><td>' +
        (cell || '<span class="muted">—</span>') + '</td></tr>';
    });
    bh += '</tbody></table></div>';
    $('reconBillTable').innerHTML = bh;
  }

  function renderFindings(result) {
    var host = $('reconFindings');
    if (!result.findings.length) {
      host.innerHTML = '<div class="lab-empty">本次没有差异。正常日的每一笔都能在严格键上唯一配对。</div>';
      return;
    }
    host.innerHTML = result.findings.map(function (f) {
      var cls = f.type === 'ambiguous' ? 'warn' : 'bad';
      return '<div class="lab-finding ' + (f.type === 'ambiguous' ? '' : '') + '"><div class="top"><span class="type">' + esc(f.label) + '</span><span class="subject">' + esc(f.subject || '') + '</span><span class="lab-chip ' + cls + '">' + esc(f.severity) + '</span><span class="lab-chip info">' + esc(f.code) + '</span></div><div class="next">' + esc(f.next) + (f.extra ? ' · ' + esc(f.extra) : '') + '</div></div>';
    }).join('');
  }

  function renderCompare() {
    if (state.scene !== 'error') {
      $('reconCompare').innerHTML = '<div class="lab-empty">正常日没有差错，两种策略都应配出 4 对、0 条差异。切到“差错日”再看对照。</div>';
      return;
    }
    var strict = run('error', 'strict');
    var naive = run('error', 'naive');
    var st = typeSet(strict), nt = typeSet(naive);
    var missed = st.filter(function (t) { return nt.indexOf(t) < 0; });
    function row(name, res, types, cls) {
      var coverage = types.length + '/11';
      return '<div class="lab-finding ' + cls + '"><div class="top"><span class="type">' + name + '</span><span class="lab-chip ' + (types.length >= 11 ? 'ok' : 'warn') + '">覆盖 ' + coverage + '</span><span class="subject">' + res.pairs.length + ' 对 / ' + res.findings.length + ' 条差异</span></div><div class="next">' + (types.length ? types.map(function (t) { return TYPE_LABEL[t] || t; }).join('、') : '无') + '</div></div>';
    }
    $('reconCompare').innerHTML =
      row('先配对，后判定（项目实现）', strict, st, 'ok') +
      row('先比金额（反例）', naive, nt, 'bad') +
      '<div class="lab-note"><strong>漏掉的 4 类：</strong>' + missed.map(function (t) { return TYPE_LABEL[t] || t; }).join('、') + '。先比金额会把一笔金额不符拆成“本地单边 + 渠道单边”，看起来差异更多，但类型和下一步都错了；它还会把金额相同的两笔硬配成一对，把重复出账当成普通单边。</div>';
  }

  function render() {
    var data = DATA[state.scene];
    var result = run(state.scene, state.strategy);
    state.result = result;
    renderKpis(result);
    renderTables(result);
    renderFindings(result);
    renderCompare();
    var note = state.scene === 'error'
      ? (state.strategy === 'strict'
        ? '严格匹配按 L1 → L2 → L3 的顺序跑；L2 只在残差集上找，且要求双向唯一。歧义会停住，不继续往下猜。'
        : '先比金额把“金额相同”当成同一笔。它能配上一部分，但金额不符会裂成两条单边，重复出账和跨日也会被掩盖。')
      : '正常日：4 笔都能在严格键上唯一配对，没有差异。';
    $('reconNote').textContent = note;
  }

  function setActive(container, attr, value) {
    document.querySelectorAll(container + ' [data-' + attr + ']').forEach(function (b) {
      b.classList.toggle('primary', b.getAttribute('data-' + attr) === value);
    });
  }

  $('reconRun').addEventListener('click', render);
  $('reconReset').addEventListener('click', function () {
    state.scene = 'error'; state.strategy = 'strict';
    setActive('#reconScenes', 'scene', 'error');
    setActive('#reconStrategies', 'strategy', 'strict');
    render();
  });
  document.querySelectorAll('#reconScenes [data-scene]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.scene = b.getAttribute('data-scene');
      setActive('#reconScenes', 'scene', state.scene);
      render();
    });
  });
  document.querySelectorAll('#reconStrategies [data-strategy]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.strategy = b.getAttribute('data-strategy');
      setActive('#reconStrategies', 'strategy', state.strategy);
      render();
    });
  });

  render();
})();
