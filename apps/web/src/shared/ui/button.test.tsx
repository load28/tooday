// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '@/shared/ui/button';

describe('Button', () => {
  afterEach(cleanup);

  it('평상시에는 children을 그대로 렌더하고 클릭을 전달한다', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>로그인</Button>);

    const button = screen.getByRole('button', { name: '로그인' });
    button.click();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button).not.toHaveProperty('disabled', true);
  });

  it('loading 중에는 클릭이 차단되고 포커스는 유지된다', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        로그인
      </Button>,
    );

    const button = screen.getByRole<HTMLButtonElement>('button');
    button.focus();
    button.click();

    expect(onClick).not.toHaveBeenCalled();
    // 네이티브 disabled가 아니라 aria-disabled — 포커스가 body로 튕기지 않는다
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(button);
  });

  it('loading 중에도 라벨은 DOM에 남고 accessible name에 로딩 상태가 합성된다', () => {
    render(<Button loading>로그인</Button>);

    const button = screen.getByRole('button', { name: '로그인 로딩 중' });
    expect(button.hasAttribute('data-loading')).toBe(true);
    expect(button.textContent).toContain('로그인');
  });

  it('loadingText와 spinner slot으로 로딩 표현을 교체할 수 있다', () => {
    render(
      <Button loading loadingText="저장 중…" spinner={<span data-testid="custom-spinner" />}>
        저장
      </Button>,
    );

    expect(screen.getByText('저장 중…')).toBeDefined();
    expect(screen.getByTestId('custom-spinner')).toBeDefined();
  });

  it('loading 중 submit 버튼은 폼 제출을 막는다', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" loading>
          로그인
        </Button>
      </form>,
    );

    screen.getByRole('button').click();

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
