// 쇼핑몰 1:1 문의하기 (user/support.html#inquiry) — 접수·내역·접수 취소. 로그인 회원만 사용
//   member-data.js(회원·저장 키), order-data.js(주문), inquiry-settings.js(문의 유형), inquiry-data.js(관리자 문의 목록) 다음에 로드
//   접수한 문의는 localStorage(MemberData.USER_INQ_KEY)에 저장하고 관리자 1:1 문의(InquiryData)에 바로 추가 → 게시글관리 > 1:1 문의 '대기' 탭·회원 상세 문의 이력에 보임
//   주문 선택: 최근 3개월 주문의 상품을 여러 개 고를 수 있음 (모든 유형에서 선택 입력)
//   접수 취소: 담당자가 확인하기 전(관리자 상태 '대기')인 고객 접수 건만. 취소하면 목록에서 지워짐
// TODO: 실서비스에서는 GET /api/members/me/order-items?months=3&q=&page=, POST /api/inquiries, GET /api/members/me/inquiries, DELETE /api/inquiries/{no}
(function () {
  'use strict';
  const MD = window.MemberData, ID = window.InquiryData, S = window.InquirySettings, OD = window.OrderData;
  const pad = n => String(n).padStart(2, '0');
  const dateText = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const nowText = () => { const d = new Date(); return `${dateText(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const clean = s => String(s || '').trim().replace(/[ \t]+/g, ' ');
  const TITLE_MAX = 100, CONTENT_MAX = 5000;
  const ITEM_MONTHS = 3, ITEM_MAX = 20;   // 주문 상품: 최근 3개월, 한 문의에 최대 20개
  // 첨부: 이미지·PDF·문서, 파일당 10MB, 최대 5개 (프로토타입은 파일명만 저장)
  const FILE_RULE = { max: 5, sizeMB: 10, ext: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'hwp', 'hwpx', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip'] };
  // 문의 유형: 1:1 문의 설정에서 사용 중인 유형 (없으면 기본 유형)
  const TYPES = () => (S && S.activeTypeNames ? S.activeTypeNames() : (MD.INQ_TYPES || ['주문/결제', '배송', '상품', '교환/반품', '회원정보', '기타']));
  const STATUS_TEXT = { '대기': '답변대기', '확인중': '답변대기', '완료': '답변완료' };   // 고객 화면 표기

  const save = () => { try { localStorage.setItem(MD.USER_INQ_KEY, JSON.stringify(MD.userInquiries)); return true; } catch (e) { return false; } };
  const nextNo = () => Math.max(900000, ...MD.userInquiries.map(r => Number(r.no) || 0)) + 1;

  // ===== 주문 상품 =====
  // 최근 3개월 시작일 (오늘 기준 3개월 전 같은 날)
  const sinceDate = () => { const d = new Date(); d.setMonth(d.getMonth() - ITEM_MONTHS); return dateText(d); };
  const itemKey = (orderNo, idx) => `${orderNo}#${idx}`;
  const itemState = it => (it.payStatus === '취소' ? '취소' : it.status || it.payStatus || '');
  // 회원의 최근 3개월 주문 상품 (주문일 최신순, 같은 주문은 상품 순서대로)
  //   반환: [{ key, orderNo, idx, orderedAt, orderDate, name, category, qty, paid, state, kinds(주문의 상품 수) }]
  function orderItems(member) {
    if (!member || !OD) return [];
    const since = sinceDate();
    return OD.ORDERS.filter(o => o.userId === member.userId && o.orderDate >= since)
      .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt))
      .flatMap(o => o.items.map((it, idx) => ({
        key: itemKey(o.orderNo, idx), orderNo: o.orderNo, idx, orderedAt: o.orderedAt, orderDate: o.orderDate,
        name: it.name, category: it.category, qty: it.qty, paid: it.paid, state: itemState(it), kinds: o.items.length
      })));
  }
  // 목록 검색·기간·페이지 (주문이 많아도 화면에는 한 페이지씩)
  //   opt = { q(상품명·주문번호), months(1|2|3, 기본 3), state(진행상태 또는 ''), page(1~), size(기본 20) }
  //   반환: { rows, total, page, pages, states(고를 수 있는 진행상태 목록) }
  function searchItems(member, opt) {
    const o = Object.assign({ q: '', months: ITEM_MONTHS, state: '', page: 1, size: 20 }, opt || {});
    const all = orderItems(member);
    const from = (() => { const d = new Date(); d.setMonth(d.getMonth() - Math.min(ITEM_MONTHS, Math.max(1, Number(o.months) || ITEM_MONTHS))); return dateText(d); })();
    const kw = clean(o.q).toLowerCase();
    const list = all.filter(it => it.orderDate >= from && (!o.state || it.state === o.state)
      && (!kw || it.name.toLowerCase().includes(kw) || it.category.toLowerCase().includes(kw) || it.orderNo.includes(kw)));
    const pages = Math.max(1, Math.ceil(list.length / o.size)), page = Math.min(Math.max(1, Number(o.page) || 1), pages);
    return { rows: list.slice((page - 1) * o.size, page * o.size), total: list.length, page, pages, states: [...new Set(all.map(it => it.state).filter(Boolean))] };
  }
  // 주문 단위 목록 (쇼핑몰 주문 상품 선택은 주문번호 아코디언 → 펼치면 상품). 검색·진행상태에 맞는 상품이 있는 주문만, 펼치면 그 상품만
  //   opt는 searchItems와 같음 (size = 한 페이지 주문 수, 기본 10)
  //   반환: { rows: [{ orderNo, orderDate, orderedAt, kinds, items[] }], total(주문 수), totalItems(상품 수), page, pages, states }
  function searchOrders(member, opt) {
    const o = Object.assign({ size: 10 }, opt || {});
    const all = searchItems(member, Object.assign({}, o, { page: 1, size: 100000 }));
    const groups = [];
    all.rows.forEach(it => {
      const g = groups[groups.length - 1];
      if (g && g.orderNo === it.orderNo) g.items.push(it);
      else groups.push({ orderNo: it.orderNo, orderDate: it.orderDate, orderedAt: it.orderedAt, kinds: it.kinds, items: [it] });
    });
    const pages = Math.max(1, Math.ceil(groups.length / o.size)), page = Math.min(Math.max(1, Number(o.page) || 1), pages);
    return { rows: groups.slice((page - 1) * o.size, page * o.size), total: groups.length, totalItems: all.total, page, pages, states: all.states };
  }
  const findItem = (member, key) => orderItems(member).find(it => it.key === key) || null;

  // 본문 HTML 정리: 허용 태그(b i u strong em ul ol li a br p div)만 남기고 나머지는 텍스트로. 링크는 http(s)만
  function sanitize(html) {
    const root = document.createElement('div');
    root.innerHTML = String(html || '');
    const ALLOW = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', UL: 'ul', OL: 'ol', LI: 'li', A: 'a', BR: 'br', P: 'p', DIV: 'p' };
    const walk = node => [...node.childNodes].map(n => {
      if (n.nodeType === 3) return n.textContent.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      if (n.nodeType !== 1) return '';
      const tag = ALLOW[n.tagName];
      const inner = walk(n);
      if (!tag) return inner;
      if (tag === 'br') return '<br>';
      if (tag === 'a') { const href = String(n.getAttribute('href') || ''); return /^https?:\/\//i.test(href) ? `<a href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noopener">${inner}</a>` : inner; }
      return `<${tag}>${inner}</${tag}>`;
    }).join('');
    return walk(root).replace(/(<p><\/p>)+/g, '').trim();
  }
  const textOf = html => { const d = document.createElement('div'); d.innerHTML = String(html || '').replace(/<\/(p|div|li)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n'); return d.textContent.replace(/\n{3,}/g, '\n\n').trim(); };

  // 접수. input = { member(로그인 회원, 필수), type, items[주문 상품 key], title, contentHtml, files[(파일명)] }
  //   반환: { ok: true, no, inquiryNo } 또는 { error, field }  (field: login|type|items|title|content|files|'')
  function submit(input) {
    const err = (error, field) => ({ error, field });
    const m = input.member && MD.members.find(x => x.no === input.member.no && !x.withdrawn);
    if (!m) return err('로그인 후 문의할 수 있습니다.', 'login');
    const type = clean(input.type), title = clean(input.title), contentHtml = sanitize(input.contentHtml), content = textOf(contentHtml);
    if (!TYPES().includes(type)) return err('문의 유형을 선택해 주세요.', 'type');
    const keys = [...new Set(input.items || [])];
    if (keys.length > ITEM_MAX) return err(`주문 상품은 ${ITEM_MAX}개까지 선택할 수 있습니다.`, 'items');
    const picked = keys.map(k => findItem(m, k));
    if (picked.some(it => !it)) return err(`최근 ${ITEM_MONTHS}개월 주문 상품만 선택할 수 있습니다. 목록에서 다시 선택해 주세요.`, 'items');
    if (!title) return err('문의 제목을 입력해 주세요.', 'title');
    if (title.length > TITLE_MAX) return err(`제목은 ${TITLE_MAX}자 이내로 입력해 주세요.`, 'title');
    if (!content) return err('문의 내용을 입력해 주세요.', 'content');
    if (content.length > CONTENT_MAX) return err(`문의 내용은 ${CONTENT_MAX.toLocaleString()}자 이내로 입력해 주세요.`, 'content');
    const files = (input.files || []).map(f => String(f)).slice(0, FILE_RULE.max);
    const badFile = files.find(f => !FILE_RULE.ext.includes(f.split('.').pop().toLowerCase()));
    if (badFile) return err(`첨부할 수 없는 파일입니다: ${badFile}`, 'files');
    const at = nowText();
    const orderItemsRec = picked.map(it => ({ orderNo: it.orderNo, idx: it.idx, name: it.name, category: it.category, qty: it.qty }));
    const rec = { no: nextNo(), memberNo: m.no, type, title, content, contentHtml, orderItems: orderItemsRec, files, at, status: '답변대기', user: true };
    MD.userInquiries.unshift(rec);
    if (!save()) { MD.userInquiries.shift(); return err('문의를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', ''); }
    (m.inquiries || (m.inquiries = [])).unshift(Object.assign({ answeredAt: '', answer: '', answeredBy: '' }, rec));
    const added = ID ? ID.addFromUser(rec, m) : null;
    const inquiryNo = added ? added.inquiryNo : `Q${at.slice(0, 10).replace(/-/g, '')}-${String(rec.no).padStart(5, '0')}`;
    // 접수 확인 알림 기록 (관리자 > 메시지 > SMS/이메일 발송 내역)
    if (window.MessageStore) MessageStore.addLog({ channel: 'sms', templateId: '', templateName: '1:1 문의 접수 확인', ad: false, count: 1, success: 1, fail: 0, reserveAt: '', by: '시스템', recipients: [{ memberNo: m.no, to: m.phone, ok: true }],
      sample: `[스탑북] ${m.name}님의 1:1 문의(${inquiryNo})가 접수되었습니다. 답변이 등록되면 알림으로 안내드립니다.` });
    return { ok: true, no: rec.no, inquiryNo };
  }

  // 고객 화면용 문의 항목 (관리자 상태 → 답변대기/답변완료, 답변 HTML, 취소 가능 여부)
  const view = q => Object.assign({}, q, {
    statusText: STATUS_TEXT[q.status] || q.status,
    answerHtml: q.status === '완료' ? (q.replyHtml || ID.textToHtml(q.answer)) : '',
    cancelable: !!q.user && q.status === '대기'
  });
  // 로그인 회원의 문의 내역 (최근 순). 항목의 orderItems = 고른 주문 상품, orderNos = 연결 주문
  const mine = member => (ID && member ? ID.inquiries.filter(q => q.member && q.member.no === member.no).map(view) : []);
  // 접수 취소: 본인의 고객 접수 건 + 관리자 상태 '대기'만. 반환: 오류 문구 또는 ''
  function cancel(no, member) {
    const q = ID && ID.find(no);
    if (!member || !q || !q.user || !(q.member && q.member.no === member.no)) return '취소할 수 없는 문의입니다.';
    if (q.status !== '대기') return q.status === '완료' ? '이미 답변이 등록된 문의는 취소할 수 없습니다.' : '담당자가 확인 중인 문의는 취소할 수 없습니다. 고객센터(080-860-1119)로 문의해 주세요.';
    const i = MD.userInquiries.findIndex(r => String(r.no) === String(no));
    if (i >= 0) MD.userInquiries.splice(i, 1);
    if (!save()) return '취소를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    q.member.inquiries = (q.member.inquiries || []).filter(x => String(x.no) !== String(no));
    ID.removeUser(no);
    return '';
  }

  window.UserInquiry = { TYPES, TITLE_MAX, CONTENT_MAX, FILE_RULE, ITEM_MONTHS, ITEM_MAX, STATUS_TEXT, orderItems, searchItems, searchOrders, sanitize, textOf, submit, mine, cancel };
})();
