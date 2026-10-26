// 관리자 계정관리 화면 공통 (admin-levels.html · admin-accounts.html)
//   저장소(admin-account-store.js)를 불러와 두 화면이 같이 쓰는 도우미를 만듦: 레벨 찾기·처리자·변경 이력 기록·접근 메뉴 요약·모달 공통
//   화면마다 AdminAccountUI.create(render)로 만들고, 저장(persist)하면 그 화면의 render()를 다시 부름
(function () {
  'use strict';
  const S = AdminAccountStore;
  const $ = id => document.getElementById(id);

  function create(render) {
    const { esc, toast, fmtDateTime, ADMIN_NAME } = AdminUtil;
    const d = S.load();
    // 사이드 메뉴(게시판 통합 관리에서 만든 게시판 포함)에서 메뉴 목록 구성
    const catalog = S.menuCatalog();
    const TOTAL = S.allHrefs(catalog).length;
    const levelBy = code => d.levels.find(l => l.code === code);
    const levelName = code => { const l = levelBy(code); return l ? l.name : '(삭제된 레벨)'; };
    const off = t => `<span class="yn-off">${t}</span>`;
    // 처리자: 지금 로그인한 관리자. 구글 로그인 연동 전이라 사용 중인 최고 관리자 계정을 로그인한 것으로 봄
    // TODO: 구글 로그인 연동 후 로그인 세션의 계정 (이름 + 구글 계정)
    const operator = () => { const a = d.accounts.find(x => x.use && (levelBy(x.level) || {}).system); return a ? `${a.name} (${a.email})` : ADMIN_NAME; };
    // 기록: 그 레벨·계정의 이력 + 전체 변경 이력(audit, 삭제해도 남음)
    const log = (it, content, kind) => {
      const h = { at: fmtDateTime(new Date()), content, by: operator() };
      (it.history || (it.history = [])).push(h);
      (d.audit || (d.audit = [])).push(Object.assign({ kind, target: kind === '레벨' ? it.name : `${it.name} (${it.email})` }, h));
    };
    // 변경 이력 패널 (최근 50건, 최신순) / 모달 안의 그 레벨·계정 이력
    const auditRows = kind => (d.audit || []).filter(x => x.kind === kind).slice(-50).reverse()
      .map(x => `<tr><td>${esc(x.at)}</td><td class="left">${esc(x.target)}</td><td class="left">${esc(x.content)}</td><td>${esc(x.by)}</td></tr>`).join('')
      || '<tr><td colspan="4" class="empty">변경 이력이 없습니다.</td></tr>';
    const historyRows = it => (it.history || []).slice().reverse().map(h => `<tr><td>${esc(h.at)}</td><td class="left">${esc(h.content)}</td><td>${esc(h.by)}</td></tr>`).join('')
      || '<tr><td colspan="3" class="empty">변경 이력이 없습니다.</td></tr>';
    const persist = msg => { const saved = S.save(d); render(); toast(saved ? msg : '저장소를 사용할 수 없어 이 화면에만 반영되었습니다.'); };
    const setErr = (id, msg) => { $(id).textContent = msg; $(id).classList.toggle('show', !!msg); return !!msg; };

    // 카테고리별 접근 메뉴 수 [{ cat, k, m }]
    const catSummary = lv => {
      const mine = S.levelMenus(lv, catalog);
      return catalog.flatMap(s => s.cats).map(c => ({ cat: c.cat, k: c.items.filter(i => mine.includes(i.href)).length, m: c.items.length }));
    };
    const summaryText = lv => {
      if (lv.all) return '모든 메뉴에 접근합니다.';
      const list = catSummary(lv).filter(x => x.k);
      return list.length ? '접근 메뉴: ' + list.map(x => x.k === x.m ? x.cat : `${x.cat} ${x.k}/${x.m}`).join(' · ') : '접근 가능한 메뉴가 없습니다.';
    };

    // 모달 공통: 닫기 버튼(data-close)·바깥 클릭·Esc. 닫는 함수를 돌려줌
    const bindModal = id => {
      const close = () => $(id).classList.remove('open');
      document.querySelectorAll(`#${id} [data-close]`).forEach(b => b.addEventListener('click', close));
      $(id).addEventListener('click', e => { if (e.target === $(id)) close(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
      return close;
    };

    return { d, catalog, TOTAL, levelBy, levelName, off, log, auditRows, historyRows, persist, setErr, catSummary, summaryText, bindModal };
  }

  window.AdminAccountUI = { create };
})();
