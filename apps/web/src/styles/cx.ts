// 클래스명 합성 — falsy를 걸러 공백으로 잇는다. recipe 결과 + 사용처 className을 합칠 때 쓴다.
export function cx(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(' ');
}
