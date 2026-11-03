'use client';

import { useContext, useState, type CSSProperties } from 'react';
import { OWNER_LOGIN } from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import { ApolloError, useMutation } from '@apollo/client';
import {
  isAllowedWebPanelRole,
  persistUserSession,
} from '@/lib/utils/methods/auth';
import { useUserContext } from '@/lib/hooks/useUser';
import { DEFAULT_ROUTES } from '@/lib/utils/constants/routes';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const JEDZ_COLOR = '#00A8FF';
const TO_COLOR = '#00E676';
const PAGE = '#121212';
const SURFACE = '#1C1C1E';
const MUTED = '#8E8E93';
const BORDER = '#3A3A3C';
const ERROR = '#FF453A';

const fieldBase: CSSProperties = {
  width: '100%',
  height: 56,
  borderRadius: 12,
  border: `1.5px solid ${BORDER}`,
  backgroundColor: PAGE,
  color: '#fff',
  fontSize: 16,
  padding: '0 16px',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function LoginEmailPasswordMain() {
  const { showToast } = useContext(ToastContext);
  const { setUser } = useUserContext();
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [ownerLoginMutation] = useMutation(OWNER_LOGIN);

  const handleLogin = async () => {
    const login = email.trim();
    if (!login || !password) {
      setFieldError('Wpisz login i hasło');
      return;
    }

    setFieldError(null);
    setSubmitting(true);

    try {
      const response = await ownerLoginMutation({
        variables: {
          email: login,
          password,
        },
      });

      const ownerLogin = response.data?.ownerLogin;
      if (!ownerLogin?.token || !ownerLogin?.userType) {
        throw new Error('Unable to load session');
      }

      // Rider / customer apps use the same API login — block them from this UI.
      if (!isAllowedWebPanelRole(ownerLogin.userType)) {
        throw new Error(
          'To konto nie ma dostępu do panelu administracyjnego'
        );
      }

      persistUserSession(ownerLogin);
      setUser(ownerLogin);

      const destination =
        DEFAULT_ROUTES[ownerLogin.userType as keyof typeof DEFAULT_ROUTES] ??
        '/authentication/login';

      showToast({
        type: 'success',
        title: t('LogintoEnatega'),
        message: t('LoginSuccess'),
      });

      window.location.assign(destination);
    } catch (error) {
      const apolloError = error as ApolloError;
      const message =
        apolloError?.graphQLErrors?.[0]?.message ??
        apolloError?.networkError?.message ??
        t('LoginFailed');

      showToast({
        type: 'error',
        title: t('LogintoEnatega'),
        message,
      });
      setFieldError(message);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center px-4 py-10"
      style={{ backgroundColor: PAGE }}
    >
      <div className="flex w-full max-w-[560px] flex-col items-center">
        <div className="mb-10 flex flex-col items-center text-center">
          <div
            className="mb-6 font-black tracking-tight"
            style={{ fontSize: 'clamp(4.5rem, 12vw, 7rem)', lineHeight: 1 }}
          >
            <span style={{ color: JEDZ_COLOR }}>Jedz</span>
            <span style={{ color: TO_COLOR }}>To</span>
          </div>
          <h1 className="max-w-[420px] text-xl font-semibold leading-snug text-white sm:text-2xl">
            Witaj w panelu zarządzania restauracją
          </h1>
        </div>

        <div
          className="w-full rounded-2xl border p-8 sm:p-10"
          style={{
            backgroundColor: SURFACE,
            borderColor: '#2C2C2E',
          }}
        >
          <div className="mb-8 text-center">
            <p className="text-base leading-relaxed" style={{ color: MUTED }}>
              Aby kontynuować wpisz swoje dane poniżej
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="login-email"
                className="text-sm font-medium"
                style={{ color: MUTED }}
              >
                Login
              </label>
              <input
                id="login-email"
                name="email"
                type="text"
                autoComplete="username"
                maxLength={80}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleLogin();
                }}
                placeholder=""
                style={fieldBase}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="login-password"
                className="text-sm font-medium"
                style={{ color: MUTED }}
              >
                {t('Password')}
              </label>
              <div
                className="flex items-stretch overflow-hidden"
                style={{
                  height: 56,
                  borderRadius: 12,
                  border: `1.5px solid ${BORDER}`,
                  backgroundColor: PAGE,
                }}
              >
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  maxLength={64}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleLogin();
                  }}
                  placeholder=""
                  spellCheck={false}
                  className="login-password-input min-w-0 flex-1"
                  style={{
                    height: '100%',
                    border: 0,
                    borderRadius: 0,
                    backgroundColor: 'transparent',
                    color: '#fff',
                    fontSize: 16,
                    padding: '0 16px',
                    outline: 'none',
                    boxShadow: 'none',
                  }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="flex w-14 shrink-0 cursor-pointer items-center justify-center"
                  style={{
                    color: MUTED,
                    background: 'transparent',
                    border: 0,
                    borderLeft: `1px solid ${BORDER}`,
                  }}
                >
                  <FontAwesomeIcon
                    icon={showPassword ? faEyeSlash : faEye}
                    style={{ fontSize: 18 }}
                  />
                </button>
              </div>
            </div>

            {fieldError ? (
              <p className="text-center text-sm" style={{ color: ERROR }}>
                {fieldError}
              </p>
            ) : null}

            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleLogin()}
              className="mt-3 h-14 w-full cursor-pointer rounded-xl border-0 text-lg font-bold text-white disabled:cursor-wait disabled:opacity-70"
              style={{ backgroundColor: JEDZ_COLOR }}
            >
              {submitting ? 'Logowanie…' : 'Zaloguj się'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
