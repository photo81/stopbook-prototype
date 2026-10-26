// 견적서 · 거래명세서 양식 (프로젝트 폴더의 견적서.pdf · 거래명세서.pdf와 같은 모양)
// doc-form-assets.js(직인·KSI 로고) 다음에 로드. 결과는 단독으로 열리는 HTML 문서 (브라우저에서 인쇄 → PDF 저장 가능)
//   build(kind, data): kind = '견적서' | '거래명세서'
//     data = { customer: { name(고객명), org(기관/업체명), email }, issuedAt(Date|'YYYY-MM-DD'), payTerms(결제 조건),
//              rows: [{ name, sub(제품명 아래 작은 글씨), spec, specSub, pages, qty, unitPrice, total }], notes: [] }
//     공급가 = 금액 ÷ 1.1 (원 단위 반올림), 세액 = 금액 − 공급가 (모든 금액은 부가세 포함)
//   orderRows(order, kind): 주문 상품(취소 제외) + 할인 + 배송비 → rows
// TODO: 실서비스에서는 서버가 같은 양식으로 PDF를 만들어 내려줌 (공급자 정보·담당자는 관리자 설정에서)
(function () {
  'use strict';
  const SUPPLIER = {
    bizNo: '111-81-26181', name: '한국학술정보㈜', ceo: '채 종 준', address: '경기도 파주시 회동길 230 (문발동)',
    bizType: '서비스 제조', bizItem: '인쇄, 출판, DB서비스',
    manager: 'PHOTO사업부 운영지원팀 김미애', tel: '080-860-1119', email: 'photo_cs@kstudy.com'
  };
  const KIND = {
    '견적서': { title: '견 적 서', validity: '발급일로 부터 15일', pageHead: '페이지', notes: ['*옵션 변경시 금액 변동'] },
    '거래명세서': { title: '거 래 명 세 서', validity: '-', pageHead: '장 수', notes: [] }
  };
  const ROWS = 15;   // 품목 칸 수 (양식과 같게 빈 줄 포함)
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => (n ? Number(n).toLocaleString('ko-KR') : n === 0 ? '0' : '');
  const supplyOf = total => Math.round(total / 1.1);
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const dateText = d => { const x = d instanceof Date ? d : new Date(String(d).slice(0, 10) + 'T00:00'); return `${x.getFullYear()}년 ${x.getMonth() + 1}월 ${x.getDate()}일 ${DAYS[x.getDay()]}요일`; };

  // 금액 한글 표기: 747500 → 칠십사만칠천오백
  function koreanAmount(n) {
    n = Math.abs(Math.round(n));
    if (!n) return '영';
    const D = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'], S = ['', '십', '백', '천'], B = ['', '만', '억', '조'];
    let out = '', g = 0;
    while (n > 0) {
      const part = n % 10000;
      if (part) {
        let t = '';
        String(part).padStart(4, '0').split('').forEach((c, i) => { const v = Number(c); if (v) t += D[v] + S[3 - i]; });
        out = t + B[g] + out;
      }
      n = Math.floor(n / 10000); g++;
    }
    return out;
  }

  // 주문 → 품목 줄: 상품(취소 제외, 정가 기준) · 할인(합계, 음수) · 배송비
  function orderRows(o, kind) {
    if (!o) return [];
    const items = (o.items || []).filter(it => it.payStatus !== '취소');
    const rows = items.map(it => {
      const sp = it.spec || {};
      const pages = (sp.basePages || 0) + (sp.addPages || 0);
      const total = it.listPrice - (it.cancel || 0);
      return {
        name: it.category || it.name, sub: it.category ? `[${it.name}]` : '',
        spec: sp.size ? `${sp.size}${sp.form ? ` · ${sp.form}` : ''}` : '',
        specSub: [sp.cover, sp.coating, sp.finishing].filter(Boolean).join(' │ '),
        pages: pages || '', qty: it.qty, unitPrice: Math.round(total / it.qty), total
      };
    });
    const discount = items.reduce((t, it) => t + (it.discount || 0), 0);
    if (discount) rows.push({ name: '할인', spec: '회원·쿠폰 할인 등', qty: '', unitPrice: -discount, total: -discount });
    const ship = (o.payment && o.payment.shipFee) || 0;
    if (ship) rows.push({ name: '배송비', spec: o.shipMethod || '', qty: 1, unitPrice: ship, total: ship });
    return rows;
  }

  const CSS = `
    @page { size: A4; margin: 12mm 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e5e5e5; font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; color: #111; font-size: 11px; }
    .sheet { width: 210mm; min-height: 297mm; margin: 12px auto; background: #fff; padding: 14mm 12mm 10mm; position: relative; }
    h1 { text-align: center; font-size: 26px; letter-spacing: 6px; margin: 0 0 10px; color: #333; }
    .title-line { height: 3px; background: #2e8b9b; margin-bottom: 14px; }
    .top { display: flex; gap: 48px; align-items: flex-start; }
    .top > div { flex: 1; }
    table { border-collapse: collapse; width: 100%; }
    .box { border: 1.5px solid #222; margin-bottom: 12px; }
    .box th, .box td { border: 1px solid #555; padding: 3px 6px; height: 20px; text-align: left; font-weight: normal; }
    .box .cap { background: #d9d9d9; text-align: center; font-weight: bold; letter-spacing: 4px; }
    .box th { background: #f2f2f2; width: 96px; text-align: center; font-weight: bold; letter-spacing: 2px; white-space: nowrap; }
    .supplier .box th { width: 84px; }
    .box .mgr { width: 84px; letter-spacing: 1px; }
    .box .sub-th { background: #f2f2f2; width: 50px; font-size: 10px; text-align: center; letter-spacing: 0; white-space: nowrap; }
    .box td { white-space: nowrap; }
    .box a { color: #0563c1; }
    .note-under { margin: -6px 0 0; font-size: 10px; }
    .supplier { position: relative; }
    .seal { position: absolute; right: 2px; top: 14px; width: 84px; opacity: .92; pointer-events: none; }
    .under { text-align: center; font-weight: bold; margin: 18px 0 10px; }
    .sum { border: 1.5px solid #222; margin-bottom: 10px; }
    .sum td { padding: 10px 8px; border: 1px solid #555; }
    .sum .lbl { background: #b7dee8; width: 100px; text-align: center; font-weight: bold; letter-spacing: 3px; white-space: nowrap; }
    .sum .words { text-align: center; color: #0070c0; font-weight: bold; font-size: 13px; }
    .sum .won { width: 300px; color: #c00000; font-weight: bold; font-size: 14px; text-align: right; }
    .sum .won span { float: left; color: #333; font-weight: normal; }
    .items { border: 1.5px solid #222; }
    .items th { background: #31869b; color: #fff; padding: 7px 2px; border: 1px solid #31869b; font-weight: bold; letter-spacing: 1px; white-space: nowrap; font-size: 10.5px; }
    .items td { border: 1px solid #777; height: 33px; padding: 2px 6px; text-align: center; vertical-align: middle; }
    .items td.n { text-align: right; }
    .items small { display: block; color: #888; font-size: 9px; }
    .items .subtotal td { background: #b7dee8; font-weight: bold; height: 34px; }
    .items .grand td { background: #92cddc; font-weight: bold; height: 44px; font-size: 13px; }
    .items .grand td.amt { background: #fff; text-align: right; font-size: 15px; }
    .items .subtotal td.w, .items .grand td.w { background: #fff; }
    .remark { border: 1.5px solid #222; margin-top: 14px; }
    .remark .cap { background: #d9d9d9; text-align: center; font-weight: bold; letter-spacing: 4px; padding: 7px; border-bottom: 1px solid #555; }
    .remark .line { border-bottom: 1px dotted #ccc; height: 22px; padding: 4px 6px; font-size: 10px; font-weight: bold; }
    .remark .line:last-child { border-bottom: 0; }
    .logo { position: absolute; right: 12mm; bottom: 8mm; width: 170px; }
    .proto { position: absolute; left: 12mm; bottom: 9mm; font-size: 9px; color: #aaa; }
    @media print { body { background: #fff; } .sheet { margin: 0; width: auto; min-height: auto; padding: 0; } .logo { right: 0; bottom: 0; } .proto { display: none; } }`;

  // 사업자등록증·통장사본: 회사 서류 스캔본(02_스탑북_우리은행통장사본(사업자포함).pdf) 그대로 A4 한 장. 아래에 발급일·수신자만 작게 표기
  const IMAGE_DOC = { '사업자등록증': { asset: 'BIZ', label: '사업자등록증 (법인사업자) 사본' }, '통장사본': { asset: 'BANK', label: '우리은행 통장사본 (예금주 한국학술정보㈜)' } };
  function buildImage(kind, data) {
    const A = window.DocFormAssets || {}, c = data.customer || {}, src = A[IMAGE_DOC[kind].asset];
    return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${esc(kind)}${c.name ? ` - ${esc(c.name)}` : ''}</title><style>
    @page { size: A4; margin: 8mm; }
    body { margin: 0; background: #e5e5e5; font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; color: #111; font-size: 11px; }
    .sheet { width: 210mm; min-height: 297mm; margin: 12px auto; background: #fff; padding: 8mm 8mm 14mm; position: relative; }
    .scan { display: block; width: 100%; height: auto; }
    .foot { margin-top: 6px; font-size: 10px; color: #444; text-align: right; }
    .proto { position: absolute; left: 8mm; bottom: 6mm; font-size: 9px; color: #aaa; }
    @media print { body { background: #fff; } .sheet { margin: 0; width: auto; min-height: auto; padding: 0; } .proto { display: none; } }
    </style></head><body><div class="sheet">
  ${src ? `<img class="scan" src="${src}" alt="${esc(IMAGE_DOC[kind].label)}">` : `<p>${esc(IMAGE_DOC[kind].label)} 이미지가 없습니다.</p>`}
  <div class="foot">${esc(IMAGE_DOC[kind].label)} · 발급일 ${esc(dateText(data.issuedAt || new Date()))}${c.name ? ` · 수신 ${esc(c.org || c.name)} 귀하` : ''}</div>
  <div class="proto">※ 프로토타입 샘플 서류입니다.</div>
</div></body></html>`;
  }

  function build(kind, data) {
    if (IMAGE_DOC[kind]) return buildImage(kind, data);
    const K = KIND[kind] || KIND['견적서'];
    const A = window.DocFormAssets || {};
    const c = data.customer || {};
    const rows = (data.rows || []).slice(0, ROWS);
    const sum = rows.reduce((t, r) => t + (r.total || 0), 0);
    const sumSupply = rows.reduce((t, r) => t + supplyOf(r.total || 0), 0);
    const qty = rows.filter(r => r.name !== '배송비' && r.name !== '할인').reduce((t, r) => t + (Number(r.qty) || 0), 0);
    const line = (r, i) => {
      const s = supplyOf(r.total), tax = r.total - s;
      return `<tr><td>${i + 1}</td><td>${esc(r.name)}${r.sub ? `<small style="color:#111;font-size:10px">${esc(r.sub)}</small>` : ''}</td>
        <td>${esc(r.spec)}${r.specSub ? `<small>${esc(r.specSub)}</small>` : ''}</td><td>${esc(r.pages || '')}</td><td>${esc(r.qty)}</td>
        <td class="n">${num(r.unitPrice)}</td><td class="n">${num(s)}</td><td class="n">${num(tax)}</td><td class="n">${num(r.total)}</td></tr>`;
    };
    const empty = Array.from({ length: ROWS - rows.length }, () => '<tr>' + '<td></td>'.repeat(9) + '</tr>').join('');
    const notes = (data.notes || []).concat(K.notes);
    // 비고: 양식처럼 첫 줄은 비우고 둘째 줄부터, 최소 4줄
    const lines = [''].concat(notes);
    while (lines.length < 4) lines.push('');
    const remark = lines.map(t => `<div class="line">${esc(t)}</div>`).join('');
    return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${esc(kind)}${c.name ? ` - ${esc(c.name)}` : ''}</title><style>${CSS}</style></head><body>
<div class="sheet">
  <h1>${K.title}</h1><div class="title-line"></div>
  <div class="top">
    <div>
      <table class="box"><tr><td class="cap" colspan="2">수 신 자 정 보</td></tr>
        <tr><th>고 객 명</th><td>${esc(c.name)} <small>귀하</small></td></tr>
        <tr><th>기관(업체)명</th><td>${esc(c.org || '-')}</td></tr>
        <tr><th>이 메 일</th><td>${c.email ? `<a>${esc(c.email)}</a>` : '-'}</td></tr></table>
      <table class="box"><tr><td class="cap" colspan="2">발 급 서 류 정 보</td></tr>
        <tr><th>발 급 일 자</th><td>${esc(dateText(data.issuedAt || new Date()))}</td></tr>
        <tr><th>유 효 기 간</th><td>${esc(K.validity)}</td></tr>
        <tr><th>결 제 조 건</th><td>${esc(data.payTerms || '신용카드/무통장/계좌이체/휴대폰결제')}</td></tr></table>
      <p class="note-under">아래와 같이 확인합니다.</p>
    </div>
    <div class="supplier">
      <table class="box"><tr><td class="cap" colspan="3">공 급 자 정 보</td></tr>
        <tr><th>등 록 번 호</th><td colspan="2">${SUPPLIER.bizNo}</td></tr>
        <tr><th>상 호</th><td colspan="2">${SUPPLIER.name}</td></tr>
        <tr><th>대 표 자</th><td colspan="2">${SUPPLIER.ceo}</td></tr>
        <tr><th>사 업 장</th><td colspan="2">${SUPPLIER.address}</td></tr>
        <tr><th>업 태</th><td colspan="2">${SUPPLIER.bizType}</td></tr>
        <tr><th>종 목</th><td colspan="2">${SUPPLIER.bizItem}</td></tr>
        <tr><th rowspan="3" class="mgr">담당자 정보</th><td class="sub-th">담 당 자</td><td>${SUPPLIER.manager}</td></tr>
        <tr><td class="sub-th">전화번호</td><td>${SUPPLIER.tel}</td></tr>
        <tr><td class="sub-th">이 메 일</td><td><a>${SUPPLIER.email}</a></td></tr></table>
      ${A.SEAL ? `<img class="seal" src="${A.SEAL}" alt="직인">` : ''}
    </div>
  </div>
  <div class="under">- 아 래 -</div>
  <table class="sum"><tr><td class="lbl">공 급 총 액</td><td class="words">${koreanAmount(sum)} 원정 <small>(VAT포함)</small></td><td class="won"><span>₩</span>${num(sum)}</td></tr></table>
  <table class="items">
    <colgroup><col style="width:6%"><col style="width:12.5%"><col style="width:19%"><col style="width:6%"><col style="width:6.5%"><col style="width:12.5%"><col style="width:12.5%"><col style="width:12.5%"><col style="width:12.5%"></colgroup>
    <thead><tr><th>NO.</th><th>제 품 명</th><th>제품 상세 사양</th><th>${K.pageHead}</th><th>수 량</th><th>단 가</th><th>공 급 가</th><th>세 액</th><th>소 계</th></tr></thead>
    <tbody>${rows.map(line).join('')}${empty}
      <tr class="subtotal"><td colspan="4">소 &nbsp; &nbsp; &nbsp; &nbsp; 계</td><td class="w">${qty || ''}</td><td class="w" style="text-align:right">부</td><td class="w n">${num(sumSupply)}</td><td class="w n">${num(sum - sumSupply)}</td><td class="w n">${num(sum)}</td></tr>
      <tr class="grand"><td colspan="4">합 산 금 액 <small style="display:inline;color:#333">(단위 : 원)</small></td><td class="amt" colspan="5">${num(sum)}</td></tr>
    </tbody>
  </table>
  <div class="remark"><div class="cap">비 고</div>${remark}</div>
  ${A.LOGO ? `<img class="logo" src="${A.LOGO}" alt="KSI Korean Studies Information Co., Ltd.">` : ''}
  <div class="proto">※ 프로토타입 샘플 서류입니다.</div>
</div></body></html>`;
  }

  window.DocForms = { SUPPLIER, IMAGE_DOCS: Object.keys(IMAGE_DOC), build, orderRows, koreanAmount, dateText };
})();
