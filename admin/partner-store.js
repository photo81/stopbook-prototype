// 제휴문의 데이터 (쇼핑몰 고객센터 > 제휴문의 접수 ↔ 게시글관리 > 제휴문의 처리)
//   쇼핑몰(비회원 포함)이 제휴문의를 남기면 접수되고, 관리자가 담당자를 지정해 검토·답변(이메일)·보류 처리
//   IA(유저화면목록 ver0.03 제휴문의): 필수 제목·회사명·담당자명·이메일·내용, 파일 업로드, 히스토리 확인 불가(접수 후 고객이 조회하는 화면 없음)
//   운영 스탑북·타사(찍스·포토몬) 참고: 제휴 유형, 연락처, 관심 상품, 첨부(5MB·5개), 개인정보 수집·이용 동의(3년 보관), "검토 후 전화나 이메일로 연락"
//   처리 상태: 접수(담당자 없음) → 검토중(담당자 지정) → 답변완료(답변 이메일 발송) / 보류(진행 안 함·사유 기록). 답변 뒤에도 메모·상태 변경 가능
//   접수번호 P + 접수일(YYYYMMDD) + 일련번호 3자리. 저장: localStorage (샘플 + 접수분·처리 내용)
// TODO: 실서비스에서는 POST /api/partner-inquiries (쇼핑몰), GET/PUT /api/admin/partner-inquiries/{no}, 첨부는 파일 서버 업로드, 답변은 메일 발송 API
(function () {
  'use strict';
  const KEY = 'stopbook.partnerInquiries.v1';
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtDt = d => `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const nowText = () => fmtDt(new Date());
  const clean = s => String(s || '').trim().replace(/[ \t]+/g, ' ');
  const digits = s => String(s || '').replace(/\D/g, '');
  const validEmail = v => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v);

  const TYPES = ['기업·단체 주문', '입점·판매 제휴', '사진관·학원·교육기관 연계', '마케팅·콘텐츠 협업', '기타'];
  const PRODUCTS = ['포토북', '캘린더', '액자', '팬시·굿즈', '편집 대행', '기타'];
  const STATUSES = ['접수', '검토중', '답변완료', '보류'];
  const AGENTS = ['김지영', '김태복', '창경훈', '최의담', '이고은'];   // 처리 담당자 (1:1 문의와 같음). TODO: 관리자 계정
  const FILE_RULE = { max: 5, sizeMB: 5, ext: ['pdf', 'hwp', 'hwpx', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'zip'] };
  const CONSENT = { items: '회사명, 담당자명, 연락처, 이메일', purpose: '제휴문의 접수 확인 및 답변·협의 연락', period: '문의 처리 완료 후 3년 보관 뒤 파기' };
  const REPLY_DAYS = '영업일 2~3일';
  const CS = { tel: '080-860-1119', hours: '평일 10:00~17:00 (점심 12:00~13:00)', email: 'stopbook@kstudy.com' };

  // ===== 샘플 (최근 접수 순, 오늘 기준 상대 일수) =====
  const S = (daysAgo, hour, type, company, name, phone, email, title, content, products, extra) => Object.assign({
    daysAgo, hour, type, company, name, phone, email, title, content, products, qty: '', when: '', files: [], status: '접수', assignee: '', memo: '', reply: null, holdReason: ''
  }, extra || {});
  const SAMPLES = [
    S(0, 9, '기업·단체 주문', '(주)온누리교육', '강채원', '010-6511-7822', 'user90@example.com', '학원 수강생 졸업 앨범 200부 제작 문의', '12월 초 졸업식에 맞춰 수강생 졸업 앨범(포토북 21×29.7cm, 40p) 200부를 제작하려고 합니다. 표지에 학원 로고 금박이 가능한지, 수량 할인과 납기를 알려 주세요.', ['포토북'], { qty: '200부', when: '2026-12 초' }),
    S(0, 11, '입점·판매 제휴', '포토팩토리', '이수아', '010-2233-4455', 'sua@photofactory.co.kr', '사진관 체인 포토북 제작 위탁 제휴 제안', '전국 12개 지점을 운영하는 사진관입니다. 지점에서 촬영한 사진을 스탑북 편집기로 제작·배송하는 위탁 제휴를 제안드립니다. 지점별 계정과 정산 방식 협의를 원합니다.', ['포토북', '액자'], { files: ['포토팩토리_회사소개서.pdf'] }),
    S(1, 15, '사진관·학원·교육기관 연계', '한빛초등학교', '박지훈', '031-942-1840', 'jh.park@hanbit.es.kr', '학급 앨범 제작 단가 문의', '6학년 5개 반 학급 앨범(반당 30부, 총 150부)을 제작하려 합니다. 학교 양식 견적서와 거래명세서 발급이 가능한지, 후불 결제가 되는지 알려 주세요.', ['포토북'], { qty: '150부', when: '2027-01', status: '검토중', assignee: '이고은', memo: '교육기관 단체 회원 안내 필요. 후불 결제 조건 확인 중' }),
    S(2, 10, '마케팅·콘텐츠 협업', '여행하는 사진가', '최민서', '010-9988-7766', 'minseo@travelphoto.kr', '유튜브 채널 포토북 제작 협업 제안', '구독자 12만 여행 채널입니다. 여행 포토북 제작 과정을 콘텐츠로 소개하고 시청자 할인 코드를 제공하는 협업을 제안합니다. 채널 소개서를 첨부합니다.', ['포토북', '캘린더'], { files: ['채널소개서_여행하는사진가.pdf'], status: '검토중', assignee: '김지영' }),
    S(3, 14, '기업·단체 주문', '누리소프트(주)', '정우진', '02-555-0199', 'woojin@nurisoft.co.kr', '임직원 연말 선물용 캘린더 500부', '임직원 선물로 회사 사진을 넣은 탁상 캘린더 500부를 주문하려 합니다. 디자인 시안 작업(편집 대행)이 가능한지와 납기, 세금계산서 발행을 문의드립니다.', ['캘린더', '편집 대행'], { qty: '500부', when: '2026-12 중순', status: '답변완료', assignee: '김태복',
      reply: { at: '', to: 'woojin@nurisoft.co.kr', subject: '[스탑북] 임직원 연말 선물용 캘린더 500부 제작 문의 답변', body: '안녕하세요, 스탑북 김태복입니다.\n탁상 캘린더 500부는 편집 대행으로 시안 작업이 가능하며, 시안 확정 후 7영업일 안에 제작·발송됩니다. 500부 기준 단가와 세금계산서 발행 안내를 첨부합니다.\n편하신 시간에 연락 주시면 상세 협의드리겠습니다.', by: '김태복' } }),
    S(5, 16, '입점·판매 제휴', '굿즈마켓', '한예린', '010-4141-5252', 'partner@goodsmarket.kr', '오픈마켓 입점 제안', '팬시·굿즈 전문 오픈마켓입니다. 스탑북 굿즈 상품의 입점을 제안드립니다. 수수료 조건과 상품 연동 방식(API)을 안내드리고 싶습니다.', ['팬시·굿즈'], { status: '보류', assignee: '창경훈', holdReason: '현재 외부 마켓 입점 계획 없음. 2027년 상반기 재검토' }),
    S(7, 10, '사진관·학원·교육기관 연계', '꿈나무유치원', '윤서아', '031-777-2020', 'kkumnamu@daum.net', '원아 졸업앨범·포토북 제작', '원아 45명 졸업앨범과 학부모용 포토북 제작을 문의합니다. 사진 촬영은 자체 진행하고 편집만 맡기고 싶습니다.', ['포토북', '편집 대행'], { qty: '45부 + 학부모용', when: '2027-02', status: '답변완료', assignee: '이고은',
      reply: { at: '', to: 'kkumnamu@daum.net', subject: '[스탑북] 원아 졸업앨범·포토북 제작 문의 답변', body: '안녕하세요, 스탑북 이고은입니다.\n편집 대행(편집메이트)으로 진행 가능하며, 사진 전달 후 시안 2회 수정을 포함합니다. 유치원 단체 회원으로 가입하시면 단체 할인과 후불 결제를 적용받을 수 있습니다.', by: '이고은' } }),
    S(9, 13, '기타', '김도윤', '김도윤', '010-3030-4040', 'doyun.kim@gmail.com', '포토북 OEM 제작 가능 여부', '자체 브랜드 포토북을 스탑북 설비로 OEM 제작할 수 있는지 문의드립니다. 월 300부 정도 예상합니다.', ['포토북'], { qty: '월 300부', status: '답변완료', assignee: '창경훈',
      reply: { at: '', to: 'doyun.kim@gmail.com', subject: '[스탑북] 포토북 OEM 제작 문의 답변', body: '안녕하세요, 스탑북 창경훈입니다.\n현재 OEM 제작은 월 500부 이상 정기 물량에 한해 검토하고 있습니다. 예상 사양과 물량을 알려 주시면 가능 여부를 다시 안내드리겠습니다.', by: '창경훈' } }),
    S(12, 11, '마케팅·콘텐츠 협업', '베이비플래너', '오시우', '010-5656-7878', 'siu@babyplanner.kr', '육아 앱 제휴 쿠폰 제안', '월 이용자 8만 명의 육아 기록 앱입니다. 앱 사용자에게 스탑북 베이비 포토북 할인 쿠폰을 제공하는 제휴를 제안합니다.', ['포토북'], { status: '검토중', assignee: '김지영', memo: '마케팅팀 검토 요청 (10/15)' }),
    S(16, 15, '기업·단체 주문', '(주)새벽북스', '임채원', '02-3141-2200', 'cw.lim@saebyeokbooks.co.kr', '출판 기념 한정판 포토북 1,000부', '작가 사진집 한정판 포토북 1,000부 제작 견적을 요청드립니다. 하드커버·무광, 120p 사양입니다.', ['포토북'], { qty: '1,000부', when: '2027-03', status: '답변완료', assignee: '김태복',
      reply: { at: '', to: 'cw.lim@saebyeokbooks.co.kr', subject: '[스탑북] 한정판 포토북 1,000부 제작 견적 안내', body: '안녕하세요, 스탑북 김태복입니다.\n요청하신 사양의 견적서를 첨부합니다. 1,000부 기준 제작 기간은 시안 확정 후 15영업일입니다.', by: '김태복' } }),
    S(20, 9, '입점·판매 제휴', '스마트문구', '강지호', '010-1212-3434', 'jiho@smartmungu.com', '문구점 매대 판매용 상품 공급 문의', '전국 문구점 80곳에 납품하는 도매상입니다. 포토 액자·굿즈 완제품 공급 제휴를 문의드립니다.', ['액자', '팬시·굿즈'], { status: '보류', assignee: '최의담', holdReason: '완제품 도매 공급 불가 (맞춤 제작 상품). 안내 메일 발송' }),
    S(25, 14, '기타', '사진동호회 한울', '정민준', '010-7788-9900', 'hanul.photo@naver.com', '동호회 전시 도록 제작', '회원 전시회 도록 60부 제작과 전시장 액자 20점 제작을 함께 문의합니다.', ['포토북', '액자'], { qty: '도록 60부, 액자 20점', when: '2026-11', status: '답변완료', assignee: '이고은',
      reply: { at: '', to: 'hanul.photo@naver.com', subject: '[스탑북] 동호회 전시 도록·액자 제작 문의 답변', body: '안녕하세요, 스탑북 이고은입니다.\n도록은 포토북(21×29.7cm, 무광 하드커버)으로, 전시 액자는 20.3×25.4cm 유광으로 제안드립니다. 단체 회원 가입 시 할인이 적용됩니다.', by: '이고은' } })
  ];
  function buildSamples() {
    const now = new Date();
    const counters = {};
    return SAMPLES.map(s => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - s.daysAgo, s.hour, 10 + (s.daysAgo * 7) % 50);
      const day = fmtDate(d).replace(/-/g, '');
      counters[day] = (counters[day] || 0) + 1;
      const at = fmtDt(d);
      const log = [{ at, text: '제휴문의 접수 (쇼핑몰)', by: s.name }];
      let t = d.getTime();
      const step = h => { t += h * 3600000; return fmtDt(new Date(Math.min(t, now.getTime() - 60000))); };
      if (s.assignee) log.push({ at: step(1), text: `처리 담당자 지정: ${s.assignee}`, by: s.assignee });
      if (s.memo) log.push({ at: step(2), text: '내부 메모 저장', by: s.assignee });
      if (s.reply) { s.reply.at = step(20); log.push({ at: s.reply.at, text: `답변 이메일 발송 → ${s.reply.to}`, by: s.reply.by }); }
      if (s.status === '보류') log.push({ at: step(6), text: `보류 처리 (사유: ${s.holdReason})`, by: s.assignee });
      const { daysAgo, hour, ...rest } = s;
      return Object.assign(rest, { no: `P${day}-${pad(counters[day]).padStart(3, '0')}`, at, member: '', agree: true, sample: true, log });
    }).sort((a, b) => b.at.localeCompare(a.at));
  }

  let data;
  try { data = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { data = null; }
  if (!data || !Array.isArray(data.list)) data = { list: buildSamples() };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } };

  const list = () => data.list.slice().sort((a, b) => b.at.localeCompare(a.at));
  const find = no => data.list.find(q => q.no === no) || null;
  const pendingCount = () => data.list.filter(q => q.status === '접수').length;
  // 문의자가 회원이면 회원 정보 (이메일 기준, member-data.js가 있을 때)
  const memberOf = q => (window.MemberData ? MemberData.members.find(m => !m.withdrawn && String(m.email).toLowerCase() === String(q.email).toLowerCase()) || null : null);

  // ===== 쇼핑몰 접수 =====
  //   input = { type, company, name, phone, email, title, content, products[], qty, when, files[(파일명)], agree, member(로그인 회원 아이디) }
  //   반환: { ok: true, no } 또는 { error, field }
  function submit(input) {
    const x = { type: input.type, company: clean(input.company), name: clean(input.name), phone: clean(input.phone), email: clean(input.email).toLowerCase(),
      title: clean(input.title), content: String(input.content || '').trim(), products: (input.products || []).filter(p => PRODUCTS.includes(p)),
      qty: clean(input.qty), when: clean(input.when), files: (input.files || []).slice(0, FILE_RULE.max), agree: !!input.agree, member: input.member || '' };
    const err = (error, field) => ({ error, field });
    if (!TYPES.includes(x.type)) return err('제휴 유형을 선택해 주세요.', 'type');
    if (!x.title) return err('제목을 입력해 주세요.', 'title');
    if (x.title.length > 100) return err('제목은 100자 이내로 입력해 주세요.', 'title');
    if (!x.company) return err('회사명(기관명)을 입력해 주세요.', 'company');
    if (!x.name) return err('담당자명을 입력해 주세요.', 'name');
    if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(digits(x.phone).replace(/^(0\d{1,2})(\d{3,4})(\d{4})$/, '$1-$2-$3')) || digits(x.phone).length < 9) return err('연락처를 정확히 입력해 주세요. 예) 010-0000-0000, 02-000-0000', 'phone');
    if (!validEmail(x.email)) return err('이메일 주소를 정확히 입력해 주세요.', 'email');
    if (!x.content) return err('제휴 내용을 입력해 주세요.', 'content');
    if (x.content.length > 2000) return err('제휴 내용은 2,000자 이내로 입력해 주세요.', 'content');
    const badFile = x.files.find(f => !FILE_RULE.ext.includes(String(f).split('.').pop().toLowerCase()));
    if (badFile) return err(`첨부할 수 없는 파일입니다: ${badFile} (${FILE_RULE.ext.join(', ')}만 가능)`, 'files');
    if (!x.agree) return err('개인정보 수집·이용에 동의해 주세요.', 'agree');
    const now = new Date(), at = fmtDt(now), day = fmtDate(now).replace(/-/g, '');
    const n = data.list.filter(q => q.no.startsWith(`P${day}-`)).length + 1;
    const q = Object.assign(x, { no: `P${day}-${pad(n).padStart(3, '0')}`, at, status: '접수', assignee: '', memo: '', reply: null, holdReason: '', sample: false,
      log: [{ at, text: `제휴문의 접수 (쇼핑몰${x.member ? ` · 회원 ${x.member}` : ' · 비회원'})`, by: x.name }] });
    data.list.unshift(q);
    if (!save()) return err('문의를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', '');
    // 접수 확인 메일 기록 (관리자 > 메시지 > 이메일 발송 내역)
    const pm = memberOf(q);   // 회원이 접수한 건은 회원 상세 > 메시지 전송 이력에도 남김
    if (window.MessageStore) MessageStore.addLog({ channel: 'email', templateId: '', templateName: '제휴문의 접수 확인', ad: false, count: 1, success: 1, fail: 0, reserveAt: '', by: '시스템',
      recipients: pm ? [{ memberNo: pm.no, to: x.email, ok: true }] : [],
      sample: `[스탑북] ${x.name}님, 제휴문의(${q.no})가 접수되었습니다. 담당자가 검토 후 ${REPLY_DAYS} 안에 전화나 이메일로 연락드립니다.` });
    if (window.AdminUtil && AdminUtil.refreshNewMarks) AdminUtil.refreshNewMarks();
    return { ok: true, no: q.no };
  }

  // ===== 관리자 처리 =====
  const logOf = (q, text, by) => { const e = { at: nowText(), text, by }; q.log.push(e); return e; };
  // 담당자 지정 (접수 → 검토중). 빈 값이면 담당자 해제 (답변 전이면 접수로)
  function assign(no, agent, by) {
    const q = find(no); if (!q) return false;
    const prev = q.assignee;
    q.assignee = agent || '';
    if (q.status === '접수' && agent) q.status = '검토중';
    if (q.status === '검토중' && !agent) q.status = '접수';
    logOf(q, agent ? `처리 담당자 ${prev ? '변경' : '지정'}: ${prev ? `${prev} → ` : ''}${agent}` : `처리 담당자 해제 (${prev})`, by);
    const ok = save(); if (window.AdminUtil && AdminUtil.refreshNewMarks) AdminUtil.refreshNewMarks(); return ok;
  }
  // 내부 메모 (고객에게 보이지 않음)
  function saveMemo(no, memo, by) {
    const q = find(no); if (!q) return false;
    if ((q.memo || '') === String(memo || '').trim()) return true;
    q.memo = String(memo || '').trim();
    logOf(q, q.memo ? '내부 메모 저장' : '내부 메모 삭제', by);
    return save();
  }
  // 답변 이메일 발송 → 답변완료. r = { to, subject, body }. 반환: 오류 문구 또는 ''
  function reply(no, r, by) {
    const q = find(no); if (!q) return '문의를 찾을 수 없습니다.';
    const to = clean(r.to).toLowerCase(), subject = clean(r.subject), body = String(r.body || '').trim();
    if (!validEmail(to)) return '받는 이메일을 정확히 입력해 주세요.';
    if (!subject) return '메일 제목을 입력해 주세요.';
    if (!body) return '답변 내용을 입력해 주세요.';
    if (!q.assignee) { q.assignee = by; logOf(q, `처리 담당자 지정: ${by}`, by); }
    q.reply = { at: nowText(), to, subject, body, by };
    q.status = '답변완료'; q.holdReason = '';
    logOf(q, `답변 이메일 발송 → ${to}`, by);
    if (window.MessageStore) MessageStore.addLog({ channel: 'email', templateId: '', templateName: '제휴문의 답변', ad: false, count: 1, success: 1, fail: 0, reserveAt: '', by, sample: `[${subject}] ${body.slice(0, 80)}` });
    const ok = save(); if (window.AdminUtil && AdminUtil.refreshNewMarks) AdminUtil.refreshNewMarks();
    return ok ? '' : '저장소를 사용할 수 없어 저장하지 못했습니다.';
  }
  // 보류 (진행 안 함). 사유 필수. 반환: 오류 문구 또는 ''
  function hold(no, reason, by) {
    const q = find(no); if (!q) return '문의를 찾을 수 없습니다.';
    const why = String(reason || '').trim();
    if (!why) return '보류 사유를 입력해 주세요.';
    q.status = '보류'; q.holdReason = why;
    if (!q.assignee) q.assignee = by;
    logOf(q, `보류 처리 (사유: ${why})`, by);
    const ok = save(); if (window.AdminUtil && AdminUtil.refreshNewMarks) AdminUtil.refreshNewMarks();
    return ok ? '' : '저장소를 사용할 수 없어 저장하지 못했습니다.';
  }
  // 보류 해제 → 검토중 (답변이 있으면 답변완료)
  function resume(no, by) {
    const q = find(no); if (!q || q.status !== '보류') return false;
    q.status = q.reply ? '답변완료' : '검토중'; q.holdReason = '';
    logOf(q, `보류 해제 → ${q.status}`, by);
    return save();
  }

  window.PartnerStore = { TYPES, PRODUCTS, STATUSES, AGENTS, FILE_RULE, CONSENT, REPLY_DAYS, CS, list, find, pendingCount, memberOf, submit, assign, saveMemo, reply, hold, resume };
})();
