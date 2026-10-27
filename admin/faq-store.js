// FAQ 데이터 (게시글관리 > FAQ ↔ 쇼핑몰 고객센터 > FAQ)
//   구분(카테고리) + 질문/답변. 관리자가 등록·수정한 내용은 localStorage에 저장하고 쇼핑몰 FAQ 화면이 같은 데이터를 읽음
//   구분: IA(자주하는 질문: 아코디언형, 구분값 필터) + 운영 스탑북 FAQ 구분(회원/로그인·상품·편집/저장/보관함·장바구니/주문/결제·제작/배송/교환(환불)·이벤트·기타)
//   베스트: '베스트 10' 탭에 모아 보여 주는 질문 (구분과 별개 표시 플래그, 운영 사이트의 '베스트10' 탭과 같음)
//   노출 순서: 구분 안에서 order 오름차순. 쇼핑몰에는 use(노출)인 구분·질문만 보임
//   샘플은 처음 열 때 한 번 저장하고 그 뒤로는 저장본을 씀 (샘플을 바꾸면 KEY 버전을 올림)
// TODO: 실서비스에서는 GET/POST/PUT/DELETE /api/admin/faq/categories, /api/admin/faq/items, GET /api/faq (쇼핑몰)
(function () {
  'use strict';
  const KEY = 'stopbook.faq.v2';   // v2 (2026-10-27): '편집대행' 구분 + 샘플 6건 추가 (저장본에 샘플을 다시 넣기 위해 버전 올림)
  const pad = n => String(n).padStart(2, '0');
  const nowText = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const clean = s => String(s || '').trim().replace(/[ \t]+/g, ' ');
  const Q_MAX = 100, A_MAX = 2000, CAT_MAX = 20;

  const C = (code, name, order) => ({ code, name, order, use: true });
  const CATS = [C('member', '회원/로그인', 1), C('product', '상품', 2), C('edit', '편집/저장/보관함', 3), C('agency', '편집대행', 4), C('order', '장바구니/주문/결제', 5), C('make', '제작/배송/교환(환불)', 6), C('event', '이벤트', 7), C('etc', '기타', 8)];   // agency: 메인 편집대행 구획 [편집대행 FAQ] → support.html#faq?cat=agency
  // 샘플 질문/답변 (운영 스탑북 FAQ 제목을 참고해 프로토타입 기준으로 작성). best = 베스트 10
  const AT = '2026-10-01 10:00', BY = '관리자';
  let seq = 0;
  const I = (cat, q, a, best) => ({ id: `f${++seq}`, cat, q, a, best: !!best, use: true, order: seq, views: 0, createdAt: AT, updatedAt: AT, updatedBy: BY, sample: true });
  const ITEMS = [
    I('member', '회원 가입하면 어떤 혜택이 있나요?', '가입 즉시 신규가입 10% 할인 쿠폰과 회원가입 적립 마일리지를 드립니다.\n주문 금액의 1%가 마일리지로 적립되고, 구매 실적에 따라 등급(일반·스타터·홀리커·마스터·마스터 VIP)별 추가 혜택을 받을 수 있습니다.\n자세한 등급 혜택은 마이페이지 > 회원정보에서 확인해 주세요.', true),
    I('member', '로그인이 안돼요.', '이메일(또는 아이디)과 비밀번호를 다시 확인해 주세요. 비밀번호를 5회 연속 잘못 입력하면 10분간 로그인이 제한됩니다.\n비밀번호가 기억나지 않으면 로그인 창의 [비밀번호 찾기]에서 휴대폰 인증 후 새 비밀번호를 바로 설정할 수 있습니다.\n카카오·네이버·구글로 가입하셨다면 같은 SNS 버튼으로 로그인해 주세요.', true),
    I('member', '회원 탈퇴는 어떻게 하나요?', '마이페이지 > 회원정보 수정 하단의 [회원 탈퇴]에서 신청할 수 있습니다.\n진행 중인 주문(입금대기·주문완료·제작중)이 있으면 완료 또는 취소 후 탈퇴할 수 있고, 탈퇴 시 마일리지·쿠폰·상품권은 소멸됩니다.\n탈퇴 후 30일 동안은 같은 이메일·휴대폰 번호로 다시 가입할 수 없습니다.'),
    I('member', '비밀번호는 어떻게 바꾸나요?', '마이페이지 > 회원정보 수정에서 비밀번호를 확인한 뒤 새 비밀번호를 입력하면 됩니다.\n비밀번호는 8~20자, 영문·숫자·특수문자를 모두 포함해야 하며 90일마다 변경 안내를 드립니다.'),
    I('member', '휴대폰 번호·이메일을 바꾸고 싶어요.', '마이페이지 > 회원정보 수정에서 변경할 수 있습니다. 이메일·휴대폰 번호는 개인정보 보호를 위해 가입한 휴대폰 번호로 본인 인증을 한 뒤 바꿀 수 있습니다.\n이전 번호를 사용할 수 없으면 고객센터(080-860-1119)로 연락해 주세요.'),
    I('member', '단체(기관·학교·회사) 회원은 어떻게 신청하나요?', '회원가입 후 마이페이지에서 사업자등록증을 첨부해 단체 회원을 신청하면 관리자가 확인 후 승인합니다.\n승인되면 회원구분이 바뀌고 후불 결제·단체 할인 등 단체 혜택이 적용됩니다. 대량 제작이나 제휴는 고객센터 > 제휴문의로 문의해 주세요.'),
    I('product', '하드커버와 소프트커버 차이가 뭐죠?', '하드커버는 두꺼운 판지에 표지를 감싼 양장 제본으로 보관성이 좋고 고급스럽습니다. 소프트커버는 얇은 표지를 사용해 가볍고 가격이 저렴합니다.\n선물용·보관용은 하드커버, 가볍게 자주 보는 용도는 소프트커버를 추천합니다.', true),
    I('product', '사진 사이즈와 권장 해상도가 궁금해요.', '포토북 21×29.7cm 기준 1장당 가로 2,480px 이상을 권장합니다. 해상도가 낮은 사진은 편집기에서 경고 표시가 나타나며 인쇄 시 흐리게 나올 수 있습니다.\n스마트폰 기본 카메라 사진이면 대부분 문제없이 제작됩니다.'),
    I('product', '무광과 유광 코팅은 어떻게 다른가요?', '무광은 빛 반사가 적어 차분하고 지문이 덜 묻습니다. 유광은 색이 선명하고 광택이 있어 화사한 느낌을 줍니다.\n인물 사진 위주면 무광, 풍경·여행 사진 위주면 유광을 많이 선택합니다.'),
    I('product', '포토북 페이지를 추가할 수 있나요?', '포토북은 기본 24페이지이며 편집기에서 2페이지 단위로 추가할 수 있습니다. 추가 페이지는 1페이지당 500원이 더해집니다.\n상품별 최대 페이지 수는 상품 상세에서 확인해 주세요.'),
    I('product', '레더북 금박은 어떻게 넣나요?', '레더북·러브데이북은 표지에 금박 후가공을 선택할 수 있습니다. 기본금박(날짜·이름 등 기본 서체)은 1,500원, 맞춤금박(직접 입력한 문구·위치)은 3,000원이 1부당 추가됩니다.'),
    I('edit', '편집기 실행이 되지 않아요!', '크롬·엣지·사파리 최신 버전에서 가장 안정적으로 동작합니다. 브라우저를 최신으로 업데이트하고 캐시를 지운 뒤 다시 시도해 주세요.\n그래도 안 되면 사용 중인 브라우저와 화면 캡처를 첨부해 1:1 문의를 남겨 주세요.', true),
    I('edit', '편집 중인 작업물은 어디에 저장되나요?', '편집기에서 [저장]을 누르면 보관함에 저장됩니다. 보관함의 작업물은 마지막 저장일로부터 1년간 보관되며, 주문한 작업물은 주문일로부터 1년간 재주문할 수 있습니다.'),
    I('edit', '실수로 보관함에 있는 작업물을 삭제했어요. 복구 가능할까요?', '삭제 후 7일 이내라면 고객센터에서 복구할 수 있습니다. 작업물 이름과 삭제한 날짜를 1:1 문의로 알려 주세요. 7일이 지나면 복구가 어렵습니다.'),
    I('edit', '사진을 한 번에 여러 장 올릴 수 있나요?', '편집기의 사진 추가에서 여러 장을 한 번에 선택하거나 끌어다 놓을 수 있습니다. 1장당 20MB, 한 번에 200장까지 올릴 수 있습니다.'),
    // 편집대행 (메인 편집대행 구획의 두 유형·수정 2회와 같은 내용. 요금·시안 기간은 프로토타입 기준 — TODO: 실서비스 운영 정책으로 교체)
    I('agency', '편집대행은 어떤 서비스인가요?', '편집할 시간이 없을 때 사진만 보내 주시면 스탑북이 대신 편집해 드리는 서비스입니다.\n· 초안 완성형: 스탑북이 사진을 자동 배치한 초안을 만들어 드리면, 편집기에서 직접 마무리해서 주문합니다.\n· 완전 대행형: 사진과 편집 요청을 접수하면 편집부터 제작까지 디자이너가 직접 맡습니다. 시안을 확인하고 2회까지 수정을 요청할 수 있습니다.\n메인 화면의 편집대행 > [편집대행 신청하기]에서 신청할 수 있습니다.', true),
    I('agency', '초안 완성형과 완전 대행형은 어떻게 다른가요?', '초안 완성형은 사진 선별과 자동 배치까지만 스탑북이 대신하고, 문구·사진 순서 같은 세부 편집은 편집기에서 직접 다듬어 주문하는 방식입니다. 간단한 구성에 알맞고 비용이 낮습니다.\n완전 대행형은 디자이너가 편집부터 제작까지 모두 맡습니다. 시안 확인 후 2회까지 수정을 요청할 수 있고, 시안을 확정하면 바로 제작에 들어갑니다. 완성도 높은 결과물이 필요할 때 추천합니다.'),
    I('agency', '편집대행은 어떻게 신청하나요?', '1. 메인 화면의 편집대행 > [편집대행 신청하기]에서 상품(포토북·캘린더 등)과 유형(초안 완성형·완전 대행형)을 고릅니다.\n2. 사진을 올리고 꼭 넣을 사진·순서·문구 등 요청 사항을 적어 접수합니다.\n3. 접수 확인 후 디자이너가 시안을 보내 드립니다. 초안 완성형은 초안이 보관함에 들어오고, 완전 대행형은 시안 확인 → 수정 요청(2회) → 확정 → 제작 순서로 진행됩니다.\n진행 상황은 마이페이지 > 주문내역에서 확인할 수 있습니다.'),
    I('agency', '시안은 언제 받고, 수정은 몇 번까지 할 수 있나요?', '접수 확인 후 영업일 3~5일 안에 첫 시안을 보내 드립니다(사진 수·요청 내용에 따라 달라질 수 있습니다).\n완전 대행형은 시안 확인 후 2회까지 수정을 요청할 수 있으며, 3회부터는 추가 비용이 발생합니다. 시안을 확정하면 일반 주문과 같은 제작 기간(포토북 3~4영업일)이 적용됩니다.\n초안 완성형은 초안을 편집기에서 직접 수정하므로 횟수 제한이 없습니다.'),
    I('agency', '사진은 어떻게 보내나요? 몇 장까지 가능한가요?', '신청 화면에서 사진을 바로 올릴 수 있습니다. 1장당 20MB, 한 번에 200장까지 올릴 수 있고, 상품의 페이지 수에 맞춰 디자이너가 사진을 골라 배치합니다.\n꼭 넣어야 하는 사진은 파일 이름 앞에 번호를 붙이거나 요청 사항에 적어 주세요. 해상도가 낮은 사진(가로 2,480px 미만)은 작게 배치되거나 제외될 수 있습니다.'),
    I('agency', '편집대행 비용과 취소·환불은 어떻게 되나요?', '편집대행 비용은 상품 가격에 유형별 대행 비용이 더해지며, 신청 화면에서 상품·페이지 수를 고르면 바로 확인할 수 있습니다.\n시안 작업이 시작되기 전에는 전액 취소할 수 있고, 시안을 받은 뒤에는 대행 비용을 제외한 금액이 환불됩니다. 시안 확정 후 제작이 시작되면 맞춤 제작 상품이라 취소가 어렵습니다.'),
    I('order', '배송비는 얼마인가요?', '기본 배송비는 3,000원이며, 상품 금액(할인 후) 40,000원 이상이면 무료입니다. 제주·도서산간 지역은 3,000원이 추가됩니다.\n단체 회원은 구분에 따라 배송비가 무료로 적용될 수 있습니다.', true),
    I('order', '마일리지 사용에 제한이 있나요?', '마일리지는 1,000P 이상부터 1P 단위로 사용할 수 있으며, 주문 금액의 50%까지 사용할 수 있습니다.\n적립된 마일리지는 적립일로부터 1년간 유효합니다.'),
    I('order', '무통장입금은 어떻게 하나요?', '주문서에서 무통장입금을 선택하면 가상계좌가 발급됩니다. 주문 후 24시간 안에 입금해 주세요. 기한이 지나면 주문이 자동 취소됩니다.\n가상계좌로 입금하므로 통장사본은 발급되지 않으며, 입금 확인 후 현금영수증·세금계산서를 발급받을 수 있습니다.'),
    I('order', '세금계산서·현금영수증을 받을 수 있나요?', '결제 단계에서 현금성 결제(무통장입금·계좌이체)를 선택하면 현금영수증(소득공제/지출증빙) 또는 세금계산서를 신청할 수 있습니다.\n결제 후에는 고객센터 > 1:1 문의 또는 주문 상세의 서류 발급 신청에서 요청해 주세요. 세금계산서는 사업자등록증 첨부가 필요합니다.'),
    I('order', '견적서·거래명세서를 받고 싶어요.', '주문서와 주문 상세에서 견적서·거래명세서를 바로 내려받을 수 있습니다. 기관 양식이나 직인 날인본이 필요하면 1:1 문의로 신청해 주세요.'),
    I('order', '주문 후 배송지를 바꿀 수 있나요?', '제작 시작 전(주문완료 상태)까지는 마이페이지 > 주문내역에서 배송지를 바꿀 수 있습니다. 제작중 이후에는 고객센터로 연락해 주세요.'),
    I('order', '쿠폰은 어떻게 쓰나요?', '주문서의 할인 영역에서 보유 쿠폰을 선택하면 적용됩니다. 쿠폰은 주문 1건에 1장만 사용할 수 있고, 마일리지와 함께 쓸 수 있습니다. 쿠폰별 사용 조건(최소 주문 금액·대상 상품)은 쿠폰 상세에서 확인해 주세요.'),
    I('make', '제작 기간이 어떻게 되나요?', '결제 확인 후 포토북은 3~4영업일, 캘린더·액자는 2~3영업일, 팬시·굿즈는 4~5영업일 안에 제작이 끝나고 택배로 발송됩니다(배송 1~2일).\n주문량이 많은 시즌(연말·졸업)에는 1~2일 더 걸릴 수 있습니다.', true),
    I('make', '주문을 취소하고 싶어요.', '제작 시작 전(입금대기·주문완료)에는 마이페이지 > 주문내역에서 바로 취소할 수 있습니다. 제작중 이후에는 개인 맞춤 제작 상품이라 취소가 어렵습니다.\n취소 요청은 접수 후 영업일 1일 안에 처리되며, 환불은 결제 수단에 따라 3~7일 걸립니다.', true),
    I('make', '인쇄 불량이면 어떻게 하나요?', '수령 후 7일 안에 불량 부분 사진과 함께 1:1 문의(교환/반품)로 접수해 주세요. 확인 후 무상 재제작 또는 환불해 드립니다.\n화면과 인쇄물의 색감 차이(모니터 설정·용지 특성에 따른 차이)는 불량에 해당하지 않습니다.'),
    I('make', '배송 조회는 어디서 하나요?', '마이페이지 > 주문내역의 [배송 조회]에서 송장번호와 배송 상태를 확인할 수 있습니다. 발송 시 알림톡으로 송장번호를 보내 드립니다.'),
    I('make', '교환·반품 기간은 어떻게 되나요?', '맞춤 제작 상품은 단순 변심에 의한 교환·반품이 어렵습니다. 제품 불량·오배송은 수령 후 7일 이내 접수하면 무상으로 처리해 드립니다.'),
    I('make', '해외 배송도 되나요?', '현재 국내 배송만 가능합니다. 해외 발송이 필요하면 국내 주소로 받은 뒤 별도 발송해 주시거나, 제휴문의로 대량 해외 발송을 문의해 주세요.'),
    I('event', '리뷰 작성 시 주의해야 할 사항이 있나요?', '배송완료 후 30일 안에 작성한 리뷰에 마일리지를 드립니다(일반 300P, 포토 500P). 상품과 무관한 내용·타인 사진·광고성 내용은 삭제되고 적립이 취소될 수 있습니다.', true),
    I('event', '친구 추천 적립은 어떻게 받나요?', '마이페이지의 추천 코드를 친구가 가입할 때 입력하면 친구의 첫 주문 완료 후 두 분 모두에게 2,000P를 드립니다.'),
    I('etc', '고객센터 운영 시간이 어떻게 되나요?', '고객행복센터 080-860-1119 · 평일 10:00~17:00 (점심 12:00~13:00), 주말·공휴일은 쉽니다. 운영 시간 외에는 1:1 문의를 남겨 주시면 다음 영업일에 순서대로 답변드립니다.'),
    I('etc', '기업·단체 제휴는 어디로 문의하나요?', '고객센터 > 제휴문의에서 회사명·담당자·연락처와 제휴 내용을 남겨 주세요. 담당자가 검토 후 영업일 2~3일 안에 전화나 이메일로 연락드립니다.')
  ];

  const valid = d => d && Array.isArray(d.cats) && Array.isArray(d.items);
  const read = key => { try { const d = JSON.parse(localStorage.getItem(key)); return valid(d) ? d : null; } catch (e) { return null; } };
  let data = read(KEY);
  // v1 저장본(관리자가 고친 구분·질문·조회수)이 있으면 그대로 옮기고, '편집대행' 구분과 그 샘플만 더함 (옛 '편집메이트' 샘플 질문은 새 샘플로 대체)
  const old = !data && read('stopbook.faq.v1');
  if (old) {
    data = old;
    if (!data.cats.some(c => c.code === 'agency')) {
      const after = (data.cats.find(c => c.code === 'edit') || { order: 0 }).order;
      data.cats.forEach(c => { if (c.order > after) c.order += 1; });
      data.cats.push({ code: 'agency', name: '편집대행', order: after + 1, use: true });
    }
    data.items = data.items.filter(it => !(it.sample && it.q === '편집메이트(편집 대행)는 어떤 서비스인가요?'));
    let order = data.items.reduce((m, it) => Math.max(m, it.order), 0);
    ITEMS.filter(it => it.cat === 'agency' && !data.items.some(x => x.q === it.q)).forEach(it => data.items.push(Object.assign({}, it, { order: ++order })));
    try { localStorage.removeItem('stopbook.faq.v1'); } catch (e) { /* 무시 */ }
  }
  if (!data) data = { cats: JSON.parse(JSON.stringify(CATS)), items: JSON.parse(JSON.stringify(ITEMS)) };
  // 2026-10-27 배송비 정책 변경(무료배송 40,000원 이상): 이미 저장된 샘플 답변도 맞춤 (KEY 버전은 그대로)
  (function () { const it = data.items.find(x => x.sample && x.q === '배송비는 얼마인가요?'); if (it && it.a.includes('50,000원 이상')) { it.a = it.a.replace('50,000원 이상', '40,000원 이상'); try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 무시 */ } } })();
  if (old) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 무시 */ } }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } };

  const byOrder = (a, b) => a.order - b.order;
  const cats = (useOnly) => data.cats.filter(c => !useOnly || c.use).slice().sort(byOrder);
  const catOf = code => data.cats.find(c => c.code === code) || null;
  const catName = code => (catOf(code) || {}).name || '';
  // 질문 목록. opts = { cat(구분 코드 | 'best'), q(검색어: 질문·답변), useOnly(쇼핑몰: 노출 질문·노출 구분만) }
  function items(opts = {}) {
    const kw = clean(opts.q).toLowerCase();
    return data.items.filter(it => (!opts.useOnly || (it.use && (catOf(it.cat) || {}).use))
      && (!opts.cat || (opts.cat === 'best' ? it.best : it.cat === opts.cat))
      && (!kw || it.q.toLowerCase().includes(kw) || it.a.toLowerCase().includes(kw)))
      .slice().sort((a, b) => (opts.cat === 'best' ? 0 : (catOf(a.cat) || { order: 99 }).order - (catOf(b.cat) || { order: 99 }).order) || a.order - b.order);
  }
  const find = id => data.items.find(it => it.id === id) || null;
  const countOf = (code, useOnly) => data.items.filter(it => (code === 'best' ? it.best : it.cat === code) && (!useOnly || it.use)).length;

  // 구분 등록·수정. x = { code?, name, use }. 반환: 오류 문구 또는 ''
  function saveCat(x, by) {
    const name = clean(x.name);
    if (!name) return '구분명을 입력해 주세요.';
    if (name.length > CAT_MAX) return `구분명은 ${CAT_MAX}자 이내로 입력해 주세요.`;
    if (data.cats.some(c => c.name === name && c.code !== x.code)) return '이미 등록된 구분명입니다.';
    const cur = x.code && catOf(x.code);
    if (cur) Object.assign(cur, { name, use: x.use !== false });
    else data.cats.push({ code: `c${Date.now().toString(36)}`, name, use: x.use !== false, order: data.cats.reduce((m, c) => Math.max(m, c.order), 0) + 1 });
    save();
    return '';
  }
  function deleteCat(code) {
    const n = countOf(code);
    if (n) return `이 구분에 질문 ${n}개가 있습니다. 질문을 다른 구분으로 옮기거나 삭제한 뒤 지워 주세요.`;
    data.cats = data.cats.filter(c => c.code !== code);
    save();
    return '';
  }
  // 순서 이동 (dir: -1 위 / 1 아래). 같은 목록 안에서 이웃과 order를 바꿈
  function moveCat(code, dir) {
    const list = cats(); const i = list.findIndex(c => c.code === code), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return false;
    [list[i].order, list[j].order] = [list[j].order, list[i].order];
    return save();
  }
  // 질문 등록·수정. x = { id?, cat, q, a, best, use }. 반환: 오류 문구 또는 ''
  function saveItem(x, by) {
    const q = clean(x.q), a = String(x.a || '').trim();
    if (!catOf(x.cat)) return '구분을 선택해 주세요.';
    if (!q) return '질문을 입력해 주세요.';
    if (q.length > Q_MAX) return `질문은 ${Q_MAX}자 이내로 입력해 주세요.`;
    if (!a) return '답변을 입력해 주세요.';
    if (a.length > A_MAX) return `답변은 ${A_MAX}자 이내로 입력해 주세요.`;
    if (data.items.some(it => it.q === q && it.id !== x.id)) return '같은 질문이 이미 등록되어 있습니다.';
    const cur = x.id && find(x.id);
    const fields = { cat: x.cat, q, a, best: !!x.best, use: x.use !== false, updatedAt: nowText(), updatedBy: by || '관리자' };
    if (cur) Object.assign(cur, fields);
    else data.items.push(Object.assign({ id: `f${Date.now().toString(36)}`, order: data.items.reduce((m, it) => Math.max(m, it.order), 0) + 1, views: 0, createdAt: nowText(), sample: false }, fields));
    save();
    return '';
  }
  function deleteItem(id) { data.items = data.items.filter(it => it.id !== id); return save(); }
  function moveItem(id, dir) {
    const it = find(id); if (!it) return false;
    const list = items({ cat: it.cat }); const i = list.findIndex(x => x.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return false;
    [list[i].order, list[j].order] = [list[j].order, list[i].order];
    return save();
  }
  // 쇼핑몰에서 질문을 펼치면 조회수 +1
  function addView(id) { const it = find(id); if (!it) return; it.views = (it.views || 0) + 1; save(); }
  // 답변 표시용 HTML (줄바꿈 → <br>, 태그는 이스케이프)
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const answerHtml = a => esc(a).replace(/\n/g, '<br>');

  window.FaqStore = { Q_MAX, A_MAX, CAT_MAX, cats, catOf, catName, items, find, countOf, saveCat, deleteCat, moveCat, saveItem, deleteItem, moveItem, addView, answerHtml,
    total: () => data.items.length };
})();
