// Panda의 cx 대체 — falsy를 걸러 클래스명을 공백으로 합친다.
export function cx(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(' ');
}
