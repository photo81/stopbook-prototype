// 관리자 계정관리 데이터 (admin-accounts.html)
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
  const ORDER = ['orders.html', 'paid-orders.html', 'unpaid-orders.html', 'postpay-orders.html', 'prepaid-orders.html', 'canceled-orders.html'];
  const PRODUCTION = ['production-orders.html', 'ordered-orders.html', 'making-orders.html', 'shipping-orders.html', 'delivered-orders.html', 'outsource-orders.html'];
  const CLAIM = ['claim-cancel.html', 'claim-exchange.html', 'claim-documents.html', 'claim-receipts.html'];
  const BOARD = ['board-all.html', 'board-admin-notice.html', 'board-inquiry-settings.html'];
  const POST = ['board-notice.html', 'board-inquiry.html', 'board-faq.html', 'board-review.html'];
  const BENEFIT = ['mileage-types.html', 'mileage.html'];
  // 최고 관리자 전용 카테고리·메뉴. 다른 레벨에 주면 스스로 권한을 올릴 수 있으므로 부여 불가
  const SUPER_ONLY_CAT = '관리자계정관리';
  const SUPER_ONLY = ['admin-accounts.html'];

  const seed = () => {
    const at = '2026-10-01 09:00', by = '시스템';
    const h = content => [{ at, content, by }];
    return {
      levels: [
        { code: 'L1', name: '최고 관리자', desc: '모든 관리자 메뉴와 관리자 계정·레벨을 관리합니다.', all: true, system: true, menus: [], history: h('기본 레벨 생성') },
        { code: 'L2', name: '운영 관리자', desc: '관리자 계정관리를 제외한 운영 메뉴 전체', all: false, system: false, menus: [...MEMBER, ...MESSAGE, ...ORDER, ...PRODUCTION, ...CLAIM, ...BOARD, ...POST, ...BENEFIT], history: h('기본 레벨 생성') },
        { code: 'L3', name: 'CS 담당', desc: '회원·주문·클레임 응대와 게시글 답변', all: false, system: false, menus: [...MEMBER.filter(x => x !== 'member-types.html'), 'message-send.html', ...ORDER, ...CLAIM, ...POST, 'mileage.html'], history: h('기본 레벨 생성') },
        { code: 'L4', name: '제작 담당', desc: '제작·배송 진행 관리', all: false, system: false, menus: [...PRODUCTION, 'orders.html'], history: h('기본 레벨 생성') }
      ],
      accounts: [
        { id: 'A1', email: 'ksiailab@kstudy.com', name: '시스템관리자', dept: 'AI랩', level: 'L1', use: true, memo: '', createdAt: at, lastLoginAt: '2026-10-15 08:52', history: h('계정 등록') },
        { id: 'A2', email: 'ops.lead@kstudy.com', name: '김운영', dept: '운영팀', level: 'L2', use: true, memo: '', createdAt: at, lastLoginAt: '2026-10-14 17:20', history: h('계정 등록') },
        { id: 'A3', email: 'cs01@kstudy.com', name: '이상담', dept: '고객지원팀', level: 'L3', use: true, memo: '', createdAt: at, lastLoginAt: '2026-10-15 09:05', history: h('계정 등록') },
        { id: 'A4', email: 'cs02@kstudy.com', name: '박응대', dept: '고객지원팀', level: 'L3', use: false, memo: '휴직 (2026-11 복귀 예정)', createdAt: at, lastLoginAt: '2026-09-02 18:11', history: h('계정 등록') },
        { id: 'A5', email: 'make01@kstudy.com', name: '최제작', dept: '제작팀', level: 'L4', use: true, memo: '', createdAt: at, lastLoginAt: '', history: h('계정 등록') }
      ]
    };
  };

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.levels) && Array.isArray(d.accounts)) { d.levels.forEach(stripSuperOnly); return d; }
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
  const levelMenus = (lv, catalog) => { const all = allHrefs(catalog); return lv.all ? all : all.filter(h => lv.menus.includes(h) && !isSuperOnly(h, catalog)); };
  // 대시보드는 모든 레벨 접근. 상세 화면은 목록 화면 권한을 따름. 최고 관리자 전용 메뉴는 최고 관리자만
  const PARENT = { 'member-type-detail.html': 'member-types.html', 'order-detail.html': 'orders.html' };
  const canAccess = (lv, href) => !!lv && (lv.all || href === 'dashboard.html' || (!SUPER_ONLY.includes(PARENT[href] || href) && lv.menus.includes(PARENT[href] || href)));

  // ===== 검사 =====
  const checkLevelName = (d, name, code) => {
    if (!name) return '레벨명을 입력하세요.';
    if (name.length > NAME_MAX) return `레벨명은 ${NAME_MAX}자 이내로 입력하세요.`;
    if (d.levels.some(x => x.code !== code && x.name === name)) return '이미 등록된 레벨명입니다.';
    return '';
  };
  // 아이디 부분만 입력 (@kstudy.com 고정)
  const checkEmailId = (d, idPart, id) => {
    if (!idPart) return '구글 계정 아이디를 입력하세요.';
    if (idPart.includes('@')) return `@${DOMAIN} 앞의 아이디만 입력하세요.`;
    if (!/^[a-z0-9._-]{2,40}$/i.test(idPart)) return '아이디는 영문·숫자·마침표(.)·밑줄(_)·하이픈(-) 2~40자로 입력하세요.';
    const email = `${idPart.toLowerCase()}@${DOMAIN}`;
    if (d.accounts.some(x => x.id !== id && x.email === email)) return '이미 등록된 계정입니다.';
    return '';
  };
  const checkAccountName = name => !name ? '이름을 입력하세요.' : name.length > NAME_MAX ? `이름은 ${NAME_MAX}자 이내로 입력하세요.` : '';

  // 최고 관리자 레벨의 사용 중 계정이 최소 1개 남아야 함 (모두 잠기는 것 방지)
  const activeSuperCount = (d, exceptId) => d.accounts.filter(a => a.id !== exceptId && a.use && (d.levels.find(l => l.code === a.level) || {}).system).length;

  window.AdminAccountStore = { DOMAIN, NAME_MAX, load, save, menuCatalog, allHrefs, superOnlyHrefs, isSuperOnly, stripSuperOnly, levelMenus, canAccess, checkLevelName, checkEmailId, checkAccountName, activeSuperCount };
})();
