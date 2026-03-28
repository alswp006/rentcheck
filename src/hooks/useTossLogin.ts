import { useState, useEffect, useCallback } from 'react';

// 토스 앱 환경 감지
const isTossApp = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).Toss;

interface TossUser {
  id: string;
  name: string;
}

export function useTossLogin() {
  const [user, setUser] = useState<TossUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async () => {
    if (!isTossApp) {
      // 샌드박스/로컬 개발 환경: 테스트 유저
      setUser({ id: 'dev-user-1', name: '테스트 유저' });
      setIsLoggedIn(true);
      return;
    }
    setLoading(true);
    try {
      // @apps-in-toss/web-framework SDK 로그인
      const toss = (window as unknown as Record<string, { login: () => Promise<TossUser> }>).Toss;
      const result = await toss.login();
      setUser(result);
      setIsLoggedIn(true);
    } catch (e) {
      console.error('Toss login failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsLoggedIn(false);
  }, []);

  // 앱 시작 시 자동 로그인 시도
  useEffect(() => {
    if (isTossApp) login();
  }, [login]);

  return { user, isLoggedIn, loading, login, logout };
}
