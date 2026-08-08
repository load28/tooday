// CSR 웹을 실제 브라우저로 구동해 스펙대로 도는지 확인한다.
// 회원가입 → 오늘 화면 → 태스크 생성 → 완료 토글 → 프로젝트 → 설정/로그아웃.
const { chromium } = require('playwright');
const fs = require('node:fs');

const WEB = process.env.WEB || 'http://localhost:8080';
const SHOTS = process.env.SHOTS || 'shots';
const CHROMIUM = process.env.CHROMIUM;

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });

  const browser = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });

  const step = async (name, fn) => {
    try {
      await fn();
      console.log(`PASS  ${name}`);
    } catch (e) {
      console.log(`FAIL  ${name}: ${e.message}`);
      await page.screenshot({ path: `${SHOTS}/fail-${name.replace(/\W+/g, '-')}.png` });
      throw e;
    }
  };

  const email = `e2e-${Date.now()}@tooday.app`;

  await step('앱이 로드되고 익명은 로그인으로 리다이렉트된다', async () => {
    await page.goto(WEB, { waitUntil: 'networkidle' });
    await page.waitForURL('**/login', { timeout: 15000 });
    await page.getByRole('heading', { name: '로그인' }).waitFor({ timeout: 10000 });
    await page.screenshot({ path: `${SHOTS}/01-login.png` });
  });

  await step('회원가입 화면으로 이동한다', async () => {
    await page.getByRole('button', { name: '가입하기' }).click();
    await page.waitForURL('**/signup');
    await page.getByRole('heading', { name: '회원가입' }).waitFor();
  });

  await step('짧은 비밀번호는 화면 소유 문구로 막힌다', async () => {
    await page.getByLabel('이름').fill('E2E 테스터');
    await page.getByLabel('이메일').fill(email);
    await page.getByLabel('비밀번호').fill('short');
    await page.getByRole('button', { name: '가입하기' }).click();
    await page.getByText('비밀번호는 8자 이상 입력해 주세요.').waitFor({ timeout: 5000 });
    await page.screenshot({ path: `${SHOTS}/02-signup-validation.png` });
  });

  await step('가입하면 오늘 화면으로 들어간다', async () => {
    await page.getByLabel('비밀번호').fill('password123');
    await page.getByRole('button', { name: '가입하기' }).click();
    await page.waitForURL('**/today', { timeout: 15000 });
    await page.getByText('할 일').first().waitFor();
    await page.screenshot({ path: `${SHOTS}/03-today-empty.png` });
  });

  await step('빈 상태 문구가 보인다', async () => {
    await page.getByText('이 날에는 일정이 없어요').waitFor({ timeout: 10000 });
  });

  await step('태스크를 만들면 오늘 목록에 뜬다', async () => {
    await page.getByRole('button', { name: '태스크 추가' }).click();
    await page.waitForURL('**/tasks/new');
    await page.getByPlaceholder('무엇을 할까요?').fill('러스트 CSR 확인');
    await page.screenshot({ path: `${SHOTS}/04-task-new.png` });
    await page.getByRole('button', { name: '만들기' }).click();
    await page.waitForURL('**/today', { timeout: 15000 });
    await page.getByText('러스트 CSR 확인').waitFor({ timeout: 10000 });
    await page.screenshot({ path: `${SHOTS}/05-today-with-task.png` });
  });

  await step('완료 토글이 낙관적으로 반영된다', async () => {
    const remainingBefore = await page.getByText('1개').count();
    if (remainingBefore === 0) throw new Error('남은 개수 1개가 안 보인다');
    await page.getByRole('button', { name: '완료 토글' }).first().click();
    await page.getByText('0개').waitFor({ timeout: 5000 });
    await page.screenshot({ path: `${SHOTS}/06-toggled-done.png` });
  });

  await step('태스크 상세로 들어가 제목이 보인다', async () => {
    await page.getByText('러스트 CSR 확인').click();
    await page.waitForURL('**/tasks/**', { timeout: 10000 });
    await page.getByRole('heading', { name: '태스크' }).waitFor();
    const value = await page.getByLabel('태스크').inputValue();
    if (value !== '러스트 CSR 확인') throw new Error(`제목 초안이 다르다: ${value}`);
    await page.screenshot({ path: `${SHOTS}/07-task-detail.png` });
  });

  await step('프로젝트 탭에서 프로젝트를 만든다', async () => {
    await page.getByRole('button', { name: '뒤로' }).click();
    await page.waitForURL('**/today');
    await page.getByRole('button', { name: '프로젝트' }).click();
    await page.waitForURL('**/projects', { timeout: 10000 });
    await page.getByText('아직 프로젝트가 없어요').waitFor({ timeout: 10000 });
    await page.getByRole('button', { name: '프로젝트 추가' }).click();
    await page.getByPlaceholder('프로젝트 이름').fill('TooDay 러스트');
    await page.getByRole('radio', { name: '민트' }).click();
    await page.screenshot({ path: `${SHOTS}/08-project-sheet.png` });
    await page.getByRole('button', { name: '만들기' }).click();
    await page.getByText('TooDay 러스트').waitFor({ timeout: 10000 });
    await page.getByText('0/0 완료').waitFor({ timeout: 5000 });
    await page.screenshot({ path: `${SHOTS}/09-projects.png` });
  });

  await step('프로젝트 상세 보드가 상태별로 나뉜다', async () => {
    await page.getByText('TooDay 러스트').click();
    await page.waitForURL('**/projects/**', { timeout: 10000 });
    await page.getByText('이 상태의 태스크가 없어요').waitFor({ timeout: 10000 });
    await page.screenshot({ path: `${SHOTS}/10-project-detail.png` });
  });

  await step('설정에서 로그아웃하면 로그인으로 돌아간다', async () => {
    await page.getByRole('button', { name: '오늘' }).click();
    await page.waitForURL('**/today', { timeout: 10000 });
    await page.getByRole('button', { name: '설정' }).click();
    await page.waitForURL('**/settings', { timeout: 10000 });
    await page.getByText(email).waitFor({ timeout: 10000 });
    await page.screenshot({ path: `${SHOTS}/11-settings.png` });
    await page.getByRole('button', { name: '로그아웃', exact: true }).click();
    await page.getByText('로그아웃할까요?').waitFor({ timeout: 5000 });
    await page.screenshot({ path: `${SHOTS}/12-logout-sheet.png` });
    await page.getByRole('button', { name: '로그아웃', exact: true }).last().click();
    await page.waitForURL('**/login', { timeout: 15000 });
  });

  await step('로그아웃 뒤 보호 경로는 로그인으로 튕긴다', async () => {
    await page.goto(`${WEB}/today`, { waitUntil: 'networkidle' });
    await page.waitForURL('**/login', { timeout: 15000 });
  });

  await step('다시 로그인하면 데이터가 남아 있다', async () => {
    await page.getByLabel('이메일').fill(email);
    await page.getByLabel('비밀번호').fill('password123');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL('**/today', { timeout: 15000 });
    await page.getByText('러스트 CSR 확인').waitFor({ timeout: 10000 });
    await page.screenshot({ path: `${SHOTS}/13-relogin.png` });
  });

  await browser.close();

  if (errors.length) {
    console.log(`\n브라우저 에러 ${errors.length}건:`);
    for (const e of errors.slice(0, 20)) console.log('  ' + e);
    process.exit(1);
  }
  console.log('\n모든 단계 통과, 브라우저 에러 없음');
}

main().catch((e) => {
  console.error('\n중단:', e.message);
  process.exit(1);
});
