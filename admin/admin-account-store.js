// 관리자 계정관리 데이터 (admin-levels.html: 레벨 관리 · admin-accounts.html: 계정 관리. 화면 공통 도우미는 admin-account-ui.js)
//   레벨: 이름·설명 + 접근 가능한 관리자 메뉴(사이드 메뉴 링크 href 목록)
//   계정: 사내 구글 계정(@kstudy.com) + 레벨 + 사용 여부
// 관리자 페이지 로그인은 사내 구글 계정으로만 허용 예정 (등록된 계정 · 사용 중 · 레벨의 접근 메뉴만 열람)
// TODO: 실서비스에서는 /api/admin/admin-levels, /api/admin/admin-accounts 사용. 구글 OAuth(hd=kstudy.com) 로그인 연동은 추후 설정
(function () {
  'use strict';
  const KEY = 'stopbook.adminAccounts.v1';
  const DOMAIN = 'kstudy.com';
  const NAME_MAX = 20;

  // 기본 레벨. 최고 관리자(system)는 항상 전체 메뉴 접근이며 삭제·권한 변경 불가
  const MEMBER = ['members.html', 'group-applications.html', 'withdrawn.html', 'member-types.html'];
  const MESSAGE = ['message-send.html', 'message-sms.html', 'message-alimtalk.html', 'message-email.html'];
  const ORDER = ['orders.html', 'paid-orders.html', 'unpaid-orders.html', 'postpay-orders.html', 'prepaid-orders.html', 'canceled-orders.html', 'extra-payments.html'];
  const PRODUCTION = ['production-orders.html', 'ordered-orders.html', 'making-orders.html', 'shipping-orders.html', 'delivered-orders.html', 'outsource-orders.html'];
  const CLAIM = ['claim-cancel.html', 'claim-exchange.html', 'claim-documents.html', 'claim-receipts.html'];
  const EDIT = ['draft-requests.html', 'draft-works.html', 'agency-requests.html', 'agency-orders.html'];   // 편집대행 > 초안서비스 · 디자이너편집대행
  const BOARD = ['board-all.html', 'board-admin-notice.html', 'board-inquiry-settings.html'];
  const POST = ['board-notice.html', 'board-inquiry.html', 'board-faq.html', 'board-review.html'];
  const BENEFIT = ['mileage-types.html', 'mileage.html'];
  // 최고 관리자 전용 카테고리·메뉴. 다른 레벨에 주면 스스로 권한을 올릴 수 있으므로 부여 불가
  const SUPER_ONLY_CAT = '관리자계정관리';
  const SUPER_ONLY = ['admin-levels.html', 'admin-accounts.html'];

  // 게시판 통합 관리에서 만든 게시판(게시글관리 > board-posts.html?board=코드) 권한
  //   level.boards = { [게시판 코드]: { on, createdAt } } — 레벨 설정에서 직접 켜거나 끈 게시판. createdAt = 그 게시판의 생성 일시
  //   level.newBoards = 직접 정하지 않은 게시판(새로 만든 게시판 포함)을 자동 허용할지
  //   게시판을 지우고 같은 코드로 다시 만들면 생성 일시가 달라지므로 예전 설정은 쓰지 않고 newBoards를 따름
  const BOARD_RE = /^board-posts\.html\?board=(.+)$/;
  const boardCode = href => { const m = BOARD_RE.exec(href || ''); return m ? decodeURIComponent(m[1]) : ''; };
  const boardStamp = code => { const b = window.BoardStore && BoardStore.byCode(code); return b ? String(b.createdAt || '') : ''; };
  const boardAllowed = (lv, code) => { const x = (lv.boards || {})[code]; return x && x.createdAt === boardStamp(code) ? !!x.on : !!lv.newBoards; };
  const hasMenu = (lv, href) => (boardCode(href) ? boardAllowed(lv, boardCode(href)) : lv.menus.includes(href));
  // 예전 저장값: menus에 들어 있던 게시판 링크 → boards로 옮김. newBoards가 없으면 게시글관리 메뉴가 있는 레벨만 자동 허용
  function normalizeBoards(lv) {
    if (!lv || lv.all) return lv;
    lv.boards = lv.boards || {};
    (lv.menus || []).filter(boardCode).forEach(h => { lv.boards[boardCode(h)] = { on: true, createdAt: boardStamp(boardCode(h)) }; });
    lv.menus = (lv.menus || []).filter(h => !boardCode(h));
    if (typeof lv.newBoards !== 'boolean') lv.newBoards = lv.menus.some(h => POST.includes(h));
    return lv;
  }

  const seed = () => {
    const at = '2026-10-01 09:00', by = '시스템';
    const h = content => [{ at, content, by }];
    return {
      levels: [
        { code: 'L1', name: '최고 관리자', desc: '모든 관리자 메뉴와 관리자 계정·레벨을 관리합니다.', all: true, system: true, menus: [], history: h('기본 레벨 생성') },
        // 게시글을 다루는 레벨은 게시판 통합 관리에서 만든 게시판(제휴문의 등)과 새 게시판을 자동 허용
        { code: 'L2', name: '운영 관리자', desc: '관리자 계정관리를 제외한 운영 메뉴 전체', all: false, system: false, menus: [...MEMBER, ...MESSAGE, ...ORDER, ...PRODUCTION, ...CLAIM, ...EDIT, ...BOARD, ...POST, ...BENEFIT], newBoards: true, boards: {}, history: h('기본 레벨 생성') },
        { code: 'L3', name: 'CS 담당', desc: '회원·주문·클레임 응대와 게시글 답변', all: false, system: false, menus: [...MEMBER.filter(x => x !== 'member-types.html'), 'message-send.html', ...ORDER, ...CLAIM, ...POST, 'mileage.html'], newBoards: true, boards: {}, history: h('기본 레벨 생성') },
        { code: 'L4', name: '제작 담당', desc: '제작·배송 진행 관리', all: false, system: false, menus: [...PRODUCTION, ...EDIT, 'orders.html'], newBoards: false, boards: {}, history: h('기본 레벨 생성') }
      ],
      // 변경 이력 (레벨·계정 추가·변경·삭제). 삭제한 레벨·계정의 기록도 남음
      audit: [],
      accounts: [
        // testId = 그 관리자가 쇼핑몰(사용자 페이지) 테스트에 쓰는 스탑북 회원 아이디 (통합 회원 관리의 회원)
        { id: 'A1', email: 'ksiailab@kstudy.com', name: '시스템관리자', dept: 'AI랩', level: 'L1', use: true, memo: '', testId: 'user001', createdAt: at, lastLoginAt: '2026-10-15 08:52', history: h('계정 등록') },
        { id: 'A2', email: 'ops.lead@kstudy.com', name: '김운영', dept: '운영팀', level: 'L2', use: true, memo: '', testId: 'user002', createdAt: at, lastLoginAt: '2026-10-14 17:20', history: h('계정 등록') },
        { id: 'A3', email: 'cs01@kstudy.com', name: '이상담', dept: '고객지원팀', level: 'L3', use: true, memo: '', testId: 'user003', createdAt: at, lastLoginAt: '2026-10-15 09:05', history: h('계정 등록') },
        { id: 'A4', email: 'cs02@kstudy.com', name: '박응대', dept: '고객지원팀', level: 'L3', use: false, memo: '휴직 (2026-11 복귀 예정)', testId: '', createdAt: at, lastLoginAt: '2026-09-02 18:11', history: h('계정 등록') },
        { id: 'A5', email: 'make01@kstudy.com', name: '최제작', dept: '제작팀', level: 'L4', use: true, memo: '', testId: 'user005', createdAt: at, lastLoginAt: '', history: h('계정 등록') }
      ]
    };
  };

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.levels) && Array.isArray(d.accounts)) {
        d.levels.forEach(lv => { stripSuperOnly(lv); normalizeBoards(lv); });
        if (!Array.isArray(d.audit)) d.audit = [];
        return d;
      }
    } catch (e) { /* 저장값이 없거나 깨지면 기본값 */ }
    return seed();
  }
  function save(d) {
    d.levels.forEach(stripSuperOnly);
    try { localStorage.setItem(KEY, JSON.stringify(d)); return true; }
    catch (e) { return false; }
  }

  // ===== 메뉴 목록 =====
  // 화면의 사이드 메뉴 마크업(게시판 통합 관리에서 만든 게시판 포함)을 읽어 대메뉴 > 카테고리 > 메뉴 순으로 구성
  // 사이드 메뉴에 메뉴를 추가하면 레벨 설정에도 자동으로 나타남. TODO: 실서비스에서는 서버의 메뉴 정의 사용
  function menuCatalog() {
    const gnb = (window.AdminUtil && AdminUtil.GNB) || [];
    const cats = [...document.querySelectorAll('.sidebar > ul > li.has-sub')].map(li => ({
      cat: (li.querySelector('.menu-parent').childNodes[0].textContent || '').trim(),
      items: [...li.querySelectorAll('.submenu a')].map(a => ({ href: a.getAttribute('href'), label: a.childNodes[0].textContent.trim() }))
    }));
    const sections = gnb.map(g => ({ key: g.key, label: g.label, cats: g.cats.map(c => cats.find(x => x.cat === c)).filter(Boolean) }));
    const rest = cats.filter(c => !gnb.some(g => g.cats.includes(c.cat)));
    if (rest.length) sections.push({ key: 'etc', label: '기타', cats: rest });
    return sections.filter(s => s.cats.length);
  }
  const allHrefs = catalog => catalog.flatMap(s => s.cats.flatMap(c => c.items.map(i => i.href)));
  // 최고 관리자 전용 메뉴 (관리자계정관리 카테고리에 이후 추가되는 메뉴 포함)
  const superOnlyHrefs = catalog => [...new Set([...SUPER_ONLY, ...(catalog || []).flatMap(s => s.cats).filter(c => c.cat === SUPER_ONLY_CAT).flatMap(c => c.items.map(i => i.href))])];
  const isSuperOnly = (href, catalog) => superOnlyHrefs(catalog).includes(href);
  // 최고 관리자가 아닌 레벨에서 전용 메뉴 제거 (저장·불러오기 시 적용)
  function stripSuperOnly(lv) {
    if (!lv || lv.all || !Array.isArray(lv.menus)) return lv;
    let only = SUPER_ONLY;
    try { only = superOnlyHrefs(menuCatalog()); } catch (e) { /* 사이드 메뉴가 없는 화면은 고정 목록만 */ }
    lv.menus = lv.menus.filter(h => !only.includes(h));
    return lv;
  }

  // 레벨이 접근할 수 있는 메뉴 (목록에 없는 메뉴 = 삭제된 게시판 등은 제외)
  const levelMenus = (lv, catalog) => { const all = allHrefs(catalog); return lv.all ? all : all.filter(h => hasMenu(lv, h) && !isSuperOnly(h, catalog)); };
  // 대시보드는 모든 레벨 접근. 상세 화면은 목록 화면 권한을 따름. 최고 관리자 전용 메뉴는 최고 관리자만
  const PARENT = { 'member-type-detail.html': 'member-types.html', 'order-detail.html': 'orders.html' };
  const canAccess = (lv, href) => !!lv && (lv.all || href === 'dashboard.html' || (!SUPER_ONLY.includes(PARENT[href] || href) && hasMenu(lv, PARENT[href] || href)));

  // ===== 검사 =====
  const checkLevelName = (d, name, code) => {
    if (!name) return '레벨명을 입력하세요.';
    if (name.length > NAME_MAX) return `레벨명은 ${NAME_MAX}자 이내로 입력하세요.`;
    if (d.levels.some(x => x.code !== code && x.name === name)) return '이미 등록된 레벨명입니다.';
    return '';
  };
  // 아이디 부분만 입력 (@kstudy.com 고정). 전체 이메일을 붙여 넣으면 @kstudy.com은 떼고 봄 (toIdPart)
  //   구글 Workspace 사용자 이름 규칙: 영문·숫자·마침표·밑줄·하이픈, 처음과 끝은 영문·숫자, 마침표 연속 불가
  const toIdPart = v => { const s = String(v || '').trim(); const at = s.lastIndexOf('@'); return at > 0 && s.slice(at + 1).toLowerCase() === DOMAIN ? s.slice(0, at) : s; };
  const checkEmailId = (d, raw, id) => {
    const idPart = toIdPart(raw);
    if (!idPart) return '구글 계정 아이디를 입력하세요.';
    if (idPart.includes('@')) return `@${DOMAIN} 계정만 등록할 수 있습니다.`;
    if (idPart.length < 2 || idPart.length > 40) return '아이디는 2~40자로 입력하세요.';
    if (!/^[a-z0-9._-]+$/i.test(idPart)) return '아이디는 영문·숫자·마침표(.)·밑줄(_)·하이픈(-)만 쓸 수 있습니다.';
    if (!/^[a-z0-9].*[a-z0-9]$/i.test(idPart)) return '아이디의 처음과 끝은 영문 또는 숫자여야 합니다.';
    if (idPart.includes('..')) return '마침표(.)를 연속으로 쓸 수 없습니다.';
    const email = `${idPart.toLowerCase()}@${DOMAIN}`;
    if (d.accounts.some(x => x.id !== id && x.email === email)) return '이미 등록된 계정입니다.';
    return '';
  };
  const checkAccountName = name => !name ? '이름을 입력하세요.' : name.length > NAME_MAX ? `이름은 ${NAME_MAX}자 이내로 입력하세요.` : '';
  // 스탑북 테스트 아이디: 관리자가 쇼핑몰 테스트에 쓰는 스탑북 회원 계정(아이디 또는 이메일). 선택 입력이지만 넣으면 가입된(탈퇴 안 한) 회원이어야 함
  //   member-data.js가 로드된 화면에서만 회원 조회 (없으면 형식만 확인). 저장은 그 회원의 아이디로 통일
  const testMemberOf = idText => (window.MemberData && MemberData.Auth ? MemberData.Auth.findLoginMember(idText) : null);
  const checkTestId = (d, idText, id) => {
    const v = String(idText || '').trim();
    if (!v) return '';
    if (v.length > 100 || /\s/.test(v)) return '테스트 아이디는 공백 없이 입력하세요.';
    const m = testMemberOf(v);
    if (window.MemberData && !m) return '가입된 스탑북 회원 아이디(또는 이메일)가 아닙니다. 사용자 페이지에서 먼저 가입해 주세요.';
    const key = (m ? m.userId : v).toLowerCase();
    if (d.accounts.some(x => x.id !== id && String(x.testId || '').toLowerCase() === key)) return '다른 관리자 계정이 이미 쓰고 있는 테스트 아이디입니다.';
    return '';
  };
  const normalizeTestId = idText => { const v = String(idText || '').trim(); const m = v && testMemberOf(v); return m ? m.userId : v; };

  // 최고 관리자 레벨의 사용 중 계정이 최소 1개 남아야 함 (모두 잠기는 것 방지)
  const activeSuperCount = (d, exceptId) => d.accounts.filter(a => a.id !== exceptId && a.use && (d.levels.find(l => l.code === a.level) || {}).system).length;

  window.AdminAccountStore = { DOMAIN, NAME_MAX, load, save, menuCatalog, allHrefs, superOnlyHrefs, isSuperOnly, stripSuperOnly, levelMenus, canAccess, checkLevelName, checkEmailId, toIdPart, checkAccountName, activeSuperCount,
    checkTestId, testMemberOf, normalizeTestId,
    boardCode, boardStamp };
})();
