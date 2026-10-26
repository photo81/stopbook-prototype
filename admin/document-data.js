// 서류 발급 데이터 (클레임관리 > 서류 발급 관리)
// member-type-store.js, member-data.js, order-data.js 다음에 로드
//   자동 발급 이력: 고객이 쇼핑몰(주문서·마이페이지·주문 상세)에서 요청하면 시스템이 바로 만들어 내려주는 서류의 발급 기록
//     사업자등록증·통장사본 = 회사(스탑북) 서류 (고객사 결제·거래처 등록용), 견적서·거래내역서 = 주문 기준으로 자동 생성
//     현금영수증·세금계산서 = 결제 시 요청(order-data.js payment.docType) → 결제 확인 후 자동 발급
//   별도 발급 신청: 자동 발급으로는 안 되는 서류(기관 양식·직인 날인·수신처 변경·납품서·세금계산서 수정 등)를 고객이 따로 신청한 건.
//     주문 전 견적서 요청처럼 주문과 연결되지 않은 신청도 있음 (orderNo 없음 → customer = { name, phone, email, company })
//     관리자가 서류를 만들어 전달(발급 완료)하거나 반려. 처리한 신청은 localStorage에 통째로 보관해 다시 열 때 그대로 복원
// TODO: 실서비스에서는 GET /api/admin/documents/issues, GET /api/admin/documents/requests, POST /api/admin/documents/requests/{reqNo}/complete|reject
(function () {
  'use strict';
  const { ORDERS, TODAY } = OrderData;
  // v2: 증빙서류·영수증을 따로 접수하면서 신청 구조가 바뀜 (v1에 저장된 처리 결과는 쓰지 않음)
  const KEYS = { requests: 'stopbook.docRequests.v2', issues: 'stopbook.docIssues.v1' };
  const DAY = 86400000, HOUR = 3600000;
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtDt = d => `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const daysAgo = n => fmtDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - n));
  const nowText = () => fmtDt(new Date());
  const toTime = s => new Date(s.replace(' ', 'T')).getTime();
  const clampNow = t => new Date(Math.min(TODAY.getTime() + DAY - 60000, t));
  const hash = (s, seed) => [...s].reduce((h, c) => (h * 73 + c.charCodeAt(0)) % 233280, seed);
  const rng = (s, seed) => { let x = hash(s, seed); return () => (x = (x * 9301 + 49297) % 233280) / 233280; };
  const pick = (arr, r) => arr[Math.floor(r() * arr.length)];

  const STATUS_TEXT = { '대기': '처리 대기', '완료': '발급 완료', '반려': '반려' };
  // 자동 발급 서류 종류 (발급 경로)
  const AUTO_TYPES = ['사업자등록증', '통장사본', '견적서', '거래내역서', '현금영수증', '세금계산서'];
  const CHANNEL_OF = { '사업자등록증': '마이페이지', '통장사본': '마이페이지', '견적서': '주문서', '거래내역서': '주문 상세', '현금영수증': '결제 확인', '세금계산서': '결제 확인' };
  // 별도 발급 신청 서류 종류 + 신청 샘플의 요청 사항
  const REQUEST_TYPES = ['사업자등록증', '통장사본', '견적서', '거래내역서', '납품서', '세금계산서', '현금영수증', '기타'];
  // 서류 구분: 영수증(세금계산서·현금영수증) = 별도 전산에서 발급하고 처리일자·처리자명만 기록 / 증빙서류(나머지) = 관리자가 만들어 전달
  const RECEIPT_TYPES = ['세금계산서', '현금영수증'];
  const PROOF_TYPES = REQUEST_TYPES.filter(t => !RECEIPT_TYPES.includes(t));
  const groupOf = t => (RECEIPT_TYPES.includes(t) ? '영수증' : '증빙서류');
  const TAX_KINDS = ['영수', '청구'];          // 세금계산서 영수/청구 구분
  const CASH_PURPOSES = ['소득공제', '지출증빙'];   // 현금영수증 발급 방식
  const REQUIREMENTS = {
    '견적서': ['기관 제출용 견적서 (공급가액·부가세 분리 표기, 담당자 직인 날인 필요)', '견적 유효기간 30일로 표기하고 수신처를 "○○초등학교 행정실"로 넣어 주세요.', '품목을 "포토북 제작" 한 줄로 합산 표기한 견적서가 필요합니다.'],
    '거래내역서': ['학교 행정실 제출용 (첨부한 기관 양식에 맞춰 작성, 직인 날인)', '수신처를 사업자명이 아닌 "○○유치원"으로 변경해서 발급해 주세요.', '회계 감사용 거래내역서 (최근 1년 거래 내역 포함)', '지원금 정산용 거래내역서'],
    '납품서': ['납품일·납품 수량 확인 서명이 들어간 납품서 (기관 양식 첨부)', '지출 증빙용 납품서, 담당자 날인 필요'],
    '세금계산서': ['사업자등록번호를 잘못 넣었습니다. 올바른 번호로 수정발행 요청드립니다.', '공급받는자 상호가 바뀌어 수정발행이 필요합니다.', '결제 시 요청하지 못했습니다. 세금계산서 발행 부탁드립니다.'],
    '현금영수증': ['지출증빙용 현금영수증 발행 요청 (사업자번호 기재)', '결제 후 소득공제용 현금영수증 발급 요청'],
    '사업자등록증': ['원본대조필 직인 날인본이 필요합니다. (우편 수령)', '거래처 등록용, 스캔본 외 날인본으로 이메일 송부 요청'],
    '통장사본': ['원본대조필 직인 날인본 (기관 회계 제출용)'],
    '기타': ['입금확인서 (입금일·입금액 기재) 발급 요청', '계약서(공급 계약) 양식 송부 요청']
  };
  const RECEIVE_METHODS = ['이메일', '팩스', '우편'];
  // 통장사본: 무통장입금 주문은 가상계좌(PG)로 입금하므로 회사 통장사본을 발급하지 않음 (계좌이체·후결제·별도결제 등 회사 계좌로 입금하는 경우만)
  const BANK_COPY_BLOCK_REASON = '무통장입금 주문은 가상계좌로 입금하므로 통장사본을 발급할 수 없습니다.';
  const bankCopyBlocked = o => !!o && o.payMethod === '무통장입금';
  const FAXES = ['02-3141-2200', '031-702-8800', '051-630-1200', '042-480-7700'];

  const loadOverlay = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; } };
  const loadList = key => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } };
  const overlay = loadOverlay(KEYS.requests);
  const adminIssues = loadList(KEYS.issues);
  // 신청번호: 증빙서류 접수 = D…(주문 전 요청 DP…, 관리자 등록 DM…), 영수증 접수 = 같은 번호의 첫 글자를 R로 (R…, RP…, RM…)
  //   고객이 한 번에 함께 신청해도 관리자에서는 두 건으로 나뉘어 접수됨 (pairNo로 서로 연결)
  const rNo = no => `R${no.slice(1)}`;
  const savedOf = no => [overlay[no], overlay[rNo(no)]].filter(Boolean);   // 저장된 처리 결과 (증빙서류·영수증 접수 중 있는 것)
  // 저장 후 새 신청 알림(대메뉴 빨간 점, member-type-store.js refreshNewMarks) 갱신
  //   함께 접수된 다른 건도 같이 저장 (다시 열 때 두 건이 늘 함께 복원되도록)
  const saveReq = req => { [req, req.pairNo && requests.find(x => x.reqNo === req.pairNo)].filter(Boolean).forEach(x => { overlay[x.reqNo] = JSON.parse(JSON.stringify(x)); }); let ok; try { localStorage.setItem(KEYS.requests, JSON.stringify(overlay)); ok = true; } catch (e) { ok = false; } if (window.AdminUtil && AdminUtil.refreshNewMarks) AdminUtil.refreshNewMarks(); return ok; };
  const saveIssues = () => { try { localStorage.setItem(KEYS.issues, JSON.stringify(adminIssues)); return true; } catch (e) { return false; } };

  const orderOf = x => (x.orderNo ? OrderData.find(x.orderNo) : null);
  // 신청 서류 종류: 한 신청에 여러 서류를 함께 신청할 수 있음 (docTypes). 예전 저장 데이터는 docType 하나
  const typesOf = req => (req.docTypes && req.docTypes.length ? req.docTypes : [req.docType]);
  const proofTypesOf = req => typesOf(req).filter(t => !RECEIPT_TYPES.includes(t));
  const receiptTypesOf = req => typesOf(req).filter(t => RECEIPT_TYPES.includes(t));
  // 목록 표기: 하나면 그 이름, 여럿이면 '견적서 외 2종'
  // 신청자 정보 (목록·상세·엑셀 공통): 주문이 있으면 주문자, 주문 전 요청이면 신청 때 받은 customer
  const applicantOf = req => { const o = orderOf(req); if (o) return { name: o.name, userId: o.userId, phone: o.phone, email: o.email, category: o.member.category, company: o.member.business ? o.member.business.companyName : '', order: o };
    const c = req.customer || {}; const m = c.userId ? MemberData.members.find(x => x.userId === c.userId) : null;   // 회원이면 회원구분, 직접 입력한 신청자는 비회원
    return { name: c.name || '', userId: c.userId || '', phone: c.phone || '', email: c.email || '', category: m ? m.category : '비회원', company: c.company || '', order: null }; };
  const typeLabel = req => { const t = typesOf(req); return t.length > 1 ? `${t[0]} 외 ${t.length - 1}종` : t[0]; };
  const fileOf = (type, o) => `${type.replace(/ /g, '_')}_${o ? o.orderNo : 'STOPBOOK'}.pdf`;

  // ===== 자동 발급 이력 샘플 =====
  //   단체(사업자) 회원·현금성 결제 주문에서 많이 발급됨. 발급 시각은 주문·결제 시각 뒤로 잡음
  const issues = [];
  let seq = 0;
  const pushIssue = (o, type, at, extra) => {
    seq += 1;
    issues.push(Object.assign({ id: `A${at.slice(0, 10).replace(/-/g, '')}-${String(seq).padStart(4, '0')}`, at, docType: type, orderNo: o.orderNo, userId: o.userId, name: o.name, email: o.email,
      category: o.member.category, company: o.member.business ? o.member.business.companyName : '',
      channel: CHANNEL_OF[type], amount: 0, purpose: '', file: fileOf(type, o), by: '시스템' }, extra || {}));
  };
  const NOW_END = TODAY.getTime() + DAY - 60000;   // 기준일(TODAY) 이후 시각은 아직 일어나지 않은 발급 → 샘플에서 뺌
  const issueAt = (o, type, t, extra) => { if (t <= NOW_END) pushIssue(o, type, fmtDt(new Date(t)), extra); };
  ORDERS.forEach(o => {
    const r = rng(o.orderNo, 67), biz = !!o.member.business, cash = ['무통장입금', '후결제', '계좌이체'].includes(o.payMethod);
    const t0 = toTime(o.orderedAt);
    // 견적서: 주문서에서 결제 전 내려받음 (사업자 회원은 자주). 금액 = 주문 결제 예정 금액
    if (r() < (biz ? 0.6 : 0.12)) issueAt(o, '견적서', t0 + (5 + Math.floor(r() * 90)) * 60000, { amount: o.amount });
    // 사업자등록증·통장사본: 현금성 결제(입금 처리·거래처 등록용). 무통장입금(가상계좌) 주문은 통장사본 없음
    if (cash && r() < 0.45) {
      const both = r() < 0.5, bankOk = !bankCopyBlocked(o);
      issueAt(o, both || r() < 0.5 || !bankOk ? '사업자등록증' : '통장사본', t0 + (10 + Math.floor(r() * 180)) * 60000);
      if (both && bankOk) issueAt(o, '통장사본', t0 + (12 + Math.floor(r() * 180)) * 60000);
    }
    // 거래내역서: 결제 확인 뒤 주문 상세에서 내려받음 (전체취소 주문은 제외)
    const paidAt = o.payment.paidDateTime;
    if (paidAt && o.payment.total && r() < (biz ? 0.7 : 0.2)) issueAt(o, '거래내역서', toTime(paidAt.slice(0, 16)) + (1 + Math.floor(r() * 72)) * HOUR, { amount: o.payment.total });
    // 현금영수증·세금계산서: 결제 시 요청 → 결제 확인 후 자동 발급 (order-data.js)
    if (o.payment.docType && o.payment.docAt) pushIssue(o, o.payment.docType, o.payment.docAt, { amount: o.payment.total || o.amount, purpose: o.payment.docPurpose || '' });
  });
  // 관리자 재발급·관리자 발급 기록 (localStorage)
  adminIssues.forEach(x => issues.push(x));

  // ===== 별도 발급 신청 샘플 =====
  //   신청번호 = 'D' + 주문번호. 최근 90일 주문의 일부. 처리 대기 건은 최근 30일 안에 몰려 있음
  const requests = [];
  ORDERS.forEach(o => {
    const no = `D${o.orderNo.replace('-', '')}`;
    if (savedOf(no).length) { requests.push(...savedOf(no)); return; }
    if (o.orderDate < daysAgo(90) || o.payStatus === '전체취소') return;
    const h = hash(o.orderNo, 71) % 100;
    const biz = !!o.member.business;
    if (h >= (biz ? 22 : 5)) return;
    const r = rng(o.orderNo, 79);
    let docType = biz ? pick(REQUEST_TYPES, r) : pick(['견적서', '거래내역서', '사업자등록증', '기타'], r);
    if (docType === '통장사본' && bankCopyBlocked(o)) docType = '사업자등록증';   // 무통장입금 주문은 통장사본 신청 없음
    let t = toTime(o.orderedAt) + (2 + Math.floor(r() * 120)) * HOUR;
    if (t > NOW_END) t = toTime(o.orderedAt) + (1 + Math.floor(r() * 3)) * HOUR;   // 최근 주문은 주문 직후 신청으로
    if (t > NOW_END) return;
    const at = new Date(t);
    const recent = fmtDate(at) >= daysAgo(30);
    const x = r();
    const status = recent ? (x < 0.65 ? '대기' : x < 0.9 ? '완료' : '반려') : (x < 0.8 ? '완료' : '반려');
    const receiveBy = docType === '사업자등록증' && r() < 0.5 ? '우편' : r() < 0.75 ? '이메일' : pick(['팩스', '우편'], r);
    const receiveTo = receiveBy === '이메일' ? o.email : receiveBy === '팩스' ? pick(FAXES, r) : (o.delivery.address || '') ;
    // 함께 신청한 서류: 사업자 회원 약 35%, 그 외 약 10%가 1~2종을 더 신청 (별도 난수라 다른 샘플 값은 그대로)
    const r2 = rng(o.orderNo, 83);
    const docTypes = [docType];
    if (r2() < (biz ? 0.35 : 0.1)) {
      const pool = REQUEST_TYPES.filter(t => t !== docType && t !== '기타' && t !== '세금계산서' && t !== '현금영수증' && !(t === '통장사본' && bankCopyBlocked(o)));
      const n = r2() < 0.5 ? 1 : 2;
      for (let k = 0; k < n; k++) docTypes.push(pool.splice(Math.floor(r2() * pool.length), 1)[0]);
    }
    // 증빙 함께 신청: 견적서·거래내역서·납품서를 신청하면서 세금계산서(사업자 회원 약 40%)나 현금영수증(그 외 약 30%)도 같이 요청 (별도 난수)
    //   계산서 영수증 발급 관리 화면은 이 신청들 가운데 세금계산서·현금영수증이 들어 있는 건만 걸러서 보여 줌
    const r3 = rng(o.orderNo, 89);
    if (['견적서', '거래내역서', '납품서'].includes(docType) && !docTypes.some(t => t === '세금계산서' || t === '현금영수증') && r3() < (biz ? 0.4 : 0.3)) docTypes.push(biz ? '세금계산서' : '현금영수증');
    const req = { reqNo: no, orderNo: o.orderNo, at: fmtDt(at), docType, docTypes, requirement: pick(REQUIREMENTS[docType], r) + (docTypes.length > 1 ? ` (함께 신청: ${docTypes.slice(1).join(', ')})` : ''),
      attachment: r() < 0.35 ? `${docType === '세금계산서' ? '사업자등록증' : '기관양식'}_${o.userId}.${r() < 0.5 ? 'pdf' : 'jpg'}` : '',
      receiveBy, receiveTo, wantBy: r() < 0.6 ? fmtDate(new Date(at.getTime() + (2 + Math.floor(r() * 7)) * DAY)) : '',
      status, processedAt: '', processedBy: '', file: '', sentBy: '', sentTo: '', memo: '', rejectReason: '',
      history: [{ at: fmtDt(at), content: `고객 ${docTypes.join(', ')} 별도 발급 신청 (${receiveBy} 수령)`, by: '고객' }] };
    if (status !== '대기') {
      req.processedAt = fmtDt(clampNow(at.getTime() + (2 + Math.floor(r() * 30)) * HOUR)); req.processedBy = '관리자';   // 처리 시각은 기준일을 넘지 않게
      if (status === '반려') {
        req.rejectReason = docType === '세금계산서' ? '수정발행은 공급받는자 정보 변경 사유서와 사업자등록증 사본이 필요합니다. 서류를 첨부해 다시 신청해 주세요.' : '요청하신 양식 파일이 첨부되지 않았습니다. 기관 양식을 첨부해 다시 신청해 주세요.';
        req.history.push({ at: req.processedAt, content: `반려 처리 (사유: ${req.rejectReason})`, by: '관리자' });
      } else {
        req.file = docTypes.length > 1 ? `서류${docTypes.length}종_${o.orderNo}.zip` : fileOf(docType, o); req.sentBy = receiveBy; req.sentTo = receiveTo;
        req.memo = r() < 0.4 ? '직인 날인 후 스캔본 송부' : '';
        req.history.push({ at: req.processedAt, content: `발급 완료 → ${receiveBy} 전달 (${req.file})`, by: '관리자' });
      }
    }
    requests.push(req);
  });
  // 처리 대기 화면에서도 복수 서류 신청이 보이도록: 대기 중 복수 신청이 2건 미만이면 최근 대기 건에 서류를 더함 (저장된 처리 결과가 없는 샘플만)
  (() => {
    const pending = requests.filter(q => q.status === '대기' && !q.kind).sort((a, b) => b.at.localeCompare(a.at));
    const extra = [['거래내역서', '사업자등록증'], ['통장사본']];
    pending.filter(q => q.docTypes.length === 1).slice(0, Math.max(0, 2 - pending.filter(q => q.docTypes.length > 1).length)).forEach((q, n) => {
      extra[n].filter(t => !q.docTypes.includes(t) && !(t === '통장사본' && bankCopyBlocked(orderOf(q)))).forEach(t => q.docTypes.push(t));
      q.requirement += ` (함께 신청: ${q.docTypes.slice(1).join(', ')})`;
      q.history[0].content = `고객 ${q.docTypes.join(', ')} 별도 발급 신청 (${q.receiveBy} 수령)`;
    });
  })();
  // 주문 전 요청 샘플: 주문과 연결되지 않은 견적서·사업자등록증 등 요청 (신청번호 DP…, customer에 신청자 정보)
  //   사업자 회원 중 몇 명이 최근에 주문 없이 요청한 것으로. 처리 결과가 저장돼 있으면 그대로 복원
  (() => {
    const bizMembers = MemberData.members.filter(m => m.business).slice(0, 40);
    const PRE = [[3, ['견적서'], '대기', '포토북 300부 제작 예정입니다. 사전 견적서 부탁드립니다 (부가세 포함 금액).'], [6, ['견적서', '사업자등록증'], '대기', '구매 품의용 견적서와 사업자등록증 사본이 필요합니다.'],
      [11, ['견적서', '사업자등록증', '통장사본'], '완료', '신규 거래처 등록용 서류 일체 요청'], [18, ['견적서'], '반려', '단가표 전체를 견적서로 보내 주세요.']];
    PRE.forEach(([ago, types, status, requirement], n) => {
      const m = bizMembers[(n * 7 + 3) % bizMembers.length];
      if (!m) return;
      const at = new Date(TODAY.getTime() - ago * DAY + (10 + n) * HOUR);
      const reqNo = `DP${fmtDate(at).replace(/-/g, '')}-${String(n + 1).padStart(3, '0')}`;
      if (savedOf(reqNo).length) { requests.push(...savedOf(reqNo)); return; }
      const company = m.business.companyName;
      const req = { reqNo, orderNo: '', customer: { name: m.name, phone: m.phone, email: m.email, company, userId: m.userId }, at: fmtDt(at), docType: types[0], docTypes: types.slice(), requirement,
        attachment: '', receiveBy: '이메일', receiveTo: m.email, wantBy: fmtDate(new Date(at.getTime() + 3 * DAY)),
        status, processedAt: '', processedBy: '', file: '', sentBy: '', sentTo: '', memo: '', rejectReason: '',
        history: [{ at: fmtDt(at), content: `고객 ${types.join(', ')} 별도 발급 신청 (주문 전 요청, 이메일 수령)`, by: '고객' }] };
      if (status !== '대기') {
        req.processedAt = fmtDt(clampNow(at.getTime() + 5 * HOUR)); req.processedBy = '관리자';
        if (status === '반려') { req.rejectReason = '견적서는 제작 사양(상품·수량·옵션)을 알려 주셔야 발급할 수 있습니다. 사양을 적어 다시 신청해 주세요.'; req.history.push({ at: req.processedAt, content: `반려 처리 (사유: ${req.rejectReason})`, by: '관리자' }); }
        else { req.file = `서류${types.length}종_${m.userId}.zip`; req.sentBy = '이메일'; req.sentTo = m.email; req.history.push({ at: req.processedAt, content: `발급 완료 → 이메일 전달 (${req.file})`, by: '관리자' }); }
      }
      requests.push(req);
    });
  })();
  // 처리 대기 샘플은 오늘 접수분 7~10건만 (서류 발급도 대부분 당일 처리). 발급 희망일은 오늘 기준으로 다시 잡음. 관리자가 처리·등록한 신청은 그대로
  AdminUtil.keepTodayPending(requests, q => q.status === '대기' && !q.kind, 'document').forEach((q, k) => {
    if (q.wantBy) { const d = new Date(); d.setDate(d.getDate() + 2 + k % 5); q.wantBy = fmtDate(d); }
    // 오늘 처리 대기 신청 중 일부(3건 중 1건)는 증빙도 함께 요청 → 계산서 영수증 발급 관리에 처리 대기 건이 보이게
    const types = typesOf(q);
    if (k % 3 === 0 && !types.some(t => t === '세금계산서' || t === '현금영수증')) {
      const o = orderOf(q), add = (o && o.member.business) || (q.customer && q.customer.company) ? '세금계산서' : '현금영수증';
      q.docTypes = types.concat(add);
      q.requirement = `${q.requirement.replace(/ \(함께 신청: [^)]*\)$/, '')} (함께 신청: ${q.docTypes.slice(1).join(', ')})`;
      q.history[0].content = q.history[0].content.replace(/^고객 .*? 별도 발급 신청/, `고객 ${q.docTypes.join(', ')} 별도 발급 신청`);
    }
  });
  // 관리자가 직접 등록한 신청 (유선·이메일 등으로 받은 별도 발급 신청, 신청번호 DM…)
  Object.values(overlay).filter(x => x.manual && !requests.some(r => r.reqNo === x.reqNo)).forEach(x => requests.push(x));
  // ===== 신청 정보: 담당자 · 기관/회사명 + 서류별 추가 정보 =====
  //   contact = { name(담당자명), phone, email, org(기관/회사명) } — 모든 신청
  //   bizCert = 사업자등록증 첨부 파일 — 세금계산서를 신청한 경우
  //   cashReceipt = { purpose(소득공제/지출증빙), idType(휴대폰/주민번호/사업자등록번호), idValue } — 현금영수증을 신청한 경우
  //   샘플(고객 신청)은 주문자·사업자 정보로 채움 (신청번호별 별도 난수, 저장된 처리 결과에 없으면 여기서 보충). 관리자 등록 건은 입력값 그대로
  const CASH_ID_TYPES = { '소득공제': ['휴대폰', '주민번호'], '지출증빙': ['사업자등록번호'] };
  const maskPhone = p => String(p || '').replace(/-(\d{3,4})-/, '-****-');
  function fillRequestInfo(req) {
    const r = rng(req.reqNo, 89);
    const o = orderOf(req), c = req.customer || {};
    const m = o ? o.member : (c.userId ? MemberData.members.find(x => x.userId === c.userId) : null);
    const b = m && m.business;
    if (!req.contact) {
      req.contact = { name: b ? b.managerName : (o ? o.name : c.name || ''), phone: b ? b.managerPhone : (o ? o.phone : c.phone || ''), email: b ? b.managerEmail : (o ? o.email : c.email || ''),
        org: b ? b.companyName : (c.company || '') };
    }
    // 발급 희망일은 필수: 샘플에서 비어 있으면 신청일 + 3일
    if (!req.wantBy) req.wantBy = fmtDate(new Date(toTime(req.at) + 3 * DAY));
    const types = typesOf(req);
    if (types.includes('세금계산서') && !req.bizCert) req.bizCert = `사업자등록증_${(m && m.userId) || req.reqNo}.${r() < 0.6 ? 'pdf' : 'jpg'}`;
    // 세금계산서: 영수(결제 완료분)/청구(후결제·미입금분) + 세금계산서 일자(결제일, 없으면 신청일)
    if (types.includes('세금계산서') && !req.taxInvoice) {
      const paid = o && o.payment && o.payment.paidDateTime;
      req.taxInvoice = { kind: paid ? '영수' : '청구', date: (paid || req.at).slice(0, 10) };
    }
    if (types.includes('현금영수증') && !req.cashReceipt) {
      const purpose = r() < (b ? 0.5 : 0.3) ? '지출증빙' : '소득공제';   // 사업자 회원도 개인 소득공제로 받는 경우가 있음
      const idType = purpose === '지출증빙' ? '사업자등록번호' : (r() < 0.75 ? '휴대폰' : '주민번호');
      const idValue = idType === '사업자등록번호' ? (b ? b.bizNo : `${100 + Math.floor(r() * 800)}-${10 + Math.floor(r() * 80)}-${10000 + Math.floor(r() * 89999)}`)
        : idType === '휴대폰' ? maskPhone(req.contact.phone || '010-0000-0000') : `${pad(70 + Math.floor(r() * 30))}${pad(1 + Math.floor(r() * 12))}${pad(1 + Math.floor(r() * 28))}-${r() < 0.5 ? 1 : 2}******`;
      req.cashReceipt = { purpose, idType, idValue };
    }
    return req;
  }
  requests.filter(q => !q.manual).forEach(fillRequestInfo);

  // ===== 처리 단위: 증빙서류 / 영수증 =====
  //   proofDone   = { at, by, file, sentBy, sentTo, memo } — 증빙서류를 만들어 전달한 기록 (증빙서류를 신청한 경우)
  //   receiptDone = { [세금계산서|현금영수증]: { date(처리일자), by(처리자명), at(기록 일시), recordedBy } } — 별도 전산에서 발급한 뒤 남긴 기록
  //   모든 처리가 끝나야 status '완료'(발급 완료 탭). 일부만 끝난 신청은 '대기'로 남고 진행 상태를 표시
  //   예전 방식으로 완료 처리된 신청(처리 단위 없음)은 완료 정보로 두 처리 기록을 채움
  const partsDone = req => ({ proof: !proofTypesOf(req).length || !!req.proofDone, receipts: receiptTypesOf(req).map(t => [t, !!(req.receiptDone || {})[t]]) });
  const allDone = req => { const p = partsDone(req); return p.proof && p.receipts.every(([, d]) => d); };
  const anyDone = req => !!req.proofDone || Object.keys(req.receiptDone || {}).length > 0;
  // 진행 표시: '증빙 완료' · '세금계산서 완료' 등 (일부만 끝난 처리 대기 건)
  const progressOf = req => {
    if (req.status !== '대기' || !anyDone(req)) return [];
    const p = partsDone(req);
    return [...(proofTypesOf(req).length && p.proof ? ['증빙 완료'] : []), ...p.receipts.filter(([, d]) => d).map(([t]) => `${t} 완료`)];
  };
  function normalizeParts(req) {
    if (req.status !== '완료') return;
    if (proofTypesOf(req).length && !req.proofDone) req.proofDone = { at: req.processedAt, by: req.processedBy || '관리자', file: req.file || '', sentBy: req.sentBy || req.receiveBy, sentTo: req.sentTo || req.receiveTo || '', memo: req.memo || '' };
    receiptTypesOf(req).forEach(t => {
      req.receiptDone = req.receiptDone || {};
      if (!req.receiptDone[t]) req.receiptDone[t] = { date: String(req.processedAt || req.at).slice(0, 10), by: req.processedBy || '관리자', at: req.processedAt || req.at, recordedBy: req.processedBy || '관리자' };
    });
  }
  requests.filter(q => !q.kind).forEach(normalizeParts);

  // ===== 접수 분리: 증빙서류 / 영수증 =====
  //   고객이 한 신청서로 증빙서류와 영수증을 함께 신청해도 관리자에서는 따로 접수
  //     증빙서류 접수(kind '증빙서류', D…) → 서류 발급 관리 / 영수증 접수(kind '영수증', R…) → 계산서 영수증 발급 관리
  //   두 건은 pairNo로 연결되고, 각자 처리 상태(처리 대기·발급 완료·반려)를 가짐
  const KINDS = ['증빙서류', '영수증'];
  const TOGETHER = / \(함께 신청: [^)]*\)$/;
  function splitApplication(app) {
    if (app.kind) return [app];   // 이미 나뉘어 저장된 접수
    const proof = proofTypesOf(app), rcpt = receiptTypesOf(app);
    const parts = [['증빙서류', proof, app.reqNo], ['영수증', rcpt, rNo(app.reqNo)]].filter(([, t]) => t.length);
    return parts.map(([kind, types, no]) => {
      const x = JSON.parse(JSON.stringify(app));
      const other = parts.find(p => p[0] !== kind);
      Object.assign(x, { kind, reqNo: no, docType: types[0], docTypes: types.slice(), pairNo: other ? other[2] : '' });
      const base = (app.requirement || '').replace(TOGETHER, '');
      if (kind === '증빙서류') {
        delete x.bizCert; delete x.taxInvoice; delete x.cashReceipt; delete x.receiptDone;
        x.requirement = proof.length > 1 ? `${base} (함께 신청: ${proof.slice(1).join(', ')})` : base;
      } else {
        delete x.proofDone; x.attachment = '';
        Object.assign(x, { file: '', sentBy: '', sentTo: '', memo: '' });
        x.requirement = RECEIPT_TYPES.includes(app.docType) ? base : `${rcpt.join(', ')} 발급 요청`;
      }
      // 히스토리: 접수 기록은 이 접수의 서류로, 처리 기록은 이 접수에 해당하는 것만
      const [first, ...rest] = app.history || [];
      x.history = [];
      if (first) x.history.push(Object.assign({}, first, { content: first.content.replace(typesOf(app).join(', '), types.join(', ')) }));
      if (other) x.history.push({ at: app.at, content: `증빙서류·영수증 함께 신청 → ${kind} 접수로 분리 (함께 접수: ${other[0]} ${other[2]})`, by: '시스템' });
      rest.forEach(h => {
        if (/^반려/.test(h.content)) x.history.push(h);
        else if (kind === '증빙서류' && !/영수증|세금계산서|현금영수증/.test(h.content.split('(')[0])) x.history.push(h);
      });
      if (kind === '영수증' && x.status === '완료') Object.entries(x.receiptDone || {}).forEach(([t, d]) => x.history.push({ at: d.at, content: `${t} 발급 완료 기록 (별도 전산 발급 · 처리일자 ${d.date} · 처리자 ${d.by})`, by: d.recordedBy }));
      return x;
    });
  }
  requests.splice(0, requests.length, ...requests.flatMap(splitApplication));

  // ===== 처리 =====
  // 모든 처리(증빙서류 + 영수증 서류별)가 끝나면 발급 완료로. 반환: 이번에 발급 완료가 됐는지
  function finalize(req, by) {
    if (req.status !== '대기' || !allDone(req)) return false;
    const at = nowText(), p = req.proofDone;
    Object.assign(req, { status: '완료', processedAt: at, processedBy: by,
      file: p ? p.file : '', sentBy: p ? p.sentBy : '', sentTo: p ? p.sentTo : '', memo: p ? p.memo : '' });   // 목록·엑셀용 대표 값 (증빙서류 전달 내용)
    req.history.push({ at, content: `모든 처리 완료 → 발급 완료 (${typesOf(req).join(', ')})`, by });
    return true;
  }
  // 증빙서류 발급 완료: 관리자가 만든 서류를 고객에게 전달. opts = { file, sentBy, sentTo, memo, by }. 주문 히스토리('서류발급')에 남김
  //   반환: { ok, finished(발급 완료가 됐는지) }
  function completeProof(req, opts) {
    if (req.status !== '대기' || !proofTypesOf(req).length || req.proofDone) return { ok: false };
    const at = nowText(), types = proofTypesOf(req);
    req.proofDone = { at, by: opts.by, file: opts.file || '', sentBy: opts.sentBy || req.receiveBy, sentTo: opts.sentTo || req.receiveTo || '', memo: opts.memo || '' };
    const p = req.proofDone;
    req.history.push({ at, content: `증빙서류 발급 완료 (${types.join(', ')}) → ${p.sentBy} 전달${p.sentTo ? ` (${p.sentTo})` : ''}${p.file ? ` · ${p.file}` : ''}${p.memo ? ` · ${p.memo}` : ''}`, by: opts.by });
    if (req.orderNo) OrderData.addHistory(req.orderNo, '서류발급', `${types.join(', ')} 별도 발급 (${req.reqNo}) · ${p.sentBy} 전달${p.file ? ` · ${p.file}` : ''}${p.memo ? ` · ${p.memo}` : ''}`, opts.by);
    const finished = finalize(req, opts.by);
    return { ok: saveReq(req), finished };
  }
  // 영수증(세금계산서·현금영수증) 발급 완료 기록: 별도 전산에서 발급한 뒤 처리일자·처리자명을 남김. opts = { date, issuer(처리자명), by(기록한 관리자) }
  function completeReceipt(req, type, opts) {
    if (req.status !== '대기' || !receiptTypesOf(req).includes(type) || (req.receiptDone || {})[type]) return { ok: false };
    const at = nowText();
    req.receiptDone = Object.assign({}, req.receiptDone, { [type]: { date: opts.date, by: opts.issuer, at, recordedBy: opts.by } });
    const tax = type === '세금계산서' && req.taxInvoice ? ` · ${req.taxInvoice.kind} · 세금계산서 일자 ${req.taxInvoice.date}` : '';
    const cash = type === '현금영수증' && req.cashReceipt ? ` · ${req.cashReceipt.purpose}` : '';
    req.history.push({ at, content: `${type} 발급 완료 기록 (별도 전산 발급 · 처리일자 ${opts.date} · 처리자 ${opts.issuer}${tax}${cash})`, by: opts.by });
    if (req.orderNo) OrderData.addHistory(req.orderNo, '서류발급', `${type} 발급 (${req.reqNo}, 별도 전산) · 처리일자 ${opts.date} · 처리자 ${opts.issuer}`, opts.by);
    const finished = finalize(req, opts.by);
    return { ok: saveReq(req), finished };
  }
  // 관리자 메모 (영수증 접수): 처리 상태와 상관없이 언제든 저장. 고객에게는 보이지 않고 처리 히스토리에 남김
  function saveMemo(req, memo, by) {
    if ((req.memo || '') === memo) return true;
    req.memo = memo;
    req.history.push({ at: nowText(), content: memo ? `관리자 메모: ${memo}` : '관리자 메모 삭제', by });
    return saveReq(req);
  }
  // 반려: 사유는 고객에게 안내. 이미 일부를 처리한 신청은 반려할 수 없음 (처리한 서류가 이미 고객에게 전달됨)
  function reject(req, reason, by) {
    if (req.status !== '대기' || anyDone(req)) return false;
    const at = nowText();
    Object.assign(req, { status: '반려', processedAt: at, processedBy: by, rejectReason: reason });
    req.history.push({ at, content: `반려 처리 (사유: ${reason})`, by });
    if (req.orderNo) OrderData.addHistory(req.orderNo, '서류발급', `${typesOf(req).join(', ')} 별도 발급 신청 반려 (${req.reqNo}) · 사유: ${reason}`, by);
    return saveReq(req);
  }
  // 관리자 등록: 유선 등으로 받은 별도 발급 신청을 관리자가 직접 입력 → 처리 대기로 추가. 주문 히스토리('서류발급')에도 남김
  //   input = { orderNo(선택), customer(주문번호가 없을 때: name, phone, email, company), contact{name, phone, email, org}, bizCert·taxInvoice{kind, date}(세금계산서), cashReceipt{purpose, idType, idValue}(현금영수증),
  //             docTypes[], requirement, receiveBy, receiveTo, wantBy, attachment, channel(접수 경로), memo }
  //   증빙서류와 영수증을 함께 받았으면 두 건으로 나눠 접수. 반환: 접수된 신청 배열 (실패하면 null)
  function addRequest(input, by) {
    const at = nowText();
    const today = at.slice(0, 10).replace(/-/g, '');
    const n = new Set(Object.values(overlay).filter(x => x.manual && x.reqNo.slice(1).startsWith(`M${today}`)).map(x => x.reqNo.slice(1))).size + 1;
    const app = { reqNo: `DM${today}-${String(n).padStart(3, '0')}`, manual: true, channel: input.channel, orderNo: input.orderNo || '', customer: input.orderNo ? null : input.customer, at,
      docType: input.docTypes[0], docTypes: input.docTypes.slice(), requirement: input.requirement, attachment: input.attachment || '',
      contact: input.contact, bizCert: input.bizCert || '', taxInvoice: input.taxInvoice || null, cashReceipt: input.cashReceipt || null,
      receiveBy: input.receiveBy, receiveTo: input.receiveTo, wantBy: input.wantBy || '',
      status: '대기', processedAt: '', processedBy: '', file: '', sentBy: '', sentTo: '', memo: '', rejectReason: '',
      history: [{ at, content: `관리자 등록 (${input.channel} 접수${input.orderNo ? '' : ', 주문 전 요청'}) · ${input.docTypes.join(', ')} · ${input.receiveBy} 수령${input.memo ? ` · 메모: ${input.memo}` : ''}`, by }] };
    const parts = splitApplication(app);
    requests.unshift(...parts);
    if (app.orderNo) parts.forEach(q => OrderData.addHistory(q.orderNo, '서류발급', `${q.docTypes.join(', ')} ${q.kind} 발급 신청 등록 (${q.reqNo}, ${input.channel} 접수)`, by));
    return saveReq(parts[0]) ? parts : null;
  }
  // 관리자 발급(재발급·주문 상세의 증빙서류 발급): 발급 이력에 관리자 건으로 추가. src = { docType, orderNo, userId, name, email, category, company, amount, channel }
  function addIssue(src, by) {
    const at = nowText();
    const o = src.orderNo ? OrderData.find(src.orderNo) : null;
    const rec = { id: `M${at.slice(0, 10).replace(/-/g, '')}-${String(adminIssues.length + 1).padStart(4, '0')}`, at, docType: src.docType, orderNo: src.orderNo || '',
      userId: src.userId || (o ? o.userId : ''), name: src.name || (o ? o.name : ''), email: src.email || (o ? o.email : ''),
      category: src.category || (o ? o.member.category : ''), company: src.company || (o && o.member.business ? o.member.business.companyName : ''),
      channel: src.channel || '관리자 재발급', amount: src.amount || 0, purpose: src.purpose || '', file: src.file || fileOf(src.docType, o), by };
    adminIssues.push(rec);
    issues.push(rec);
    return saveIssues() ? rec : null;
  }
  // 재발급: opts = { email(받을 이메일, 기본 = 처음 발급한 이메일), memo }. 다른 이메일로 바꿔 보내면 발급 이력의 이메일도 그 주소
  const reissue = (issue, by, opts = {}) => {
    const email = String(opts.email || issue.email || '').trim();
    const changed = email.toLowerCase() !== String(issue.email || '').toLowerCase();
    const rec = addIssue(Object.assign({}, issue, { channel: '관리자 재발급', email }), by);
    if (!rec) return null;
    Object.assign(rec, { reissueOf: issue.id, prevEmail: changed ? issue.email || '' : '', memo: opts.memo || '' });
    saveIssues();
    if (rec.orderNo) OrderData.addHistory(rec.orderNo, '서류발급', `${rec.docType} 재발급 (${rec.file}) → ${email}${changed ? ` (이메일 변경 발급, 이전 ${issue.email || '-'})` : ''}${opts.memo ? ` · ${opts.memo}` : ''}`, by);
    return rec;
  };

  const byAt = (a, b) => b.at.localeCompare(a.at);
  window.DocData = {
    STATUS_TEXT, AUTO_TYPES, REQUEST_TYPES, RECEIVE_METHODS, BANK_COPY_BLOCK_REASON, bankCopyBlocked, CHANNEL_OF, RECEIPT_CHANNELS: ['유선', '이메일', '팩스', '방문', '기타'], CASH_ID_TYPES, orderOf, applicantOf, typesOf, typeLabel,
    RECEIPT_TYPES, PROOF_TYPES, TAX_KINDS, CASH_PURPOSES, KINDS, groupOf, proofTypesOf, receiptTypesOf, partsDone, allDone, anyDone, progressOf,
    issues: issues.sort(byAt), requests: requests.sort(byAt),
    completeProof, completeReceipt, saveMemo, reject, addIssue, reissue, addRequest
  };
})();
