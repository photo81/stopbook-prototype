// 회원 샘플 데이터 (통합 회원 관리 / 단체회원 신청 화면 공유)
// TODO: 실서비스에서는 회원 API 응답으로 대체
(function () {
  'use strict';

  // ===== 샘플 데이터 (실서비스에서는 API 응답으로 대체) =====
  const LAST = ['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권'];
  const FIRST = ['민준','서연','도윤','지우','하준','서윤','예준','하은','시우','지민','주원','수아','지호','채원','현우'];
  const GRADE_ORDER = ['일반', '스타터', '홀리커', '마스터', '마스터 VIP'];   // 낮은 등급 → 높은 등급
  const GRADES = ['일반','일반','일반','스타터','스타터','홀리커','홀리커','마스터','마스터 VIP'];  // 샘플 분포

  let seed = 42;
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const members = [];
  const base = new Date(2026, 9, 8).getTime();   // 샘플 데이터 기준일 (주문·가입·문의 등은 이 날짜까지 생성). order-data.js TODAY, members.html·withdrawn.html의 기준일과 같게 유지
  // 1~137번: 최근 900일 안에 가입 / 138~149번: 최근 일주일(기준일 포함)에 가입한 신규 회원 (대시보드 '오늘·7일' 회원 집계용)
  //   신규 회원은 기존 회원 뒤에 이어서 만들어 기존 샘플 값(난수 순서)이 바뀌지 않음. 가입일은 기준일부터 하루씩 거슬러 두 바퀴
  const TOTAL = 149, RECENT_FROM = 138;
  for (let i = 1; i <= TOTAL; i++) {
    const recent = i >= RECENT_FROM;
    const join = new Date(base - (recent ? (i - RECENT_FROM) % 7 : Math.floor(rand() * 900)) * 86400000);
    const last = recent ? new Date(Math.min(base, join.getTime() + Math.floor(rand() * 3) * 86400000))
      : new Date(Math.min(base, join.getTime() + Math.floor(rand() * 400) * 86400000));
    members.push({
      no: 1000 + i,
      category: rand() > 0.2 ? '일반' : '단체',
      memberType: (v => v > 0.35 ? '스탑북회원' : v > 0.2 ? '카카오회원' : v > 0.08 ? '네이버회원' : '구글회원')(rand()),
      userId: 'user' + String(i).padStart(3, '0'),
      name: pick(LAST) + pick(FIRST),
      email: `user${i}@example.com`,
      phone: `010-${String(1000 + Math.floor(rand() * 9000))}-${String(1000 + Math.floor(rand() * 9000))}`,
      grade: pick(GRADES),
      ...(mk => ({ marketingSms: mk > 0.4 ? 'Y' : 'N', marketingEmail: mk > 0.25 && mk < 0.85 ? 'Y' : 'N' }))(rand()),
      joinDate: fmtDate(join),
      lastLogin: fmtDate(last),
      memos: [],     // { text, at, by }
      history: [{ at: fmtDate(join) + ' 00:00', content: '회원 가입', by: '시스템' }]   // { at, content, by }
    });
  }

  // ===== 프로필 샘플 (닉네임·성별·생일) =====
  // 가입 시 선택 입력 항목이라 비어 있는 회원도 있음. 위 회원 데이터에 영향 없도록 회원별 별도 난수로 생성
  // gender: '남' | '여' | '' (미입력), birth: 'YYYY-MM-DD' | ''
  const NICK_A = ['행복한', '여행하는', '반짝이는', '느긋한', '추억담는', '사진찍는', '하늘빛', '봄날의'];
  const NICK_B = ['고양이', '여행자', '포토그래퍼', '곰돌이', '다람쥐', '기록가', '토끼', '펭귄'];
  members.forEach(m => {
    let s = (m.no * 3571 + 7) % 233280;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    m.nickname = r() < 0.8 ? NICK_A[Math.floor(r() * NICK_A.length)] + NICK_B[Math.floor(r() * NICK_B.length)] : '';
    m.gender = (v => (v < 0.45 ? '여' : v < 0.85 ? '남' : ''))(r());
    m.birth = r() < 0.85 ? fmtDate(new Date(1962 + Math.floor(r() * 45), Math.floor(r() * 12), 1 + Math.floor(r() * 28))) : '';
  });

  // ===== 주소·관심분야 샘플 (마이페이지 > 회원정보 수정에서 선택 입력) =====
  //   zipcode(우편번호 5자리) · address1(우편번호 검색으로 채운 기본 주소) · address2(상세 주소)
  //   interests: INTERESTS 중 고른 항목 배열 · interestEtc: '직접 입력'에 적은 내용
  //   선택 입력이라 비어 있는 회원도 있음. 다른 샘플 값에 영향 없도록 회원별 별도 난수로 생성
  const INTERESTS = ['여행', '베이비', '키즈', '커플/웨딩', '일상', '졸업', '행사', '작품', '굿즈', '종교', '셀프디자인'];
  const INTEREST_ETC = '직접 입력';
  const SAMPLE_ADDR = [
    ['04001', '서울 마포구 월드컵북로 12', '3층 302호'], ['13487', '경기 성남시 분당구 판교로 45', '101동 1203호'],
    ['48058', '부산 해운대구 센텀중앙로 8', '센텀파크 1502호'], ['34141', '대전 유성구 대학로 99', '공학관 2층'],
    ['21984', '인천 연수구 송도과학로 31', '204동 807호'], ['06236', '서울 강남구 테헤란로 152', '12층'],
    ['61475', '광주 동구 금남로 245', '5층 501호'], ['41940', '대구 중구 동성로 32', '2층'],
    ['16514', '경기 수원시 영통구 광교중앙로 140', '1101동 1904호'], ['63122', '제주특별자치도 제주시 중앙로 217', '']
  ];
  const ETC_SAMPLES = ['반려동물', '캠핑', '등산 모임'];
  members.forEach(m => {
    let s = (m.no * 7919 + 13) % 233280;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    if (r() < 0.6) { const a = SAMPLE_ADDR[Math.floor(r() * SAMPLE_ADDR.length)]; Object.assign(m, { zipcode: a[0], address1: a[1], address2: a[2] }); }
    else Object.assign(m, { zipcode: '', address1: '', address2: '' });
    m.interests = r() < 0.65 ? [...new Set(Array.from({ length: 1 + Math.floor(r() * 3) }, () => INTERESTS[Math.floor(r() * INTERESTS.length)]))] : [];
    m.interestEtc = r() < 0.06 ? ETC_SAMPLES[Math.floor(r() * ETC_SAMPLES.length)] : '';
  });
  // 표시용: '여행 · 키즈 · 반려동물(직접 입력)' / 주소: '(04001) 기본 주소 상세 주소'
  const interestText = m => [...(m.interests || []), ...(m.interestEtc ? [`${m.interestEtc}(${INTEREST_ETC})`] : [])].join(' · ');
  const addressText = m => (m.address1 ? `(${m.zipcode}) ${m.address1}${m.address2 ? ' ' + m.address2 : ''}` : '');

  // 가입 기기 / 최근 접속 기기: PC / MO(모바일). 회원 번호로 정함 (다른 샘플 값에 영향 없음)
  // TODO: 실서비스에서는 가입·로그인 시 기록한 접속 환경(User-Agent 기준)
  members.forEach(m => {
    const h = k => (m.no * k + 7) % 100;
    m.joinEnv = h(37) < 60 ? 'MO' : 'PC';
    m.loginEnv = h(53) < 65 ? 'MO' : 'PC';
  });

  // 만 나이 (생일이 지나지 않았으면 1 빼기). 생일 미입력이면 null
  function ageOf(birth, now = new Date()) {
    if (!birth) return null;
    const [y, mo, d] = birth.split('-').map(Number);
    return now.getFullYear() - y - ((now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) ? 1 : 0);
  }

  // ===== 혜택 샘플 내역 =====
  // 내역(ledger)이 원장이고 보유량은 마지막 잔여값. 회원별 별도 난수로 생성해 위 회원 데이터에 영향 없음
  const BENEFITS = {
    mileage:  { label: '마일리지', unit: 'P',  plus: '지급', minus: '차감' },
    giftCard: { label: '상품권',   unit: '원', plus: '지급', minus: '차감' },
    coupon:   { label: '쿠폰',     unit: '장', plus: '지급', minus: '회수' }
  };
  const COUPONS = ['신규가입 10% 할인', '3,000원 할인', '무료배송', '생일축하 5,000원', '도서 2권 이상 15% 할인'];

  const fmtDateTime = d => `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  function pushEntry(list, e) {
    e.balance = (list.length ? list[list.length - 1].balance : 0) + e.delta;
    list.push(e);
  }

  function heldCoupons(list) {
    const held = new Map();
    list.forEach(e => held.set(e.item, (held.get(e.item) || 0) + e.delta));
    return [...held].filter(([, n]) => n > 0);
  }

  function makeLedger(m) {
    let s = (m.no * 7919) % 233280;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const from = new Date(m.joinDate).getTime();
    const dates = n => Array.from({ length: n }, () => new Date(from + r() * (base - from))).sort((a, b) => a - b);

    const mileage = [];
    dates(Math.floor(r() * 10)).forEach(d => {
      const bal = mileage.length ? mileage[mileage.length - 1].balance : 0;
      if (bal >= 1000 && r() < 0.35) {
        pushEntry(mileage, { at: fmtDateTime(d), type: '사용', item: '', reason: '주문 결제 시 사용', by: '시스템', delta: -Math.ceil(r() * bal / 100) * 100 });
      } else {
        pushEntry(mileage, { at: fmtDateTime(d), type: '적립', item: '', reason: r() < 0.7 ? '구매 확정 적립' : '리뷰 작성 적립', by: '시스템', delta: (1 + Math.floor(r() * 30)) * 100 });
      }
    });

    // 관리자 수동 지급·차감 샘플 (회원 약 15%). 별도 난수라 다른 샘플 값은 그대로. 지급 뒤 일부는 오지급 회수(차감)
    let s2 = (m.no * 104729 + 7) % 233280;
    const r2 = () => (s2 = (s2 * 9301 + 49297) % 233280) / 233280;
    if (r2() < 0.15) {
      const MANUAL = ['이벤트 당첨 보상', 'CS 보상 (배송 지연)', '불량 접수 보상', '오프라인 행사 참여 적립', '단체 주문 감사 적립'];
      const ADMINS = ['김지영', '김태복', '창경훈', '최의담', '이고은'];
      const t = new Date(from + (0.3 + r2() * 0.7) * (base - from)), amt = (1 + Math.floor(r2() * 5)) * 1000, by = ADMINS[Math.floor(r2() * ADMINS.length)];
      const extra = [{ at: fmtDateTime(t), type: '지급', item: '', reason: MANUAL[Math.floor(r2() * MANUAL.length)], by, delta: amt, source: 'manual' }];
      if (r2() < 0.3) extra.push({ at: fmtDateTime(new Date(Math.min(base, t.getTime() + (1 + Math.floor(r2() * 48)) * 3600000))), type: '차감', item: '', reason: '오지급 회수', by: ADMINS[Math.floor(r2() * ADMINS.length)], delta: -amt, source: 'manual' });
      const all = mileage.concat(extra).sort((a, b) => a.at.localeCompare(b.at));
      mileage.length = 0;
      all.forEach(e => { delete e.balance; pushEntry(mileage, e); });
    }

    const giftCard = [];
    dates(Math.floor(r() * 4)).forEach(d => {
      const bal = giftCard.length ? giftCard[giftCard.length - 1].balance : 0;
      if (bal > 0 && r() < 0.5) {
        pushEntry(giftCard, { at: fmtDateTime(d), type: '사용', item: '', reason: '도서 주문 시 사용', by: '시스템', delta: -Math.min(bal, (1 + Math.floor(r() * 3)) * 5000) });
      } else {
        pushEntry(giftCard, { at: fmtDateTime(d), type: '등록', item: '', reason: '상품권 번호 등록', by: '회원', delta: [10000, 30000, 50000][Math.floor(r() * 3)] });
      }
    });

    const coupon = [];
    dates(Math.floor(r() * 7)).forEach(d => {
      const held = heldCoupons(coupon);
      if (held.length && r() < 0.4) {
        pushEntry(coupon, { at: fmtDateTime(d), type: r() < 0.7 ? '사용' : '만료', item: held[Math.floor(r() * held.length)][0], reason: '', by: '시스템', delta: -1 });
      } else {
        pushEntry(coupon, { at: fmtDateTime(d), type: '발급', item: COUPONS[Math.floor(r() * COUPONS.length)], reason: '이벤트 자동 발급', by: '시스템', delta: 1 });
      }
    });

    m.ledger = { mileage, giftCard, coupon };
    Object.keys(m.ledger).forEach(k => {
      const list = m.ledger[k];
      m[k] = list.length ? list[list.length - 1].balance : 0;
    });
  }
  members.forEach(makeLedger);

  // ===== 관리자 마일리지 지급·차감 기록 =====
  // 취소 요청·반품을 마일리지로 환불하면 그 금액만큼 회원 마일리지가 자동 지급됨 (claim-data.js). 샘플 원장은 화면을 열 때마다 새로 만들므로 localStorage에 보관해 뒤에 덧붙임
  // { [회원 no]: [{ at, type, item, reason, by, delta }] }
  // TODO: 실서비스에서는 POST /api/admin/members/{no}/benefits/mileage
  const MILEAGE_KEY = 'stopbook.mileageAdjust.v1';
  let MILEAGE = {};
  try { MILEAGE = JSON.parse(localStorage.getItem(MILEAGE_KEY)) || {}; } catch (e) { /* 저장소 사용 불가 시 기록 없음 */ }
  const applyMileage = (m, e) => { pushEntry(m.ledger.mileage, e); m.mileage = m.ledger.mileage[m.ledger.mileage.length - 1].balance; };
  members.forEach(m => (MILEAGE[m.no] || []).forEach(e => applyMileage(m, Object.assign({}, e))));
  // 마일리지 지급(delta > 0)·차감(delta < 0). opts = { delta, reason, by, item?, type?, source?, history?, orderNo? }. 회원 마일리지 내역·보유량·회원 히스토리에 반영. 반환: 저장 성공 여부
  //   source: 'manual'(관리자 직접 지급·차감, 회원 상세) / 'refund'(취소·반품 마일리지 환불 자동 지급). history: false면 회원 히스토리는 부르는 쪽에서 남김
  //   탈퇴 회원은 보유 혜택이 소멸되어 지급·차감 불가 (취소·반품 마일리지 환불도 다른 환불 수단으로 처리)
  function addMileage(no, opts) {
    const m = members.find(x => x.no === no);
    if (!m || !opts.delta || m.withdrawn) return false;
    const e = { at: fmtDateTime(new Date()), type: opts.type || (opts.delta > 0 ? '적립' : '사용'), item: opts.item || '', reason: opts.reason || '', by: opts.by || '관리자', delta: opts.delta, source: opts.source || (opts.item ? 'refund' : 'manual') };
    if (opts.orderNo) e.orderNo = opts.orderNo;   // 관련 주문 (마일리지 내역 > 지급/차감에서 고른 주문)
    applyMileage(m, e);
    if (opts.history !== false) m.history.push({ at: e.at, content: `마일리지 ${opts.delta > 0 ? '지급' : '차감'}: ${Math.abs(opts.delta).toLocaleString()}P (사유: ${e.reason})`, by: e.by });
    (MILEAGE[no] || (MILEAGE[no] = [])).push(e);
    try { localStorage.setItem(MILEAGE_KEY, JSON.stringify(MILEAGE)); return true; } catch (err) { return false; }
  }
  // 전체 회원 마일리지 지급·차감 이력 (혜택 > 마일리지 내역). 최근 순
  //   구분: 자동 = 시스템(구매 확정·리뷰 적립, 주문 사용) · 환불 자동 지급(취소·반품 마일리지 환불) / 수동 = 관리자 직접 지급·차감
  const sourceOf = e => e.source || (e.by === '시스템' ? 'system' : e.item ? 'refund' : 'manual');
  // 관련 주문번호: 환불 = 취소·반품 신청번호(C/X + 주문번호)의 주문, 구매 확정·리뷰 적립·주문 사용·주문 관련 보상 = 그날 이전 가장 최근 주문
  //   같은 주문은 종류(구매 확정·리뷰·주문 사용·보상)마다 한 번만 연결 (오래된 기록부터 아직 연결되지 않은 가장 최근 이전 주문). 주문 데이터(최근 1년)보다 오래된 기록은 연결할 주문이 없어 비어 있음
  const ORDER_KIND = [[/구매 확정/, 'confirm'], [/리뷰/, 'review'], [/주문/, 'use'], [/배송|불량/, 'care']];
  function orderLinks(m) {
    const used = {}, links = new Map();
    const orders = (m.orders || []).filter(x => x.orderNo).sort((a, b) => b.at.localeCompare(a.at));
    (m.ledger ? m.ledger.mileage : []).slice().sort((a, b) => a.at.localeCompare(b.at)).forEach(e => {
      if (e.orderNo) { links.set(e, e.orderNo); return; }
      if (e.item && /^[CX]\d{13}$/.test(e.item)) { links.set(e, `${e.item.slice(1, 9)}-${e.item.slice(9)}`); return; }
      const kind = (ORDER_KIND.find(([re]) => re.test(e.reason || '')) || [])[1];
      if (!kind) return;
      const set = used[kind] || (used[kind] = new Set()), day = e.at.slice(0, 10);
      const o = orders.find(x => x.at <= day && !set.has(x.orderNo));
      if (o) { set.add(o.orderNo); links.set(e, o.orderNo); }
    });
    return links;
  }
  const mileageHistory = () => members.flatMap(m => {
    const links = orderLinks(m);
    return (m.ledger ? m.ledger.mileage : []).map((e, seq) => Object.assign({ m, mode: sourceOf(e) === 'manual' ? '수동' : '자동', source: sourceOf(e), seq }, e, { orderNo: links.get(e) || '' }));
  }).sort((a, b) => b.at.localeCompare(a.at) || (a.m === b.m ? b.seq - a.seq : 0));   // 같은 분이면 나중 기록이 위로

  // ===== 주문 실적 샘플 (등급 자동 산정용) =====
  // 주문 리스트 화면은 아직 없음. 등급 산정에 필요한 최소 정보(주문일·결제금액)만 회원별로 생성
  // TODO: 주문 리스트 구현 후 실제 주문 데이터(또는 GET /api/admin/members/{no}/order-stats)로 대체
  function makeOrders(m) {
    let s = (m.no * 104729) % 233280;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const from = Math.max(new Date(m.joinDate).getTime(), base - 365 * 86400000);
    // 최근 일주일 안에 가입한 신규 회원은 주문 0~2건 (가입 직후라 많을 수 없음)
    const n0 = r() < 0.25 ? 0 : Math.floor(r() * 25);
    const n = m.joinDate >= fmtDate(new Date(base - 7 * 86400000)) ? Math.min(n0, 2) : n0;
    m.orders = Array.from({ length: n }, () => ({
      at: fmtDate(new Date(from + r() * (base - from))),
      amount: (80 + Math.floor(r() * 520)) * 100   // 8,000 ~ 60,000원
    })).sort((a, b) => a.at.localeCompare(b.at));
    // 기준일(오늘) 주문: 주문이 있는 회원 중 일부는 기준일에도 주문 (대시보드 '오늘' 집계용. 난수는 위 주문 다음에 써서 기존 값이 바뀌지 않게 함)
    if (n && m.no % 9 === 0) m.orders.push({ at: fmtDate(new Date(base)), amount: (80 + Math.floor(r() * 520)) * 100 });
  }
  members.forEach(makeOrders);

  // ===== 이용 정보 샘플 (회원 상세 > 이용 정보: 주문 내역·문의 이력·장바구니) =====
  // 위 주문 실적(일자·금액)은 등급 산정에 쓰이므로 그대로 두고, 표시용 상세 정보만 별도 난수로 덧붙임
  // TODO: 실서비스에서는 GET /api/admin/members/{no}/orders | inquiries | cart 로 대체
  // 스탑북(www.stopbook.com) 판매 상품 기준 [상품명, 카테고리, 판매가(기본 옵션 시작가)] (2026-10-01 확인)
  // TODO: 실서비스에서는 상품 마스터에서 조회
  const PRODUCTS = [
    ['마이트립북', '포토북', 28900], ['조이풀트립', '포토북', 17500], ['시티북 A5', '포토북', 21000],
    ['트래블북 A5', '포토북', 21000], ['팔레트', '포토북', 17500], ['메모리북', '포토북', 28900],
    ['포토로그북', '포토북', 21200], ['레코드북', '포토북', 32800], ['러블리커플', '포토북', 17500],
    ['타임레코드', '포토북', 17500],
    ['비트윈캘린더', '캘린더', 16000], ['스탠다드 캘린더', '캘린더', 14000], ['우드월캘린더', '캘린더', 26000],
    ['우드스탠드 캘린더', '캘린더', 22000],
    ['원목액자', '액자', 17360], ['심플액자', '액자', 9660], ['프리미엄 아크릴액자', '액자', 50800], ['감성액자', '액자', 11830],
    ['엽서', '팬시·굿즈', 2100], ['포토노트', '팬시·굿즈', 4800], ['포토엽서', '팬시·굿즈', 18000], ['미니배너', '팬시·굿즈', 3700]
  ];
  // 카테고리별 옵션 예시 (장바구니 미리보기에 표시)
  const OPTIONS = {
    '포토북': ['하드커버 · 24페이지', '소프트커버 · 30페이지', '레이플랫 · 40페이지'],
    '캘린더': ['2027년 · 1월 시작', '2027년 · 3월 시작'],
    '액자': ['5x7 · 화이트', '8x10 · 내추럴', 'A4 · 블랙'],
    '팬시·굿즈': ['무광 코팅', '유광 코팅', '기본']
  };
  const PROJECT_NAMES = ['제주 여름 여행', '우리 아이 첫돌', '가족 사진 모음', '2026 졸업 기념', '커플 100일', '반려견 일기', '부모님 선물', '동아리 추억'];
  // 장바구니 작업물 미리보기(스탑북 뷰어). 샘플은 모든 상품에 같은 예시 작업물을 연결
  // TODO: 실서비스에서는 장바구니 항목의 작업 키(mskey)와 고객 아이디(user_id)로 주소를 만듦
  const VIEWER_SAMPLE = { mskey: '612574', userId: 'jy811228' };
  const viewerUrl = (mskey, userId) =>
    `https://www.stopbook.com/viewer/viewer_mobile.asp?mskey=${encodeURIComponent(mskey)}&user_id=${encodeURIComponent(userId)}`;
  // 결제수단 샘플 (신용카드는 두 번 넣어 비중을 높임). TODO: 실서비스에서는 결제 설정값 사용
  const PAY_METHODS = ['신용카드', '신용카드', '무통장입금', '계좌이체', '휴대폰결제', '네이버페이', '토스페이', '카카오페이'];
  const INQ_TYPES = ['주문/결제', '배송', '상품', '교환/반품', '회원정보', '기타'];
  const INQ_SAMPLES = {
    '주문/결제': ['결제 수단을 변경하고 싶어요', '주문 후 영수증 발급 문의', '카드 결제가 두 번 된 것 같아요'],
    '배송': ['언제 도착하나요?', '배송지를 변경할 수 있나요?', '택배가 분실된 것 같아요'],
    '상품': ['포토북 페이지를 추가할 수 있나요?', '캘린더 시작 월을 바꾸고 싶어요', '액자 사이즈 문의'],
    '교환/반품': ['인쇄 불량으로 재제작 요청합니다', '사진 색감이 화면과 달라요'],
    '회원정보': ['등급 산정 기준이 궁금해요', '휴대폰 번호 변경 방법'],
    '기타': ['단체 대량 제작 견적 요청', '졸업앨범 제작 문의']
  };
  // 문의 본문 (제목별). 난수를 쓰지 않으므로 다른 샘플 값에 영향 없음
  const INQ_CONTENT = {
    '결제 수단을 변경하고 싶어요': '무통장입금으로 주문했는데 카드 결제로 바꾸고 싶습니다. 아직 입금 전인데 결제 수단만 변경할 수 있을까요?',
    '주문 후 영수증 발급 문의': '회사 경비 처리를 하려고 합니다. 주문한 건의 카드 영수증이나 거래내역서를 받을 수 있는 방법을 알려 주세요.',
    '카드 결제가 두 번 된 것 같아요': '결제 버튼을 누른 뒤 화면이 멈춰서 다시 눌렀더니 카드 승인 문자가 두 번 왔습니다. 주문 내역에는 한 건만 보이는데 확인 부탁드립니다.',
    '언제 도착하나요?': '주문한 상품이 아직 제작 중으로 나옵니다. 이번 주 안에 받을 수 있을지 궁금합니다. 선물용이라 날짜가 중요해요.',
    '배송지를 변경할 수 있나요?': '이사를 하게 되어서 배송지를 바꾸고 싶습니다. 아직 출고 전이라면 새 주소로 변경 부탁드립니다.',
    '택배가 분실된 것 같아요': '배송 완료로 나오는데 상품을 받지 못했습니다. 경비실과 문 앞 모두 확인했는데 없습니다. 확인 부탁드립니다.',
    '포토북 페이지를 추가할 수 있나요?': '편집 중인 포토북에 사진이 많아서 페이지를 더 넣고 싶습니다. 최대 몇 페이지까지 추가할 수 있고, 추가 금액은 얼마인가요?',
    '캘린더 시작 월을 바꾸고 싶어요': '캘린더를 1월 시작으로 주문했는데 3월 시작으로 바꾸고 싶습니다. 제작 전이면 변경할 수 있을까요?',
    '액자 사이즈 문의': '8x10 액자에 세로 사진을 넣으면 잘리는 부분이 있나요? 실제 인쇄 영역이 궁금합니다.',
    '인쇄 불량으로 재제작 요청합니다': '받은 포토북의 몇 페이지에 줄무늬가 생겼습니다. 사진을 첨부합니다. 재제작이 가능한지 확인 부탁드립니다.',
    '사진 색감이 화면과 달라요': '모니터에서 본 것보다 사진이 많이 어둡게 인쇄되었습니다. 교환이나 재제작이 가능한지 궁금합니다.',
    '등급 산정 기준이 궁금해요': '이번 달 등급이 내려갔는데 산정 기준이 어떻게 되는지 알고 싶습니다. 취소한 주문도 실적에 포함되나요?',
    '휴대폰 번호 변경 방법': '휴대폰 번호가 바뀌었는데 본인 인증이 안 돼서 회원정보 수정을 못 하고 있습니다. 어떻게 변경하면 될까요?',
    '단체 대량 제작 견적 요청': '회사 창립 기념으로 포토북 120부를 제작하려고 합니다. 대량 주문 할인과 제작 기간을 알려 주세요.',
    '졸업앨범 제작 문의': '유치원 졸업앨범 35부를 제작하려고 합니다. 단체 회원 신청이 필요한지, 디자인 지원이 되는지 궁금합니다.'
  };
  // 답변 본문 (유형별). 답변자는 관리자 실명 (notice-store.js 관리자 공지 작성자와 같은 명단)
  const INQ_ANSWERS = {
    '주문/결제': '결제 내역을 확인했습니다. 요청하신 내용으로 처리해 드렸으며, 처리 결과는 마이페이지 > 주문 내역에서 확인하실 수 있습니다.',
    '배송': '주문하신 상품의 제작·출고 일정을 확인했습니다. 출고되면 알림톡으로 송장번호를 안내해 드리겠습니다.',
    '상품': '문의하신 옵션을 확인했습니다. 편집기에서 바로 변경하실 수 있도록 안내해 드리며, 제작 전이라면 추가 비용 없이 변경됩니다.',
    '교환/반품': '보내주신 사진으로 상태를 확인했습니다. 불편을 드려 죄송합니다. 재제작으로 접수해 두었으며, 제작이 끝나면 다시 배송해 드리겠습니다.',
    '회원정보': '회원정보를 확인했습니다. 안내드린 방법으로 진행해 보시고, 계속 어려우시면 고객센터(02-0000-0000)로 연락 주세요.',
    '기타': '문의하신 내용을 담당 부서에 전달했습니다. 담당자가 확인 후 남겨주신 연락처로 상세 견적과 일정을 안내해 드리겠습니다.'
  };
  const INQ_ADMINS = ['김지영', '김태복', '창경훈', '최의담', '이고은'];

  function makeUsage(m) {
    let s = (m.no * 7907 + 13) % 233280;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const pickR = arr => arr[Math.floor(r() * arr.length)];
    const daysAgo = d => Math.floor((base - new Date(d).getTime()) / 86400000);

    // 주문 상세: 일자·금액은 기존 값 유지(등급 산정용), 상품명·수량·상태·결제수단만 채움
    // 제작상태(주문 제작 흐름): 주문완료 → 제작중 → 배송중(전체) (주문대기·배송중(부분)·배송완료는 아래에서 지정)
    //   2일 이내 주문완료·제작중 / 3~6일 제작중·배송중 / 7일 이상 배송중
    (m.orders || []).forEach((o, i) => {
      const p = pickR(PRODUCTS);
      const qty = 1 + Math.floor(r() * 3);
      const kinds = 1 + Math.floor(r() * 3);
      const d = daysAgo(o.at);
      Object.assign(o, {
        orderNo: `${o.at.replace(/-/g, '')}-${String(m.no).slice(-3)}${String(i + 1).padStart(2, '0')}`,
        title: kinds > 1 ? `${p[0]} 외 ${kinds - 1}종` : p[0],
        productCategory: p[1],
        qty: qty + kinds - 1,
        status: d <= 2 ? pickR(['주문완료', '제작중']) : d <= 6 ? pickR(['제작중', '배송중(전체)']) : '배송중(전체)',
        payMethod: pickR(PAY_METHODS)
      });
    });

    // 문의 이력: 0~5건, 최근 문의 일부는 답변 대기
    const from = new Date(m.joinDate).getTime();
    m.inquiries = Array.from({ length: Math.floor(r() * r() * 6) }, (_, i) => {
      const type = pickR(INQ_TYPES);
      const at = new Date(from + r() * (base - from));
      const waiting = (base - at.getTime()) < 5 * 86400000 || r() < 0.08;
      const ans = new Date(at.getTime() + (2 + Math.floor(r() * 40)) * 3600000);
      return {
        no: m.no * 10 + i, type, title: pickR(INQ_SAMPLES[type]),
        at: fmtDateTime(at),
        content: '',   // 제목이 정해진 뒤 아래에서 채움
        status: waiting ? '답변대기' : '답변완료',
        answeredAt: waiting ? '' : fmtDateTime(ans),
        answer: '',
        answeredBy: waiting ? '' : INQ_ADMINS[(m.no + i) % INQ_ADMINS.length]
      };
    }).sort((a, b) => b.at.localeCompare(a.at));
    m.inquiries.forEach(q => {
      q.content = INQ_CONTENT[q.title] || '안녕하세요. 문의드립니다. 확인 부탁드립니다.';
      if (q.status === '답변완료') q.answer = `안녕하세요, ${m.name} 고객님. 스탑북입니다.\n${INQ_ANSWERS[q.type] || INQ_ANSWERS['기타']}\n감사합니다.`;
    });

    // 장바구니: 0~5개 상품. 주문 제작 상품이라 고객이 편집해 둔 작업물(프로젝트) 단위로 담김
    // price = 판매가(기본 옵션), savedAt = 장바구니에 보관한 날
    const used = new Set();
    m.cart = Array.from({ length: Math.floor(r() * 6) }, () => {
      let p; do { p = pickR(PRODUCTS); } while (used.has(p[0]) && used.size < PRODUCTS.length);
      used.add(p[0]);
      return {
        title: p[0], productCategory: p[1], price: p[2],
        option: pickR(OPTIONS[p[1]]),
        project: pickR(PROJECT_NAMES),
        qty: 1 + Math.floor(r() * r() * 3),
        savedAt: fmtDate(new Date(base - Math.floor(r() * 30) * 86400000)),
        previewUrl: viewerUrl(VIEWER_SAMPLE.mskey, VIEWER_SAMPLE.userId)
      };
    });
  }
  members.forEach(makeUsage);

  // 답변 대기 문의는 오늘 접수분 7~10건만 (1:1 문의는 대부분 당일 답변). 남긴 문의는 접수 시각을 오늘로, 나머지 답변 대기 샘플은 문의 이력에서 뺌
  //   (member-type-store.js keepTodayPending. 답변 완료 문의 = 지난 이력은 그대로)
  if (window.AdminUtil && AdminUtil.keepTodayPending) {
    const all = members.flatMap(m => m.inquiries || []);
    const kept = new Set(AdminUtil.keepTodayPending(all, q => q.status === '답변대기', 'inquiry'));
    members.forEach(m => {
      if (!m.inquiries) return;
      m.inquiries = m.inquiries.filter(q => q.status !== '답변대기' || kept.has(q)).sort((a, b) => b.at.localeCompare(a.at));
    });
  }
  // 1:1 문의(board-inquiry.html)에서 관리자가 처리한 내용(유형 변경·답변 완료·답변 수정)을 회원 문의 이력에도 반영
  //   저장 형식은 inquiry-data.js 참고 ({ [문의 no]: { type, status, answer, answeredAt, answeredBy, ... } })
  // TODO: 실서비스에서는 문의 API 한 곳에서 조회
  try {
    const inqEdits = JSON.parse(localStorage.getItem('stopbook.inquiries.v1')) || {};
    members.forEach(m => (m.inquiries || []).forEach(q => {
      const ov = inqEdits[q.no];
      if (!ov) return;
      q.sample = { type: q.type, status: q.status, answer: q.answer, answeredAt: q.answeredAt, answeredBy: q.answeredBy };   // 원래 샘플 값 (inquiry-data.js가 샘플 처리 이력을 만들 때 사용)
      if (ov.type) q.type = ov.type;
      if (ov.status === '완료' && ov.answer) Object.assign(q, { status: '답변완료', answer: ov.answer, answeredAt: ov.answeredAt, answeredBy: ov.answeredBy });
    }));
  } catch (e) { /* 저장값이 없거나 깨졌으면 샘플 그대로 */ }

  // ===== 결제상태·제작상태 샘플 =====
  // 결제상태(payStatus): 입금대기(무통장입금 접수 후 미입금) / 결제완료 / 전체취소 (부분취소는 주문 상품별로 order-data.js에서 정함)
  // 제작상태(status, 주문 단위):
  //   주문대기      입금 전
  //   주문완료      입금 완료 후 제작 시작 전
  //   제작중        제작 진행 중
  //   배송중(부분)  주문 상품 중 일부만 출고 (상품이 2종 이상인 주문만)
  //   배송중(전체)  전체 상품 출고
  //   배송완료      전체 상품 배송 완료
  //   전체취소 주문은 제작상태 없음('')
  // 주문번호별 별도 난수로 정하므로 다른 샘플 값에는 영향 없음
  //   약 5% → 전체취소 / 출고 후 10일 이상 지난 주문 대부분 → 배송완료 / 2종 이상 출고 주문 일부 → 배송중(부분)
  // 취소 주문은 주문 실적(회원등급 산정·주문 합계)에서 제외 → validOrders 사용
  // TODO: 실서비스에서는 상품별 제작·출고 상태 사용
  members.forEach(m => (m.orders || []).forEach(o => {
    let s = [...o.orderNo].reduce((h, c) => (h * 37 + c.charCodeAt(0)) % 233280, 11);
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const days = Math.floor((base - new Date(o.at).getTime()) / 86400000);
    if (r() < 0.05) o.payStatus = '전체취소';
    else {
      // 미입금: 무통장입금으로 주문한 지 7일 이내이고 제작 전(주문완료·제작중으로 뽑힌 건)이면 아직 입금 전인 것으로 → 미입금 주문 샘플
      o.payStatus = o.payMethod === '무통장입금' && days <= 7 && ['주문완료', '제작중'].includes(o.status) ? '입금대기' : '결제완료';
      if (o.status === '배송중(전체)' && days >= 10 && r() < 0.85) o.status = '배송완료';
    }
    if (o.payStatus === '입금대기') o.status = '주문대기';
    else if (o.payStatus === '전체취소') o.status = '';
    else if (o.status === '배송중(전체)' && /외 \d+종/.test(o.title) && r() < 0.4) o.status = '배송중(부분)';
  }));
  // 제작상태·결제상태 → 배지 색 클래스 (값에 괄호가 있어 CSS 클래스명으로 직접 쓰지 않음)
  const STATUS_CLASS = { '주문대기': 'st-wait', '주문완료': 'st-recv', '제작중': 'st-make', '배송중(부분)': 'st-part', '배송중(전체)': 'st-ship', '배송완료': 'st-done', '전체취소': 'st-cancel',
    '배송중': 'st-ship', '취소': 'st-cancel' };   // 아래 두 개는 주문 상세 > 주문 상품의 상품별 진행상태
  const statusClass = s => STATUS_CLASS[s] || '';
  const validOrders = m => (m.orders || []).filter(o => o.payStatus !== '전체취소');

  // 기간(YYYY-MM-DD, 양끝 포함) 내 주문횟수·주문금액 합계 (취소 주문 제외)
  function orderStats(m, from, to) {
    return validOrders(m).filter(o => o.at >= from && o.at <= to)
      .reduce((acc, o) => ({ count: acc.count + 1, amount: acc.amount + o.amount }), { count: 0, amount: 0 });
  }

  // ===== 회원 구분 샘플 =====
  // 회원 유형 관리 > 구분 목록을 처음 한 번 저장해 둔 것(sampleCategoryTree)을 기준으로 배정 (member-type-store.js를 먼저 로드해야 함)
  //   그 뒤 구분을 숨기거나 추가해도 기존 회원의 구분은 바뀌지 않음 (매번 현재 목록으로 나누면 다른 회원의 구분까지 다시 배정됨)
  //   기본 구분(normal) 약 80%, 나머지 20%는 그 외 구분에 회원 번호 순으로 번갈아 배정. 종류가 있는 구분은 종류도 번갈아 지정
  //   저장소를 못 읽으면 기본값(일반/단체)으로 생성. 승인된 단체 신청 회원은 아래 applyApproval에서 관리자가 지정한 구분·종류로 덮어씀
  // 회원 구분 참조: categoryCode(기준, 회원 유형 관리의 구분 code) + category(표시명)
  // 기본값은 member-type-store.js DEFAULTS와 같게 유지 (일반 + 기관·학교·유치원·어린이집·회사·단체)
  const DEFAULT_TREE = [
    { code: 'normal', name: '일반', subs: [] },
    { code: 'institution', name: '기관', subs: [] },
    { code: 'school', name: '학교', subs: [] },
    { code: 'kindergarten', name: '유치원', subs: [] },
    { code: 'daycare', name: '어린이집', subs: [] },
    { code: 'company', name: '회사', subs: [] },
    { code: 'group', name: '단체', subs: ['동호회', '협회', '기타'] }
  ];
  const liveTree = window.MemberTypeStore && MemberTypeStore.sampleCategoryTree ? MemberTypeStore.sampleCategoryTree() : [];
  const catTree = liveTree.length ? liveTree : DEFAULT_TREE;
  const mainCat = catTree.find(c => c.code === 'normal') || catTree[0];              // 개인 회원 기본 구분
  const otherCats = catTree.filter(c => c !== mainCat);
  const groupCat = catTree.find(c => c.code === 'group') || otherCats[0] || mainCat;  // 단체 신청 승인 시 지정하는 구분
  const subOf = (cat, n) => cat.subs.length ? cat.subs[n % cat.subs.length] : '';
  members.forEach(m => {
    // 생성 시 뽑은 '단체' 역할 표시(약 20%)를 현재 구분으로 교체
    const cat = m.category === '단체' && otherCats.length ? otherCats[m.no % otherCats.length] : mainCat;
    m.categoryCode = cat.code;
    m.category = cat.name;
    m.subCategory = subOf(cat, Math.floor(m.no / 7));   // 구분 배정(no % 구분 수)과 겹치지 않게 종류는 다른 간격으로 번갈아
  });

  // 후불 결제 샘플: 단체 회원(기본 구분 외 모든 구분) 일부에 올해 적용 (후불 결제는 단체 회원만 설정 가능 — 회원 상세에서 기본 구분이면 선택 불가)
  members.forEach(m => {
    const on = m.categoryCode !== mainCat.code && m.no % 2 === 0;
    Object.assign(m, { postpay: on ? 'Y' : 'N', postpayFrom: on ? '2026-01-01' : '', postpayTo: on ? '2026-12-31' : '' });
  });

  // 후결제 주문 샘플: 후불 결제가 적용된 회원이 적용 기간 안에 한 주문의 절반가량은 선결제 없이 주문 → 상품 수령 후 결제
  //   결제수단 '후결제', 결제상태 '후결제대기' (제작·배송은 결제와 상관없이 진행). 배송완료 후 열흘이 지난 주문은 결제가 끝난 것으로(결제완료)
  //   주문번호로 정하므로 다른 샘플 값에는 영향 없음. 관리자가 입금처리하면 order-data.js에서 결제완료로 바뀜
  // TODO: 실서비스에서는 주문 시 고객이 고른 결제수단(후결제) 사용
  const postpayOrder = (o, status) => {
    o.payMethod = '후결제';
    o.payStatus = status;
    if (o.status === '주문대기') o.status = '주문완료';   // 후결제는 입금을 기다리지 않고 바로 접수
  };
  const skipped = [];   // 절반 규칙에서 빠진 후불 회원 주문 (아래에서 입금대기 샘플을 보충할 때 사용)
  members.filter(m => m.postpay === 'Y').forEach(m => (m.orders || []).forEach(o => {
    if (o.at < m.postpayFrom || o.at > m.postpayTo || o.payStatus === '전체취소') return;
    if ([...o.orderNo].reduce((h, c) => (h * 29 + c.charCodeAt(0)) % 9973, 5) % 2) { skipped.push(o); return; }
    const days = Math.floor((base - new Date(o.at).getTime()) / 86400000);
    postpayOrder(o, o.status === '배송완료' && days >= 20 ? '결제완료' : '후결제대기');
  }));
  // 입금대기(후결제대기) 샘플 보충: 절반 규칙에서 빠진 주문 중 최근 5건을 입금 전 후결제 주문으로 추가
  skipped.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5).forEach(o => postpayOrder(o, '후결제대기'));

  // ===== 마일리지 주문 사용 = 실제 주문 (혜택내역 > 마일리지 내역에서 차감한 주문번호가 보이게) =====
  //   샘플 '주문 결제 시 사용'을 지우고, 회원의 주문(최근 1년, 전체취소 제외) 가운데 일부에서 그때 잔여 마일리지 안에서 사용한 것으로 다시 만듦
  //   주문의 결제 정보(order-data.js 할인금액 > 마일리지)는 이 사용 금액과 같게 맞춤 → 마일리지 내역과 주문 결제 내역이 일치
  //   잔여는 처음부터 다시 계산 (관리자 지급·차감 등 다른 기록은 그대로). 별도 난수라 다른 샘플 값은 그대로
  members.forEach(m => {
    if (!m.ledger) return;
    let s = (m.no * 15485863 + 11) % 233280;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const keep = m.ledger.mileage.filter(e => !(e.by === '시스템' && e.reason === '주문 결제 시 사용'));
    const slots = (m.orders || []).filter(o => o.orderNo && o.payStatus !== '전체취소').map(o => ({ slot: true, o, at: `${o.at} ${pad(9 + Math.floor(r() * 12))}:${pad(Math.floor(r() * 60))}`, pick: r() }));
    const seq = keep.map(e => Object.assign({}, e)).concat(slots).sort((a, b) => a.at.localeCompare(b.at));
    const list = [];
    seq.forEach(x => {
      const bal = list.length ? list[list.length - 1].balance : 0;
      if (!x.slot) { delete x.balance; pushEntry(list, x); return; }
      if (bal < 1000 || x.pick >= 0.45) return;   // 잔여 1,000P 이상인 주문의 절반가량에서 사용
      const use = Math.min(bal, Math.max(1000, Math.ceil(x.pick * 2 * Math.min(bal, x.o.amount * 0.3) / 100) * 100));
      pushEntry(list, { at: x.at, type: '사용', item: '', reason: '주문 결제 시 사용', by: '시스템', delta: -use, orderNo: x.o.orderNo });
    });
    m.ledger.mileage = list;
    m.mileage = list.length ? list[list.length - 1].balance : 0;
  });

  // ===== 단체회원 신청 =====
  // 기본 신청 데이터는 고정 생성, 관리자 처리 결과(승인/반려/히스토리)만 localStorage에 저장해 덮어씀
  // TODO: 실서비스에서는 GET /api/admin/group-applications, POST .../{no}/approve|reject 로 대체
  const APP_KEY = 'stopbook.groupApplications.v4';   // v3: 승인 시 회원 구분·종류 지정(assign*) 저장 / v4: 고객이 단체 유형 대신 회원구분(req*)을 신청, 이전 처리 결과는 초기화
  // 신청 건의 구분 참조
  //   reqCategoryCode / reqCategory / groupType: 고객이 신청한 회원구분(code·표시명)과 그 구분의 종류 (승인 대기·반려 목록에 표시)
  //   assignCategoryCode / assignCategory / assignKind: 관리자가 승인하며 지정한 회원구분·종류 (승인·해제·만료 목록에 표시)
  // 구분(또는 종류) 이름별 샘플 사업자 정보. 아래에 없는 이름은 이름으로 사업자 정보를 만듦
  const GROUP_TYPES = {
    '기관':     { names: ['가람시 평생학습관', '나래구 청소년수련관', '책마루도서관'], bizType: '공공행정', bizItem: '평생교육' },
    '회사':     { names: ['(주)새벽북스', '(주)온누리교육', '누리소프트(주)'], bizType: '도소매업', bizItem: '서적' },
    '학교':     { names: ['한빛초등학교', '새솔중학교', '다온고등학교'], bizType: '교육 서비스업', bizItem: '초중등 교육' },
    '유치원':   { names: ['햇살유치원', '꿈나무유치원'], bizType: '교육 서비스업', bizItem: '유아 교육' },
    '어린이집': { names: ['푸른숲어린이집', '새싹어린이집'], bizType: '보건업 및 사회복지 서비스업', bizItem: '보육시설 운영' },
    '단체':     { names: ['초록동아리협회', '한울 사진동호회'], bizType: '비영리', bizItem: '단체' },
    '동호회':   { names: ['책읽는엄마들 독서모임', '시냇가 북클럽'], bizType: '비영리', bizItem: '독서모임' },
    '협회':     { names: ['한국포토북협회', '전국독서문화협회'], bizType: '비영리', bizItem: '협회' },
    '기타':     { names: ['지혜샘학원', '글빛논술학원'], bizType: '교육 서비스업', bizItem: '교습학원' }
  };
  const ADDRESSES = ['서울특별시 마포구 월드컵북로 12', '경기도 성남시 분당구 판교로 45', '부산광역시 해운대구 센텀로 8', '대전광역시 유성구 대학로 99', '인천광역시 연수구 송도과학로 31'];
  // 고객이 신청할 수 있는 회원구분 = 기본 구분을 뺀 현재 구분 (없으면 '단체' 구분)
  const applyCats = otherCats.length ? otherCats : [groupCat];
  const groupKinds = groupCat.subs.length ? groupCat.subs : Object.keys(GROUP_TYPES);
  const bizOf = kind => GROUP_TYPES[kind] || { names: ['가람', '나래', '다온'].map(p => p + kind), bizType: '서비스업', bizItem: kind };

  function loadAppOverlay() {
    try { return JSON.parse(localStorage.getItem(APP_KEY)) || {}; } catch (e) { return {}; }
  }
  const appOverlay = loadAppOverlay();

  // 기본 구분 회원 중 일부가 신청한 것으로 생성 (최근 신청이 위)
  const applications = members.filter(m => m.categoryCode === mainCat.code).filter((_, i) => i % 8 === 3).map((m, k) => {
    // 고객이 신청한 회원구분·종류: 신청 가능한 구분을 번갈아, 종류가 있는 구분은 종류도 번갈아
    const reqCat = applyCats[k % applyCats.length];
    const groupType = subOf(reqCat, k);
    const t = bizOf(groupType || reqCat.name);
    const reqText = `${reqCat.name}${groupType ? ` > ${groupType}` : ''}`;
    const appliedAt = new Date(base - k * 2 * 86400000 - (k * 37 % 600) * 60000);
    const app = {
      appNo: 501 + k,
      memberNo: m.no,   // 신청 회원은 회원번호로 찾음 (탈퇴하면 아이디가 마스킹되어 다른 탈퇴 회원과 겹칠 수 있음)
      userId: m.userId,
      reqCategoryCode: reqCat.code,
      reqCategory: reqCat.name,
      groupType,
      appliedAt: fmtDateTime(appliedAt),
      business: {
        companyName: t.names[k % t.names.length],
        bizNo: `${String(105 + (k * 37) % 800)}-${String(10 + (k * 7) % 89)}-${String(10000 + (k * 4567) % 89999)}`,
        ceo: k % 2 ? m.name : LAST[(k + 3) % LAST.length] + FIRST[(k * 5) % FIRST.length],
        openDate: `20${String(10 + (k * 3) % 15)}-${pad(1 + k % 12)}-${pad(1 + (k * 5) % 28)}`,
        bizType: t.bizType,
        bizItem: t.bizItem,
        address: `${ADDRESSES[k % ADDRESSES.length]} ${k % 4 + 1}층`,
        managerName: m.name,
        managerPhone: m.phone,
        managerEmail: m.email,
        certFile: `사업자등록증_${m.userId}.${k % 3 ? 'jpg' : 'pdf'}`
      },
      // 예시: 일부는 이미 처리된 상태
      status: k % 5 === 4 ? '승인' : k % 7 === 6 ? '반려' : '대기',
      processedAt: '', processedBy: '', rejectReason: '', periodFrom: '', periodTo: '', expireTo: '',
      history: [{ at: fmtDateTime(appliedAt), content: `단체회원 신청 (회원구분: ${reqText})`, by: '고객' }]
    };
    if (app.status !== '대기') {
      const at = fmtDateTime(new Date(appliedAt.getTime() + 86400000));
      Object.assign(app, { processedAt: at, processedBy: '관리자' });
      if (app.status === '반려') app.rejectReason = '사업자등록증 이미지가 흐려 등록번호를 확인할 수 없습니다. 선명한 이미지로 다시 신청해 주세요.';
      if (app.status === '승인') {
        const d = new Date(appliedAt.getTime() + 86400000);
        app.periodFrom = fmtDate(d);
        // 예시: 한 건은 기간이 이미 끝나 자동 전환되는 경우를 보여주도록 어제 만료
        app.periodTo = k === 9 ? fmtDate(new Date(Date.now() - 86400000))
          : fmtDate(new Date(d.getFullYear() + 1, d.getMonth(), d.getDate() - 1));
        app.expireTo = mainCat.name;
        app.expireToCode = mainCat.code;
        // 승인 시 관리자가 지정한 회원 구분·종류 (샘플은 고객이 신청한 그대로 승인)
        Object.assign(app, { assignCategoryCode: reqCat.code, assignCategory: reqCat.name, assignKind: groupType });
      }
      app.history.push({ at, content: app.status === '승인' ? `승인 처리 (적용 기간 ${app.periodFrom} ~ ${app.periodTo}, 만료 후 '${app.expireTo}' 전환) → 회원 구분 '${reqText}' 지정` : `반려 처리 (사유: ${app.rejectReason})`, by: '관리자' });
    }
    return Object.assign(app, appOverlay[app.appNo] || {});
  });

  // 고객이 입력한 단체 유형(groupType)은 바꾸지 않으므로 저장 대상이 아님
  function saveApplication(app) {
    const keys = ['status', 'processedAt', 'processedBy', 'rejectReason', 'rejectDraft', 'periodFrom', 'periodTo', 'expireTo', 'expireToCode',
      'assignCategoryCode', 'assignCategory', 'assignKind', 'revokedAt', 'revokedBy', 'expiredAt', 'history'];
    appOverlay[app.appNo] = Object.fromEntries(keys.map(k => [k, app[k]]));
    try { localStorage.setItem(APP_KEY, JSON.stringify(appOverlay)); return true; } catch (e) { return false; }
  }

  // 신청한 회원 (회원번호 기준, 예전 데이터는 아이디)
  const appMember = app => members.find(x => (app.memberNo ? x.no === app.memberNo : x.userId === app.userId));
  // 적용 시작 전 승인 건: 시작일 전에는 회원 구분·사업자 정보를 바꾸지 않음 (시작일이 되면 화면을 열 때 반영)
  const notStarted = app => !!app.periodFrom && app.periodFrom > fmtDate(new Date());
  // 승인된 신청 → 관리자가 지정한 구분·종류로 회원 구분을 바꾸고 기본 정보 하단에 사업자 정보 추가
  //   적용 기간 시작 전이면 바꾸지 않음 (계약 전부터 단체 혜택이 적용되지 않게). 탈퇴 회원에게는 적용하지 않음
  function applyApproval(app) {
    const m = appMember(app);
    if (!m || m.withdrawn || notStarted(app)) return;
    m.categoryCode = app.assignCategoryCode || groupCat.code;
    m.category = app.assignCategory || groupCat.name;   // 표시명은 화면에서 code 기준으로 다시 맞춤
    m.subCategory = app.assignKind !== undefined ? app.assignKind : app.groupType;
    m.business = Object.assign({ reqCategory: app.reqCategory, groupType: app.groupType, approvedAt: app.processedAt, appNo: app.appNo,
      periodFrom: app.periodFrom, periodTo: app.periodTo, expireTo: app.expireTo || mainCat.name }, app.business);
    m.history.push({ at: app.processedAt, content: `단체 회원 승인: ${app.business.companyName} (${app.business.bizNo}), 적용 기간 ${app.periodFrom} ~ ${app.periodTo}`, by: app.processedBy });
  }
  // 회원 정보에서 구분을 단체 → 일반으로 바꾼 경우: 사업자 정보 삭제 + 신청 건을 '해제'로 기록
  function revokeBusiness(m, by) {
    const app = m.business && applications.find(a => a.appNo === m.business.appNo);
    delete m.business;
    if (!app) return;
    const at = fmtDateTime(new Date());
    Object.assign(app, { status: '해제', revokedAt: at, revokedBy: by });
    app.history.push({ at, content: '단체 회원 해제 (회원 정보에서 구분 일반으로 변경, 사업자 정보 삭제)', by });
    saveApplication(app);
  }

  // 적용 기간 만료: 종료일이 지난 승인 건은 '만료'로 바꾸고 지정한 구분으로 자동 전환
  // TODO: 실서비스에서는 매일 00:00 서버 배치로 처리 (여기서는 화면을 열 때 처리)
  const todayStr = fmtDate(new Date());
  applications.forEach(a => {
    if (a.status !== '승인' || !a.periodTo || a.periodTo >= todayStr) return;
    const end = new Date(a.periodTo);
    a.expiredAt = `${fmtDate(new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1))} 00:00`;
    a.status = '만료';
    a.history.push({ at: a.expiredAt, content: `적용 기간 만료 → 구분 '${a.expireTo || mainCat.name}' 자동 전환, 사업자 정보 삭제`, by: '시스템' });
    saveApplication(a);
  });

  // 페이지 로드 시 처리 결과 반영: 승인 → 사업자 정보 등록 / 해제·만료 → 승인 후 삭제된 이력만 남김
  applications.forEach(a => {
    if (!['승인', '해제', '만료'].includes(a.status)) return;
    applyApproval(a);
    const m = appMember(a);
    if (!m || a.status === '승인' || notStarted(a)) return;
    const biz = `${a.business.companyName} (${a.business.bizNo})`;
    m.subCategory = '';
    if (a.status === '해제') {
      m.category = mainCat.name;
      m.categoryCode = mainCat.code;
      m.history.push({ at: a.revokedAt, content: `사업자 정보 삭제: ${biz} - 구분 ${mainCat.name} 변경`, by: a.revokedBy });
    } else {
      const to = a.expireTo || mainCat.name;
      m.history.push({ at: a.expiredAt, content: `단체 회원 기간 만료: 구분 ${m.category} → ${to} 자동 전환, 사업자 정보 삭제 (${biz})`, by: '시스템' });
      m.category = to;
      m.categoryCode = a.expireToCode || '';   // 없으면 화면에서 이름으로 찾아 채움
    }
    delete m.business;
  });

  // 후불 결제 회원 사업자 정보 샘플: 단체회원 신청 승인 내역이 없는 후불 결제 회원에게 사업자 정보를 채움
  // (후결제 입금관리 모달·회원 상세의 사업자 정보에 표시. 항목은 단체회원 신청 시 입력하는 정보와 같음)
  // TODO: 실서비스에서는 단체회원 승인 시 등록된 사업자 정보 사용
  members.filter(m => m.postpay === 'Y' && !m.business).forEach(m => {
    const kind = m.subCategory || m.category;
    const t = bizOf(kind), k = m.no;
    m.business = {
      reqCategory: m.category, groupType: m.subCategory, approvedAt: `${m.postpayFrom} 10:00`, appNo: '-',
      periodFrom: m.postpayFrom, periodTo: m.postpayTo, expireTo: mainCat.name,
      companyName: t.names[k % t.names.length],
      bizNo: `${String(105 + (k * 37) % 800)}-${String(10 + (k * 7) % 89)}-${String(10000 + (k * 4567) % 89999)}`,
      ceo: m.name,
      openDate: `20${String(10 + (k * 3) % 15)}-${pad(1 + k % 12)}-${pad(1 + (k * 5) % 28)}`,
      bizType: t.bizType, bizItem: t.bizItem,
      address: `${ADDRESSES[k % ADDRESSES.length]} ${k % 4 + 1}층`,
      managerName: m.name, managerPhone: m.phone, managerEmail: m.email,
      certFile: `사업자등록증_${m.userId}.pdf`
    };
  });

  // ===== 쇼핑몰 회원가입 (user/signup.html) =====
  // 회원가입 화면에서 가입한 회원을 localStorage에 보관하고, 샘플 회원 뒤에 이어 붙여 관리자 화면(회원 목록·대시보드·마일리지 내역)에 함께 보이게 함
  //   신규 가입은 이메일로 로그인하므로 아이디(userId) = 이메일. 구분은 기본 구분(일반), 등급은 '일반', 주문·문의·장바구니는 없음
  //   가입 혜택(회원가입 적립 마일리지·신규가입 쿠폰)은 가입 기록의 ledger에 담아 두고 여기서 원장으로 만듦
  //   저장 형식: [{ no, memberType, userId, name, email, phone, birth, nickname, gender, grade, marketingUse, marketingSms, marketingEmail,
  //               consents: { at, items: [{ key, label, required, agreed }] }, joinDate, lastLogin, joinEnv, loginEnv, ledger: { mileage: [], coupon: [] }, history: [] }]
  // TODO: 실서비스에서는 POST /api/members (가입), GET /api/members/exists?email=&phone= (중복 확인)
  const SIGNUP_KEY = 'stopbook.signupMembers.v1';
  const loadSignups = () => { try { const v = JSON.parse(localStorage.getItem(SIGNUP_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const digits = s => String(s || '').replace(/\D/g, '');
  function attachSignup(rec) {
    const m = JSON.parse(JSON.stringify(rec));
    Object.assign(m, { fromSignup: true, categoryCode: mainCat.code, category: mainCat.name, subCategory: '', postpay: 'N', postpayFrom: '', postpayTo: '',
      memos: m.memos || [], orders: [], inquiries: [], cart: [] });
    const src = m.ledger || {};
    m.ledger = { mileage: [], giftCard: [], coupon: [] };
    ['mileage', 'coupon'].forEach(k => (src[k] || []).forEach(e => { delete e.balance; pushEntry(m.ledger[k], e); }));
    (MILEAGE[m.no] || []).forEach(e => pushEntry(m.ledger.mileage, Object.assign({}, e)));   // 관리자 지급·차감 기록
    Object.keys(m.ledger).forEach(k => { const list = m.ledger[k]; m[k] = list.length ? list[list.length - 1].balance : 0; });
    members.push(m);
    return m;
  }
  loadSignups().forEach(attachSignup);

  // ===== 회원 로그인 (user 로그인 화면 ↔ 관리자 회원 상세의 패스워드 초기화·변경) =====
  // 비밀번호 정보와 최근 접속 기록을 localStorage에 보관해 쇼핑몰 로그인과 관리자 화면이 같은 정보를 봄
  //   AUTH_KEY:  { [회원 no]: { hash, changedAt, temp, fail, lockedUntil, snoozeUntil, log: [{ at, content, by }] } }
  //     hash = 해시(회원 no + 비밀번호) · changedAt = 비밀번호 변경 일시(YYYY-MM-DD HH:mm, 예전 기록은 YYYY-MM-DD)
  //     temp = 관리자가 발급한 임시 비밀번호 (다음 로그인 때 변경 필수) · fail/lockedUntil = 연속 실패 횟수/잠금 해제 시각
  //     snoozeUntil = 90일 변경 안내에서 '다음에 변경'을 고른 경우 다시 안내할 날짜 · log = 회원 히스토리에 붙는 기록
  //   LOGIN_KEY: { [회원 no]: { lastLogin, loginEnv } } — 회원 목록·상세의 최근접속일·접속 기기
  //   샘플 회원(스탑북회원)은 저장된 비밀번호가 없으면 SAMPLE_PASSWORD로 로그인 (변경일 = 가입일)
  //   간편 로그인(카카오·네이버·구글) 회원은 비밀번호가 없음
  // TODO: 실서비스에서는 POST /api/auth/login 등 서버에서 검증 (비밀번호는 서버에만 bcrypt 등으로 저장)
  const AUTH_KEY = 'stopbook.memberAuth.v1', LOGIN_KEY = 'stopbook.memberLogins.v1';
  const SAMPLE_PASSWORD = 'stopbook1!';
  const PW_EXPIRE_DAYS = 90, PW_SNOOZE_DAYS = 30, LOCK_FAILS = 5, LOCK_MINUTES = 10;   // 요구사항 PRD_MEM_006: 90일 미변경 시 변경 유도
  const readJson = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; } };
  const writeJson = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const AUTH = readJson(AUTH_KEY), LOGINS = readJson(LOGIN_KEY);
  const cyrb53 = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  };
  const pwHash = (no, pw) => cyrb53(`${no}:${pw}`).toString(36);
  const STOPBOOK_TYPE = (() => {
    try { const g = MemberTypeStore.load().find(x => x.key === 'memberType'); const it = g && g.items.find(x => x.code === 'stopbook'); return it ? it.name : '스탑북회원'; }
    catch (e) { return '스탑북회원'; }
  })();
  const hasPassword = m => m.memberType === '스탑북회원' || m.memberType === STOPBOOK_TYPE;
  // 저장된 접속 기록·인증 기록을 회원 데이터에 반영
  members.forEach(m => {
    if (LOGINS[m.no]) Object.assign(m, LOGINS[m.no]);
    ((AUTH[m.no] || {}).log || []).forEach(h => m.history.push(Object.assign({}, h)));
  });
  // 저장된 비밀번호가 없을 때: 샘플 회원만 SAMPLE_PASSWORD 사용
  //   쇼핑몰에서 가입한 회원(fromSignup)은 샘플 비밀번호를 쓰지 않음 → '패스워드 미설정' (로그인 기능 추가 전에 가입해 비밀번호가 저장되지 않은 경우)
  //   관리자 회원 상세에서 패스워드 초기화(임시 패스워드 발급)로 복구
  //   매번 저장소를 다시 읽음: 다른 탭(마이페이지·관리자 화면)에서 바꾼 비밀번호를 예전 값으로 되돌리지 않게
  const authOf = m => {
    const fresh = readJson(AUTH_KEY)[m.no];
    if (fresh) AUTH[m.no] = fresh; else delete AUTH[m.no];
    return authOfMem(m);
  };
  const authOfMem = m => AUTH[m.no] || (hasPassword(m) && !m.fromSignup ? { hash: pwHash(m.no, SAMPLE_PASSWORD), changedAt: (m.history[0] && m.history[0].at) || ` 00:00`, temp: false, fail: 0, lockedUntil: '', snoozeUntil: '', sample: true } : null);
  // 저장 직전에 저장소를 다시 읽어 이 회원 값만 바꿈 (다른 탭에서 지운 탈퇴 회원의 비밀번호 기록이 되살아나지 않게)
  const saveAuth = (m, a) => {
    delete a.sample; AUTH[m.no] = a;
    if (m.withdrawn || readJson(WITHDRAW_STORE_KEY)[m.no]) return false;
    const fresh = readJson(AUTH_KEY); fresh[m.no] = a;
    return writeJson(AUTH_KEY, fresh);
  };
  const WITHDRAW_STORE_KEY = 'stopbook.memberWithdrawals.v1';   // 회원 탈퇴 기록 (아래 WITHDRAW_KEY와 같은 키)
  const authLog = (m, a, content, by) => { const h = { at: fmtDateTime(new Date()), content, by }; (a.log || (a.log = [])).push(h); m.history.push(h); };
  const daysBetween = (from, to) => Math.floor((new Date(to) - new Date(from)) / 86400000);
  const parseAt = s => new Date(String(s).replace(' ', 'T'));

  // 아이디(기존 회원) 또는 이메일로 회원 찾기 (대소문자 무시). 탈퇴 회원은 로그인 불가
  function findLoginMember(id) {
    const v = String(id || '').trim().toLowerCase();
    if (!v) return null;
    const live = members.filter(m => !m.withdrawn);
    return live.find(m => String(m.userId).toLowerCase() === v) || live.find(m => String(m.email).toLowerCase() === v) || null;
  }

  // 비밀번호 틀림: 연속 실패 횟수 증가, 5회면 10분 잠금 (로그인·마이페이지 비밀번호 확인이 같은 횟수를 셈)
  function failAttempt(m, a, now, what) {
    a.fail = (a.fail || 0) + 1;
    if (a.fail >= LOCK_FAILS) {
      a.lockedUntil = fmtDateTime(new Date(now.getTime() + LOCK_MINUTES * 60000));
      a.fail = 0;
      authLog(m, a, `${what} ${LOCK_FAILS}회 연속 실패로 ${LOCK_MINUTES}분간 로그인 제한`, '시스템');
      saveAuth(m, a);
      return { error: 'locked', until: a.lockedUntil };
    }
    saveAuth(m, a);
    return { error: 'mismatch', fails: a.fail, remain: LOCK_FAILS - a.fail };
  }

  // 로그인. 반환: { member, change: 'temp'|'expired'|'' } 또는 { error: 'mismatch'|'locked', fails, until }
  //   없는 계정·간편 로그인 계정·비밀번호 틀림은 모두 'mismatch' (가입 여부가 드러나지 않게)
  //   비밀번호 5회 연속 실패 시 10분 잠금 (관리자 회원 상세에서 잠금 해제 가능)
  function login(id, pw, env) {
    const m = findLoginMember(id), a = m && authOf(m);
    if (!m || !a) return { error: 'mismatch' };
    const now = new Date();
    if (a.lockedUntil) {
      if (parseAt(a.lockedUntil) > now) return { error: 'locked', until: a.lockedUntil };
      a.lockedUntil = ''; a.fail = 0;
    }
    if (a.hash !== pwHash(m.no, pw)) return failAttempt(m, a, now, '로그인');
    a.fail = 0;
    const today = fmtDate(now);
    const expired = daysBetween(String(a.changedAt).slice(0, 10), today) >= PW_EXPIRE_DAYS && !(a.snoozeUntil && a.snoozeUntil > today);
    if (!a.sample) saveAuth(m, a);
    recordLogin(m.no, env);
    return { member: m, change: a.temp ? 'temp' : expired ? 'expired' : '', changedAt: a.changedAt };
  }

  // 최근 접속일·접속 기기 기록 (간편 로그인도 사용)
  function recordLogin(no, env) {
    const m = members.find(x => x.no === no);
    if (!m || m.withdrawn) return false;
    m.lastLogin = fmtDate(new Date());
    if (env) m.loginEnv = env;
    LOGINS[no] = { lastLogin: m.lastLogin, loginEnv: m.loginEnv };
    const fresh = readJson(LOGIN_KEY); fresh[no] = LOGINS[no];
    return writeJson(LOGIN_KEY, fresh);
  }

  // 비밀번호 설정. opts = { temp, by, log(기본 true), content }
  //   회원가입(log: false) · 회원 비밀번호 변경 · 관리자 패스워드 변경/초기화(temp: true)에서 사용
  function setPassword(no, pw, opts = {}) {
    const m = members.find(x => x.no === no);
    if (!m || !hasPassword(m)) return false;
    const a = Object.assign({}, authOf(m) || {}, { hash: pwHash(no, pw), changedAt: fmtDateTime(new Date()), temp: !!opts.temp, fail: 0, lockedUntil: '', snoozeUntil: '' });
    if (opts.log !== false) authLog(m, a, opts.content || (opts.temp ? '패스워드 초기화 (임시 패스워드 발급)' : '패스워드 변경'), opts.by || '관리자');
    return saveAuth(m, a);
  }
  const isSamePassword = (no, pw) => { const m = members.find(x => x.no === no), a = m && authOf(m); return !!a && a.hash === pwHash(no, pw); };
  // 로그인한 회원의 비밀번호 재확인 (마이페이지 > 회원정보 수정 진입, 요구사항 PRD_MEM_009)
  //   반환: { ok: true } 또는 { error: 'mismatch'|'locked'|'unset', fails, until }. 틀린 횟수는 로그인과 함께 셈
  function verifyPassword(no, pw) {
    const m = members.find(x => x.no === no), a = m && authOf(m);
    if (!a) return { error: 'unset' };
    const now = new Date();
    if (a.lockedUntil) {
      if (parseAt(a.lockedUntil) > now) return { error: 'locked', until: a.lockedUntil };
      a.lockedUntil = ''; a.fail = 0;
    }
    if (a.hash !== pwHash(no, pw)) return failAttempt(m, a, now, '비밀번호 확인');
    a.fail = 0;
    if (!a.sample) saveAuth(m, a);
    return { ok: true };
  }
  // 90일 변경 안내에서 '다음에 변경': 30일 뒤 다시 안내
  function snoozePassword(no) {
    const m = members.find(x => x.no === no), a = m && authOf(m);
    if (!a) return false;
    const d = new Date(); d.setDate(d.getDate() + PW_SNOOZE_DAYS);
    a.snoozeUntil = fmtDate(d);
    authLog(m, a, `패스워드 변경 안내: 다음에 변경 (${a.snoozeUntil}에 다시 안내)`, '회원');
    return saveAuth(m, a);
  }
  // 관리자: 로그인 제한 해제
  function unlockLogin(no, by) {
    const m = members.find(x => x.no === no), a = m && authOf(m);
    if (!a) return false;
    a.fail = 0; a.lockedUntil = '';
    authLog(m, a, '로그인 제한 해제', by || '관리자');
    return saveAuth(m, a);
  }
  // 관리자 회원 상세 표시용
  function authInfo(no) {
    const m = members.find(x => x.no === no), a = m && authOf(m);
    if (!a) return m && hasPassword(m) ? { unset: true } : null;
    const locked = !!a.lockedUntil && parseAt(a.lockedUntil) > new Date();
    // 변경 일시: 예전 기록(날짜만)은 같은 날 패스워드 변경 기록의 시각으로 보완
    let changedAt = String(a.changedAt || '');
    if (changedAt.length === 10) {
      const h = (a.log || []).filter(x => /패스워드/.test(x.content) && x.at.startsWith(changedAt)).pop();
      changedAt = h ? h.at : `${changedAt} 00:00`;
    }
    return { changedAt, temp: !!a.temp, locked, lockedUntil: locked ? a.lockedUntil : '', fail: a.fail || 0, sample: !!a.sample,
      expired: daysBetween(String(a.changedAt).slice(0, 10), fmtDate(new Date())) >= PW_EXPIRE_DAYS };
  }
  const Auth = { SAMPLE_PASSWORD, PW_EXPIRE_DAYS, PW_SNOOZE_DAYS, LOCK_FAILS, LOCK_MINUTES, hasPassword, findLoginMember, login, recordLogin, setPassword, isSamePassword, verifyPassword, snoozePassword, unlockLogin, authInfo };

  // 가입 중복 확인: 이메일(대소문자 무시) 또는 휴대폰 번호(숫자만 비교)가 같은 회원. 반환: { field: 'email'|'phone', member } 또는 null
  //   기존 다계정 보유자도 휴대폰 번호가 같으면 추가 가입 불가 (요구사항 PRD_MEM_001)
  //   exceptNo: 회원정보 수정에서 본인은 빼고 확인
  //   탈퇴 회원은 개인정보가 파기되어 비교 대상이 아님 (재가입 제한 기간은 rejoinBlock으로 따로 확인)
  function findDuplicate({ email, phone }, exceptNo) {
    const e = String(email || '').trim().toLowerCase(), p = digits(phone);
    const others = members.filter(m => m.no !== exceptNo && !m.withdrawn);
    const byPhone = p && others.find(m => digits(m.phone) === p);
    if (byPhone) return { field: 'phone', member: byPhone };
    const byEmail = e && others.find(m => String(m.email).toLowerCase() === e);
    return byEmail ? { field: 'email', member: byEmail } : null;
  }

  // 간편 로그인(카카오·네이버·구글) 회원 찾기: 가입 때 저장한 SNS 계정 식별값(snsKey)으로 찾음
  //   회원이 가입 화면·마이페이지에서 이메일을 바꿔도 같은 SNS 계정이면 같은 회원으로 로그인
  //   식별값이 없는 예전 회원(샘플 등)은 같은 이메일·같은 가입유형으로 찾음. 탈퇴 회원은 제외
  // TODO: 실서비스에서는 OAuth 응답의 SNS 고유 식별값(sub·id)으로 회원을 찾음
  const snsKey = (code, email) => `${code}:${String(email || '').trim().toLowerCase()}`;
  // 가입유형 이름 → SNS 코드 (kakao·naver·google, 회원 유형 관리 > 가입유형)
  const snsCodeOf = m => {
    try { const g = MemberTypeStore.load().find(x => x.key === 'memberType'); const it = g && g.items.find(x => x.name === m.memberType); return it && it.code !== 'stopbook' ? it.code : ''; }
    catch (e) { return ''; }
  };
  function findSnsMember(code, email, typeName) {
    const key = snsKey(code, email), live = members.filter(m => !m.withdrawn);
    return live.find(m => m.snsKey === key)
      || live.find(m => !m.snsKey && m.memberType === typeName && String(m.email).toLowerCase() === String(email).trim().toLowerCase()) || null;
  }

  // ===== 회원정보 수정 (user/mypage.html, 요구사항 PRD_MEM_009) =====
  // 회원이 마이페이지에서 고친 정보를 localStorage에 보관하고 페이지를 열 때 회원 데이터에 덮어씀
  //   → 관리자 통합 회원 관리(목록·상세·변경 히스토리)에도 같은 값이 보임 (샘플 회원·가입 회원 공통)
  //   PROFILE_KEY: { [회원 no]: { fields: { name, email, userId, phone, ... }, log: [{ at, content, by }] } }
  // TODO: 실서비스에서는 PUT /api/members/me (이메일·휴대폰 번호는 서버에서 본인 인증 토큰 확인 후 변경)
  const PROFILE_KEY = 'stopbook.memberProfile.v1';
  const PROFILE_FIELDS = ['name', 'email', 'userId', 'phone', 'birth', 'nickname', 'gender', 'zipcode', 'address1', 'address2', 'interests', 'interestEtc', 'marketingUse', 'marketingSms', 'marketingEmail', 'snsKey'];
  const PROFILES = readJson(PROFILE_KEY);
  members.forEach(m => {
    const p = PROFILES[m.no];
    if (!p) return;
    Object.assign(m, p.fields);
    (p.log || []).forEach(h => m.history.push(Object.assign({}, h)));
  });
  // fields: 바뀐 값만, contents: 히스토리 문구 목록. 반환: { member } 또는 { error }
  //   다른 탭(창)에서 바뀐 저장값을 덮어쓰지 않도록 저장 직전에 저장소를 다시 읽어 이 회원 값만 바꿔 저장
  //   탈퇴한 회원(다른 탭에서 탈퇴한 경우 포함)은 수정 불가 → 파기한 개인정보가 다시 저장되지 않게 함
  function updateProfile(no, fields, contents, by) {
    const m = members.find(x => x.no === no);
    if (!m || m.withdrawn || isWithdrawnStored(no)) return { error: '회원 정보를 찾을 수 없습니다.', withdrawn: !!m };
    const dup = (fields.email || fields.phone) && findDuplicate({ email: fields.email, phone: fields.phone }, no);
    if (dup) return { error: dup.field === 'phone' ? '이미 가입된 휴대폰 번호입니다.' : '이미 사용 중인 이메일입니다.' };
    const store = readJson(PROFILE_KEY);
    const p = store[no] || PROFILES[no] || { fields: {}, log: [] };
    const at = fmtDateTime(new Date());
    const logs = (contents || []).map(content => ({ at, content, by: by || '회원' }));
    const next = {};
    PROFILE_FIELDS.forEach(k => { if (k in fields) next[k] = fields[k]; });
    // 간편 로그인 회원이 이메일을 바꾸면: SNS 계정 식별값을 바꾸기 전 이메일로 남겨 다음 SNS 로그인 때 같은 회원으로 찾게 함
    if ('email' in next && !m.snsKey && !hasPassword(m)) {
      const code = snsCodeOf(m);
      if (code) next.snsKey = snsKey(code, m.email);
    }
    p.fields = Object.assign({}, p.fields, next);
    p.log = (p.log || []).concat(logs);
    store[no] = p; PROFILES[no] = p;
    if (!writeJson(PROFILE_KEY, store)) return { error: '회원 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' };
    Object.assign(m, next);
    logs.forEach(h => m.history.push(h));
    return { member: m };
  }

  // ===== 회원 탈퇴 (user/mypage.html#withdraw, 요구사항 PRD_MEM_010) =====
  // 탈퇴 신청 즉시 개인정보를 파기하고, 회원 목록에는 남겨 두되 상태값만 '탈퇴'로 바꿈
  //   (회원번호·가입일·가입유형·회원구분·회원등급(탈퇴 시점)은 유지 → 관리자 통합 회원 관리에서 '탈퇴' 상태로 조회)
  //
  // [정보 폐기 기준]
  //   즉시 파기       이름·이메일·휴대폰·생년월일·성별·닉네임·주소·관심분야, 비밀번호·로그인 기록·접속 기기,
  //                   마케팅 수신 동의(철회 처리), 장바구니·작업물, 보유 혜택(마일리지·쿠폰·상품권 소멸),
  //                   정보 변경 히스토리 중 개인정보 변경 전·후 값, 사업자 정보의 담당자 연락처
  //   법정 보관       주문·결제·배송 기록 5년, 소비자 불만·분쟁 처리(문의) 기록 3년 — 전자상거래법 제6조
  //                   → 분리 보관하고 관리자 일반 화면에서는 개인정보 부분을 '열람 제한'으로 가림 (거래 내역·금액·상태는 표시)
  //   식별 불가 보관  탈퇴 기록(탈퇴 회원 관리의 통계용 스냅샷), 마스킹한 아이디·이메일,
  //                   재가입 제한 확인용 이메일·휴대폰 해시(원본 복원 불가, 재가입 제한 기간이 지나면 의미 없음)
  //
  // [삭제된 정보 표기 기준] 관리자·쇼핑몰 모든 화면 공통 → WITHDRAWN_LABEL 사용
  //   이름(주문자·수취인·예금주·담당자 포함) → '탈퇴회원'
  //   아이디·이메일 → 앞 2자만 남긴 마스킹 (예: us***, ab***@naver.com)
  //   파기한 항목(휴대폰·생일·주소 등) → '파기됨'
  //   법정 보관 중이라 가린 항목(주문 연락처·배송지·증빙 정보 등) → '열람 제한'
  //
  // 저장 형식 WITHDRAW_KEY: { [회원 no]: { at, withdrawDate, typeCode, reasonType, reasonCodes, reasonEtc, channel, processedBy, processNote,
  //   userIdMasked, emailMasked, emailHash, phoneHash, rejoinUntil, snapshot: {탈퇴 회원 관리 목록 항목} } }
  // TODO: 실서비스에서는 POST /api/members/me/withdraw — 서버가 개인정보 컬럼을 삭제(NULL)하고 법정 보관 데이터는 별도 저장소로 분리 이관
  const WITHDRAW_KEY = WITHDRAW_STORE_KEY;
  const WITHDRAWN_LABEL = { name: '탈퇴회원', purged: '파기됨', restricted: '열람 제한', status: '탈퇴' };
  const WITHDRAWALS = readJson(WITHDRAW_KEY);
  // 탈퇴 불가: 출고 전 주문(입금대기·주문완료·제작중)과 결제가 끝나지 않은 주문(후결제 미정산 포함) → 취소하거나 배송이 시작된 뒤 탈퇴
  const WD_BLOCK_STATUS = ['주문대기', '주문완료', '제작중'];
  const WD_BLOCK_PAY = ['입금대기', '후결제대기', '부분결제'];
  // 마스킹: 앞 2자(2자 이하면 1자)만 남김. 이메일은 도메인 유지 (탈퇴 회원 관리 withdrawn.html과 같은 규칙)
  const maskLocal = s => { const keep = s.length > 2 ? 2 : 1; return `${s.slice(0, keep)}${'*'.repeat(Math.max(3, s.length - keep))}`; };
  const maskEmail = email => { const [l, d] = String(email || '').split('@'); return d ? `${maskLocal(l)}@${d}` : ''; };
  const maskUserId = id => (String(id).includes('@') ? maskEmail(id) : maskLocal(String(id || '')));
  // 검색·재가입 확인용 해시 (withdrawn.html hashEmail과 같은 값). TODO: 실서비스에서는 서버 비밀 키를 쓰는 HMAC-SHA256
  const hashOf = s => cyrb53(String(s).trim().toLowerCase()).toString(36);
  const daysAfter = (d, n) => fmtDate(new Date(new Date(d).getFullYear(), new Date(d).getMonth(), new Date(d).getDate() + n));
  // 히스토리 중 개인정보 값이 들어 있는 기록 → 내용만 파기 표시 (변경 사실과 일시는 남김)
  const PERSONAL_LOG = /^(이름|생년월일|이메일|휴대폰 번호|닉네임|성별|주소|관심분야|로그인 아이디) 변경/;

  // 탈퇴구분 (회원 유형 관리 > 탈퇴회원). code 기본값 = 자진탈퇴
  const withdrawType = (code = 'voluntary') => {
    const WS = window.MemberTypeStore && MemberTypeStore.WithdrawStore;
    const data = WS ? WS.load() : null;
    const type = data && WS.typeByCode(data, code);
    if (!type && code !== 'voluntary') return { data, type: null };
    return { data, type: type || { code: 'voluntary', name: '자진탈퇴', cond: { reasonMode: 'optional', multi: true, rejoinDays: 0 } } };
  };

  // 저장소 기준 탈퇴 여부 (다른 탭에서 탈퇴한 경우도 확인)
  function isWithdrawnStored(no) { return !!readJson(WITHDRAW_KEY)[no]; }

  // 주문의 현재 결제·진행 상태: 관리자 처리(order-data.js의 주문취소·입금 내역)를 반영
  //   마이페이지는 주문 데이터(order-data.js)를 불러오지 않으므로 같은 저장값을 직접 읽어 판단
  //   - 관리자가 모든 상품을 취소한 주문 → 전체취소 (탈퇴를 막지 않음)
  //   - 입금 내역이 결제금액 이상인 주문 → 결제완료 (무통장입금은 주문 접수 → 주문완료)
  // TODO: 실서비스에서는 서버가 주문의 현재 상태로 판단 (GET /api/members/me/withdraw-check)
  const CANCEL_STORE = 'stopbook.orderCancels.v1', DEPOSIT_STORE = 'stopbook.orderDeposits.v2';
  function effectiveOrders(m) {
    const cancels = readJson(CANCEL_STORE), deposits = readJson(DEPOSIT_STORE);
    return validOrders(m).map(o => {
      const kinds = 1 + Number((String(o.title || '').match(/외 (\d+)종/) || [0, 0])[1]);
      const canceled = Object.keys(((cancels[o.orderNo] || {}).items) || {}).length;
      if (canceled >= kinds) return Object.assign({}, o, { payStatus: '전체취소', status: '' });
      const paid = (((deposits[o.orderNo] || {}).payments) || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      if (paid && WD_BLOCK_PAY.includes(o.payStatus)) {
        const full = o.payStatus === '입금대기' || paid >= (o.amount || 0);
        return Object.assign({}, o, { payStatus: full ? '결제완료' : '부분결제', status: o.status === '주문대기' && full ? '주문완료' : o.status });
      }
      return o;
    }).filter(o => o.payStatus !== '전체취소');
  }

  // 탈퇴 전 확인: 막는 주문 / 안내할 항목. 마이페이지 탈퇴 화면과 withdraw()가 같은 기준을 씀
  function withdrawCheck(m) {
    const orders = effectiveOrders(m);
    const blocking = orders.filter(o => WD_BLOCK_STATUS.includes(o.status) || WD_BLOCK_PAY.includes(o.payStatus));
    const shipping = orders.filter(o => /^배송중/.test(o.status || '') && !blocking.includes(o));
    const coupons = heldCoupons((m.ledger || {}).coupon || []).reduce((s, [, n]) => s + n, 0);
    return {
      blocking, shipping,
      waitingInquiries: (m.inquiries || []).filter(q => q.status === '답변대기'),
      cart: m.cart || [],
      mileage: m.mileage || 0, giftCard: m.giftCard || 0, coupons
    };
  }

  // 탈퇴 상태 적용 (탈퇴 처리 직후 + 페이지를 열 때마다 저장된 탈퇴 기록으로 다시 적용)
  //   샘플 회원은 화면을 열 때마다 원래 값으로 다시 만들어지므로 매번 덮어써서 개인정보가 보이지 않게 함
  //   fromStore: 페이지를 열 때 저장된 기록으로 적용 (탈퇴 때 지운 회원정보 수정·비밀번호 기록은 rec.history의 파기 표시 사본으로 다시 붙임)
  function applyWithdrawal(m, rec, fromStore) {
    if (m.withdrawn) return;
    const oldName = m.name, oldId = m.userId;
    const L = WITHDRAWN_LABEL;
    const snap = rec.snapshot || {};
    if (snap.grade) m.grade = snap.grade;   // 탈퇴 시점 등급 유지 (등급 자동 산정 대상에서 빠지므로 저장된 값으로)
    // 보유 혜택 소멸: 내역에 소멸 기록을 남기고 보유량 0
    const at = rec.at;
    if (m.ledger) {
      if (m.mileage > 0) pushEntry(m.ledger.mileage, { at, type: '소멸', item: '', reason: '회원 탈퇴로 소멸', by: '시스템', delta: -m.mileage, source: 'system' });
      if (m.giftCard > 0) pushEntry(m.ledger.giftCard, { at, type: '소멸', item: '', reason: '회원 탈퇴로 소멸', by: '시스템', delta: -m.giftCard });
      heldCoupons(m.ledger.coupon || []).forEach(([item, n]) => pushEntry(m.ledger.coupon, { at, type: '소멸', item, reason: '회원 탈퇴로 소멸', by: '시스템', delta: -n }));
    }
    Object.assign(m, {
      withdrawn: true, status: L.status, withdrawnAt: rec.at, withdrawDate: rec.withdrawDate, withdrawType: rec.reasonType,
      withdrawReasons: rec.reasonLabels || [], withdrawEtc: rec.reasonEtc || '', rejoinUntil: rec.rejoinUntil || '',
      name: L.name, userId: rec.userIdMasked, email: rec.emailMasked, phone: L.purged,
      birth: '', nickname: '', gender: '', zipcode: '', address1: '', address2: '', interests: [], interestEtc: '',
      marketingUse: 'N', marketingSms: 'N', marketingEmail: 'N', loginEnv: '', lastLogin: '', snsKey: '',
      mileage: 0, giftCard: 0, coupon: 0, cart: [], postpay: 'N', postpayFrom: '', postpayTo: ''
    });
    // 문의(법정 보관): 답변 본문의 고객 이름도 가림 (관리자 처리 전 원래 답변 사본 q.sample 포함)
    const hideName = s => (s && oldName ? String(s).split(oldName).join(L.name) : s);
    (m.inquiries || []).forEach(q => {
      q.answer = hideName(q.answer);
      if (q.sample) q.sample.answer = hideName(q.sample.answer);
    });
    // 사업자 정보: 회사 정보는 거래 증빙이라 남기고 대표자·담당자 개인정보와 아이디가 들어간 파일명만 가림
    const hideBiz = b => Object.assign(b, { ceo: L.name, managerName: L.name, managerPhone: L.restricted, managerEmail: L.restricted,
      certFile: b.certFile ? String(b.certFile).split(oldId).join(rec.userIdMasked) : b.certFile });
    if (m.business) hideBiz(m.business);
    applications.filter(a => (a.memberNo ? a.memberNo === m.no : a.userId === oldId)).forEach(a => {
      a.userId = rec.userIdMasked;
      if (a.business) hideBiz(a.business);
      // 승인 대기 중인 단체 신청은 탈퇴와 함께 자동 취소 (탈퇴 회원에게 승인되지 않게)
      if (a.status === '대기') {
        Object.assign(a, { status: '취소', processedAt: rec.at, processedBy: '시스템' });
        a.history.push({ at: rec.at, content: '회원 탈퇴로 신청 자동 취소', by: '시스템' });
        saveApplication(a);
      }
    });
    // 히스토리: 개인정보 변경 기록은 값만 파기
    m.history.forEach(h => { h.content = scrubLog(h.content); });
    if (fromStore) (rec.history || []).forEach(h => m.history.push(Object.assign({}, h)));
    (rec.log || []).forEach(h => m.history.push(Object.assign({}, h)));
  }
  const scrubLog = c => (PERSONAL_LOG.test(c) ? `${c.match(PERSONAL_LOG)[1]} 변경 (탈퇴로 변경 내용 파기)` : c);
  members.forEach(m => { if (WITHDRAWALS[m.no]) applyWithdrawal(m, WITHDRAWALS[m.no], true); });

  // ===== 다른 화면이 따로 저장해 둔 개인정보 사본 파기 =====
  // 주문 관리정보·입금 메모·취소 환불(예금주)·클레임·서류 신청·1:1 문의 답변·메시지 발송 기록 등은 각 화면이 localStorage에 따로 저장함
  // 탈퇴 시 이 회원의 기록만 골라 개인정보를 표기 기준 값으로 바꿔 다시 저장 (원본 복원 불가)
  //   이 회원의 기록 = 주문번호·문의번호로 저장된 항목, 또는 원래 아이디·이메일·휴대폰 번호가 들어 있는 항목
  //   (이름만 같은 다른 회원의 기록은 건드리지 않음 — 샘플 회원 이름은 겹칠 수 있음)
  //   배송지 수정 기록(orderAddresses)은 관리자가 직접 입력한 주소라 값 비교가 안 되므로 이 회원 주문분을 통째로 삭제
  //   주문 관리정보의 '배송지' 변경 이력은 내용만 파기 표시
  // TODO: 실서비스에서는 서버가 회원번호로 연결된 테이블의 개인정보 컬럼을 일괄 파기·분리 보관
  const COPY_STORES = [
    'stopbook.orderCancels.v1', 'stopbook.orderAdminLog.v1', 'stopbook.orderDeposits.v2', 'stopbook.orderExtraPayments.v1',
    'stopbook.outsourceRequests.v1', 'stopbook.outsourceRequestMemos.v1', 'stopbook.voucherMemos.v1',
    'stopbook.cancelRequests.v2', 'stopbook.exchangeRequests.v1', 'stopbook.docRequests.v1', 'stopbook.docRequests.v2','stopbook.docIssues.v1',
    'stopbook.inquiries.v1', 'stopbook.messageLogs.v1', 'stopbook.groupApplications.v4'
  ];
  const ADDRESS_STORE = 'stopbook.orderAddresses.v1', ORDER_LOG_STORE = 'stopbook.orderAdminLog.v1';
  function purgeCopies(m, rec) {
    const L = WITHDRAWN_LABEL;
    const orderNos = new Set((m.orders || []).map(o => o.orderNo).filter(Boolean));
    const inqNos = new Set((m.inquiries || []).map(q => String(q.no)));
    const ph = String(m.phone || ''), phDigits = digits(ph);
    // 바꿀 값: 고유한 값(아이디·이메일·휴대폰·주소)을 먼저, 이름은 마지막
    const pairs = [
      [m.userId, rec.userIdMasked], [m.email, rec.emailMasked],
      [ph, L.restricted], [phDigits, L.restricted], [ph.replace(/-(\d{3,4})-/, '-****-'), L.restricted],
      [m.address2, L.restricted], [m.address1, L.restricted], [m.name, L.name]
    ].filter(([v]) => v && String(v).length >= 2 && v !== L.restricted && v !== L.name);
    const ids = [m.userId, m.email, ph, phDigits].filter(v => v && String(v).length >= 4).map(v => String(v).toLowerCase());
    const replaceIn = v => {
      if (typeof v === 'string') return pairs.reduce((s, [from, to]) => s.split(from).join(to), v);
      if (Array.isArray(v)) return v.map(replaceIn);
      if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replaceIn(x)]));
      return v;
    };
    const mine = (key, entry) => {
      if (orderNos.has(key) || inqNos.has(key)) return true;
      const s = JSON.stringify(entry).toLowerCase();
      return [...orderNos].some(no => s.includes(no.toLowerCase())) || ids.some(v => s.includes(v));
    };
    let changed = 0;
    COPY_STORES.forEach(key => {
      let data;
      try { data = JSON.parse(localStorage.getItem(key)); } catch (e) { return; }
      if (!data || typeof data !== 'object') return;
      const fix = (entry, k) => {
        if (!mine(k, entry)) return entry;
        changed++;
        const out = replaceIn(entry);
        // 주문 관리정보: 배송지 변경 이력은 관리자가 입력한 주소·연락처가 들어 있어 내용만 파기 표시
        if (key === ORDER_LOG_STORE && out && Array.isArray(out.history)) out.history.forEach(h => { if (h.type === '배송지') h.content = '배송지 변경 (탈퇴로 변경 내용 파기)'; });
        return out;
      };
      const next = Array.isArray(data) ? data.map((x, i) => fix(x, String(i))) : Object.fromEntries(Object.entries(data).map(([k, x]) => [k, fix(x, k)]));
      try { localStorage.setItem(key, JSON.stringify(next)); } catch (e) { /* 저장소 사용 불가 */ }
    });
    const addrs = readJson(ADDRESS_STORE);
    const before = Object.keys(addrs).length;
    orderNos.forEach(no => { delete addrs[no]; });
    if (Object.keys(addrs).length !== before) { writeJson(ADDRESS_STORE, addrs); changed++; }
    return changed;
  }

  // 회원 탈퇴 처리. 반환: { record } 또는 { error, blocking }
  //   opts = { typeCode(탈퇴구분, 기본 자진탈퇴), reasonCodes, reasonLabels, reasonEtc, channel('PC'|'모바일'|'관리자'|'시스템'),
  //            by('회원'|관리자 이름|'시스템'), note(처리 메모: 관리자 처리·시스템 자동) }
  //   회원 본인 신청 = 마이페이지 / 관리자 처리(강제탈퇴, 전화 등으로 받은 탈퇴 요청 대리 처리) = 회원 상세 / 시스템 자동(장기미이용) = runDormantBatch
  function withdraw(no, opts = {}) {
    const m = members.find(x => x.no === no);
    if (!m || m.withdrawn) return { error: '회원 정보를 찾을 수 없습니다.' };
    // 다른 탭(창)에서 이미 탈퇴한 경우
    if (isWithdrawnStored(no)) return { error: '이미 탈퇴 처리된 계정입니다.', withdrawn: true };
    const chk = withdrawCheck(m);
    if (chk.blocking.length) return { error: `진행 중인 주문 ${chk.blocking.length}건이 있어 탈퇴할 수 없습니다.`, blocking: chk.blocking };
    const { type } = withdrawType(opts.typeCode || 'voluntary');
    if (!type) return { error: '탈퇴구분을 찾을 수 없습니다.' };
    const byMember = !opts.by || opts.by === '회원';
    const now = new Date(), at = fmtDateTime(now), date = fmtDate(now);
    const orders = effectiveOrders(m);
    const tenureDays = Math.max(0, daysBetween(m.joinDate, date));
    const lastLogin = m.lastLogin || date;
    const products = orders.reduce((acc, o) => { if (o.productCategory) acc[o.productCategory] = (acc[o.productCategory] || 0) + 1; return acc; }, {});
    const mainProduct = Object.keys(products).sort((a, b) => products[b] - products[a])[0] || '';
    const inq = m.inquiries || [];
    const rejoinDays = Number((type.cond || {}).rejoinDays) || 0;
    const rejoinUntil = rejoinDays ? daysAfter(date, rejoinDays) : '';
    const reasonCodes = (opts.reasonCodes || []).slice(), reasonLabels = (opts.reasonLabels || []).slice(), reasonEtc = String(opts.reasonEtc || '').trim();
    const rec = {
      at, withdrawDate: date, typeCode: type.code, reasonType: type.name, reasonCodes, reasonLabels, reasonEtc,
      channel: opts.channel || 'PC', processedBy: byMember ? '본인' : opts.by, processNote: String(opts.note || '').trim(),
      userIdMasked: maskUserId(m.userId), emailMasked: maskEmail(m.email),
      emailHash: m.email ? hashOf(m.email) : '', phoneHash: digits(m.phone) ? hashOf(digits(m.phone)) : '',
      rejoinUntil,
      // 탈퇴 회원 관리(withdrawn.html) 목록·분석 항목과 같은 이름 (개인 식별 정보 없음)
      snapshot: {
        memberNo: m.no, category: m.category || '', kind: m.subCategory || '', memberType: m.memberType, grade: m.grade,
        marketing: m.marketingSms === 'Y' || m.marketingEmail === 'Y' ? 'Y' : 'N',
        joinDate: m.joinDate, tenureDays, lastLoginDate: lastLogin, inactiveDays: Math.max(0, daysBetween(lastLogin, date)),
        orderCount: orders.length, orderAmount: orders.reduce((s, o) => s + (o.amount || 0), 0),
        avgOrder: orders.length ? Math.round(orders.reduce((s, o) => s + (o.amount || 0), 0) / orders.length / 10) * 10 : 0,
        orders12m: orders.filter(o => daysBetween(o.at, date) < 365).length,
        lastOrderDate: orders.length ? orders[orders.length - 1].at : '', mainProduct,
        inquiryCount: inq.length, openInquiry: chk.waitingInquiries.length > 0, lastInquiryType: inq.length ? inq[0].type || '' : '',
        claimCount: 0, savedProjects: chk.cart.length, cartAmount: chk.cart.reduce((s, c) => s + (c.price || 0) * (c.qty || 1), 0),
        lostMileage: chk.mileage, lostCoupons: chk.coupons, lostGiftCard: chk.giftCard,
        orderRecordPurgeDate: orders.length ? daysAfter(date, 365 * 5 + 1) : ''
      },
      log: [
        { at, content: `회원 탈퇴 (${type.name}${reasonLabels.length ? ` · 사유: ${reasonLabels.join(', ')}` : ''}${reasonEtc ? ` · 의견: ${reasonEtc}` : ''}${opts.note ? ` · 처리 메모: ${String(opts.note).trim()}` : ''})`, by: opts.by || '회원' },
        { at, content: `개인정보 파기 (이름·이메일·휴대폰·생일·주소 등) · 보유 혜택 소멸 (마일리지 ${chk.mileage.toLocaleString()}P · 쿠폰 ${chk.coupons}장 · 상품권 ${chk.giftCard.toLocaleString()}원)`, by: '시스템' }
      ],
      // 아래에서 지우는 회원정보 수정·비밀번호 기록의 사본 (일시·처리자는 남기고 개인정보 값만 파기 표시)
      history: [].concat(((PROFILES[no] || {}).log) || [], ((AUTH[no] || {}).log) || []).map(h => Object.assign({}, h, { content: scrubLog(h.content) }))
    };
    // 다른 탭에서 저장한 값을 덮어쓰지 않도록 저장 직전에 다시 읽고 이 회원 값만 바꿔 저장
    const stored = readJson(WITHDRAW_KEY);
    stored[no] = rec;
    if (!writeJson(WITHDRAW_KEY, stored)) return { error: '탈퇴 처리를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' };
    Object.assign(WITHDRAWALS, stored);

    // 저장소에 남은 개인정보 파기 (회원정보 수정 값·비밀번호·로그인 기록·가입 정보)
    [[PROFILE_KEY, PROFILES], [AUTH_KEY, AUTH], [LOGIN_KEY, LOGINS]].forEach(([key, mem]) => {
      const fresh = readJson(key);
      delete fresh[no]; delete mem[no];
      writeJson(key, fresh);
    });
    if (m.fromSignup) {
      const list = loadSignups().map(r => (r.no !== no ? r : Object.assign({}, r, {
        name: WITHDRAWN_LABEL.name, userId: rec.userIdMasked, email: rec.emailMasked, phone: WITHDRAWN_LABEL.purged,
        birth: '', nickname: '', gender: '', marketingUse: 'N', marketingSms: 'N', marketingEmail: 'N', lastLogin: '', loginEnv: '', snsKey: '',
        history: (r.history || []).map(h => Object.assign({}, h, { content: scrubLog(h.content) }))
      })));
      try { localStorage.setItem(SIGNUP_KEY, JSON.stringify(list)); } catch (e) { /* 화면에는 아래 적용으로 가려짐 */ }
    }
    purgeCopies(m, rec);   // 원래 값이 필요하므로 applyWithdrawal 전에
    applyWithdrawal(m, rec);
    return { record: rec };
  }

  // 재가입 제한: 탈퇴 후 rejoinUntil 전까지 같은 이메일·휴대폰 번호로 가입 불가 (회원 유형 관리 > 탈퇴회원 > 재가입 제한 기간)
  //   반환: { until, field: 'email'|'phone' } 또는 null
  function rejoinBlock({ email, phone }) {
    const today = fmtDate(new Date());
    const eh = email ? hashOf(email) : '', ph = digits(phone) ? hashOf(digits(phone)) : '';
    for (const rec of Object.values(readJson(WITHDRAW_KEY))) {   // 다른 탭에서 탈퇴한 기록도 확인
      if (!rec.rejoinUntil || rec.rejoinUntil <= today) continue;
      if (ph && rec.phoneHash === ph) return { until: rec.rejoinUntil, field: 'phone' };
      if (eh && rec.emailHash === eh) return { until: rec.rejoinUntil, field: 'email' };
    }
    return null;
  }
  // 탈퇴 회원 관리(withdrawn.html)용 실제 탈퇴 기록 목록
  const withdrawals = () => Object.entries(WITHDRAWALS).map(([no, rec]) => Object.assign({ memberNo: Number(no) }, rec));

  // 가입 저장. rec = 위 저장 형식에서 no·grade·joinDate 등을 뺀 입력값. 반환: { member } 또는 { error }
  function registerMember(rec) {
    const dup = findDuplicate(rec);
    if (dup) return { error: dup.field === 'phone' ? '이미 가입된 휴대폰 번호입니다.' : '이미 사용 중인 이메일입니다.' };
    const block = rejoinBlock(rec);
    if (block) return { error: `탈퇴 후 재가입 제한 기간입니다. ${block.until}부터 다시 가입할 수 있습니다.` };
    // 다른 탭(창)에서 방금 가입한 회원도 확인: 저장소를 다시 읽어 이 화면에 아직 없는 가입 기록과 비교 (같은 정보로 계정이 두 개 생기지 않게)
    const list = loadSignups();
    const e = String(rec.email || '').trim().toLowerCase(), p = digits(rec.phone);
    const fresh = list.filter(r => !members.some(m => m.no === r.no));
    if (fresh.some(r => (p && digits(r.phone) === p))) return { error: '이미 가입된 휴대폰 번호입니다.' };
    if (fresh.some(r => e && String(r.email).toLowerCase() === e)) return { error: '이미 사용 중인 이메일입니다.' };
    const now = new Date(), at = fmtDateTime(now);
    const saved = Object.assign({}, rec, {
      no: members.concat(list).reduce((n, m) => Math.max(n, m.no), 1000) + 1,   // 회원번호도 다른 탭 가입분과 겹치지 않게
      grade: GRADE_ORDER[0], joinDate: fmtDate(now), lastLogin: fmtDate(now), loginEnv: rec.joinEnv,
      memos: [], history: [{ at, content: `회원 가입 (${rec.memberType})`, by: '회원' }].concat(rec.history || [])
    });
    list.push(saved);
    try { localStorage.setItem(SIGNUP_KEY, JSON.stringify(list)); } catch (e) { return { error: '가입 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }; }
    return { member: attachSignup(saved) };
  }

  // ===== 등급 자동 산정 =====
  // 회원 유형 관리 > 등급 탭의 평가 조건으로, 산정 예정일이 지났으면 회원 데이터를 불러올 때 재산정 (이전 결과는 localStorage에서 먼저 반영)
  //   관리자 화면과 쇼핑몰(마이페이지·탈퇴 기록)이 같은 등급을 보도록 여기서 한 번만 실행. 탈퇴 회원은 탈퇴 시점 등급 유지
  // TODO: 실서비스에서는 서버 배치가 처리
  //   관리자가 '등급 고정'으로 저장한 회원(관리자 회원 상세 저장소의 gradeLocked)은 자동 산정에서 뺌
  const ADMIN_EDIT_KEY = 'stopbook.memberAdminEdits.v1';
  const gradeLocked = (() => { const s = readJson(ADMIN_EDIT_KEY); return no => !!(s[no] && s[no].fields && s[no].fields.gradeLocked); })();
  const gradeRun = (() => {
    const MTS = window.MemberTypeStore;
    const group = MTS && MTS.GradeEvaluator && MTS.load().find(g => g.key === 'grade');
    return group ? MTS.GradeEvaluator.run(members.filter(m => !m.withdrawn && !gradeLocked(m.no)), group, orderStats) : { ran: false, changes: [], run: { lastRunAt: '' } };
  })();

  // ===== 관리자 회원 상세 저장 (admin/members.html) =====
  // 관리자가 회원 상세에서 바꾼 값을 localStorage에 보관하고 페이지를 열 때마다 회원 데이터에 덮어씀 (샘플 회원은 매번 새로 만들어지므로)
  //   ADMIN_EDIT_KEY: { [회원 no]: { fields: { categoryCode, category, subCategory, grade, gender, marketingSms, marketingEmail, postpay, postpayFrom, postpayTo },
  //                     gradeAt(등급을 바꾼 일시), dropBusiness(사업자 정보 삭제), memos: [], alimtalkLog: [], ledger: { giftCard: [], coupon: [] }, log: [{ at, content, by }] } }
  //   회원등급: 관리자가 바꾼 등급은 다음 자동 산정 전까지 유지 (바꾼 일시가 마지막 자동 산정보다 늦을 때만 덮어씀)
  //     gradeLocked(등급 고정) = 자동 산정에서 빼고 관리자가 정한 등급을 계속 유지
  //   탈퇴 회원은 메모·히스토리만 반영 (파기한 값이 되살아나지 않게)
  // TODO: 실서비스에서는 PUT /api/admin/members/{no}, POST /api/admin/members/{no}/memos|alimtalk|benefits/{kind}
  const ADMIN_FIELDS = ['categoryCode', 'category', 'subCategory', 'grade', 'gradeLocked', 'gender', 'marketingSms', 'marketingEmail', 'postpay', 'postpayFrom', 'postpayTo'];
  const copyAll = list => (list || []).map(x => Object.assign({}, x));
  function applyAdminEdit(m, e) {
    if (!m.withdrawn) {
      const f = Object.assign({}, e.fields);
      if ('grade' in f && !f.gradeLocked && gradeRun.run.lastRunAt && (e.gradeAt || '') < gradeRun.run.lastRunAt) delete f.grade;   // 고정하지 않았으면 그 뒤 자동 산정된 등급이 우선
      Object.assign(m, f);
      if (e.dropBusiness) delete m.business;
      ['giftCard', 'coupon'].forEach(k => {
        const list = m.ledger && m.ledger[k];
        if (!list) return;
        copyAll((e.ledger || {})[k]).forEach(x => { delete x.balance; pushEntry(list, x); });
        m[k] = list.length ? list[list.length - 1].balance : 0;
      });
      if ((e.alimtalkLog || []).length) m.alimtalkLog = (m.alimtalkLog || []).concat(copyAll(e.alimtalkLog));
    }
    m.memos = (m.memos || []).concat(copyAll(e.memos));
    copyAll(e.log).forEach(h => m.history.push(h));
  }
  const ADMIN_EDITS = readJson(ADMIN_EDIT_KEY);
  members.forEach(m => { if (ADMIN_EDITS[m.no]) applyAdminEdit(m, ADMIN_EDITS[m.no]); });
  // 저장: patch = { fields, memo, alimtalk, ledger: { kind, entry }, dropBusiness, logs: [내용] } (있는 것만). 회원 데이터에는 화면이 이미 반영해 둔 상태
  //   다른 탭에서 저장한 값을 덮어쓰지 않도록 저장 직전에 다시 읽어 이 회원 값만 바꿈. 반환: 저장 성공 여부
  function saveAdminEdit(no, patch, by) {
    const m = members.find(x => x.no === no);
    if (!m) return false;
    const store = readJson(ADMIN_EDIT_KEY);
    const e = store[no] || { fields: {}, memos: [], alimtalkLog: [], ledger: {}, log: [] };
    const at = fmtDateTime(new Date());
    if (patch.fields && !m.withdrawn && !isWithdrawnStored(no)) {
      ADMIN_FIELDS.forEach(k => { if (k in patch.fields) e.fields[k] = patch.fields[k]; });
      if ('grade' in patch.fields) e.gradeAt = at;
    }
    if (patch.dropBusiness) e.dropBusiness = true;
    if (patch.memo) e.memos.push(patch.memo);
    if (patch.alimtalk) e.alimtalkLog.push(patch.alimtalk);
    if (patch.ledger) (e.ledger[patch.ledger.kind] || (e.ledger[patch.ledger.kind] = [])).push(Object.assign({}, patch.ledger.entry));
    (patch.logs || []).forEach(content => e.log.push({ at, content, by: by || '관리자' }));
    store[no] = e; ADMIN_EDITS[no] = e;
    return writeJson(ADMIN_EDIT_KEY, store);
  }

  // ===== 장기미이용 자동 탈퇴 (탈퇴구분 중 '시스템 자동', 회원 유형 관리 > 탈퇴회원) =====
  // 하루 한 번 (회원 데이터를 불러올 때 오늘 실행 기록이 없으면) 실행
  //   ① 탈퇴 예정 안내: 미접속 (탈퇴 조건 일수 − 사전 안내 일수)일이 지난 회원에게 탈퇴 예정일을 안내 (이메일·알림톡 발송 기록)
  //   ② 자동 탈퇴: 안내한 탈퇴 예정일이 지났고 그동안 접속하지 않은 회원을 탈퇴 처리 (사유는 그 탈퇴구분의 첫 번째 사용 중 사유)
  //      진행 중인 주문이 있으면 탈퇴하지 않고 다음 실행 때 다시 확인. 안내 후 접속한 회원은 안내를 취소
  //   안내 없이 바로 탈퇴하지 않음: 사전 안내를 거친 회원만 탈퇴 (처음 실행하면 대상자에게 안내만 나감)
  //   DORMANT_KEY: { lastRunDate, notices: { [회원 no]: { noticedAt, dueDate, typeCode } }, log: { [회원 no]: [{ at, content, by }] } }
  // TODO: 실서비스에서는 매일 00:00 서버 배치 + 실제 이메일·알림톡 발송
  const DORMANT_KEY = 'stopbook.dormantWithdraw.v1';
  const dormant = Object.assign({ lastRunDate: '', notices: {}, log: {} }, readJson(DORMANT_KEY));
  members.forEach(m => { (dormant.log[m.no] || []).forEach(h => m.history.push(Object.assign({}, h))); });
  function runDormantBatch(now = new Date()) {
    const today = fmtDate(now), at = fmtDateTime(now);
    const result = { ran: false, noticed: 0, withdrawn: 0, held: 0 };
    if (dormant.lastRunDate === today) return result;
    const WS = window.MemberTypeStore && MemberTypeStore.WithdrawStore;
    const data = WS ? WS.load() : null;
    const types = data ? data.types.filter(t => t.actor === 'system' && !t.hidden) : [];
    result.ran = true;
    const addLog = (no, content) => { const h = { at, content, by: '시스템' }; (dormant.log[no] || (dormant.log[no] = [])).push(h); const m = members.find(x => x.no === no); if (m) m.history.push(h); };
    members.filter(m => !m.withdrawn && m.lastLogin).forEach(m => {
      const n = dormant.notices[m.no];
      if (n && m.lastLogin > n.noticedAt.slice(0, 10)) { delete dormant.notices[m.no]; addLog(m.no, '장기미이용 탈퇴 예정 취소 (안내 후 접속)'); return; }
      const t = types.find(x => x.code === (n ? n.typeCode : '')) || types[0];
      if (!t) return;
      const inactive = daysBetween(m.lastLogin, today), c = t.cond;
      if (!n) {
        if (inactive < c.inactiveDays - c.noticeDays) return;
        const due = daysAfter(m.lastLogin, c.inactiveDays) > daysAfter(today, c.noticeDays) ? daysAfter(m.lastLogin, c.inactiveDays) : daysAfter(today, c.noticeDays);
        dormant.notices[m.no] = { noticedAt: at, dueDate: due, typeCode: t.code };
        addLog(m.no, `장기미이용 탈퇴 예정 안내 (미접속 ${inactive.toLocaleString()}일 · ${due} 자동 탈퇴 예정, 이메일·알림톡 발송)`);
        result.noticed++;
        return;
      }
      if (today < n.dueDate) return;
      const reason = data.reasons.find(r => r.type === t.code && !r.hidden);
      const r = withdraw(m.no, { typeCode: t.code, reasonCodes: reason ? [reason.code] : [], reasonLabels: reason ? [reason.name] : [], channel: '시스템', by: '시스템',
        note: `미접속 ${inactive.toLocaleString()}일 (${n.noticedAt.slice(0, 10)} 사전 안내)` });
      if (r.error) { if (!n.held) addLog(m.no, `장기미이용 자동 탈퇴 보류: ${r.error}`); n.held = true; result.held++; return; }
      delete dormant.notices[m.no];
      result.withdrawn++;
    });
    dormant.lastRunDate = today;
    writeJson(DORMANT_KEY, dormant);
    return result;
  }
  const dormantRun = runDormantBatch();
  // 탈퇴 예정 안내를 받은 회원 (회원 상세 안내용). 반환: { noticedAt, dueDate } 또는 null
  const dormantNotice = no => dormant.notices[no] || null;

  window.MemberData = {
    members, GRADE_ORDER, gradeRun, saveAdminEdit, dormantRun, dormantNotice, runDormantBatch, BENEFITS, COUPONS, PRODUCTS, PROJECT_NAMES, VIEWER_SAMPLE, viewerUrl, pad, fmtDate, fmtDateTime, pushEntry, heldCoupons, orderStats, validOrders, statusClass, ageOf, addMileage, mileageHistory,
    applications, saveApplication, applyApproval, revokeBusiness, GROUP_TYPES: groupKinds,
    findDuplicate, registerMember, snsKey, findSnsMember, SIGNUP_KEY, Auth, updateProfile, PROFILE_KEY,
    INTERESTS, INTEREST_ETC, interestText, addressText,
    WITHDRAW_KEY, WITHDRAWN_LABEL, withdrawCheck, withdraw, withdrawType, rejoinBlock, withdrawals, isWithdrawnStored, maskEmail, maskUserId
  };
})();
