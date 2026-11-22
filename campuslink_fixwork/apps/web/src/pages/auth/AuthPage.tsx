import { FormEvent, InputHTMLAttributes, useState } from 'react';
import type { ApiUser } from '../../services/api';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { launchUniversity } from '../../data/universities';
import { optimizeImage } from '../../services/imageProcessing';
import { loadLocal } from '../../services/localStore';
import {
  ApiError,
  login,
  register,
}  from '../../services/api';

export type AuthMode =
  | 'Login'
  | 'Register'
  | 'Forgot password'
  | 'Reset password'
  | 'Verify email';

type Registration = {
  name: string;
  username: string;
  email: string;
  password: string;
  confirm: string;
  university: string;
  campus: string;
  course: string;
  year: string;
  bio: string;
  interests: string;
  skills: string;
  picture?: string;
  photoCrop?: string;
};

const emptyRegistration: Registration = {
  name: '',
  username: '',
  email: '',
  password: '',
  confirm: '',
  university: launchUniversity.name,
  campus: launchUniversity.campuses[0],
  course: '',
  year: '',
  bio: '',
  interests: '',
  skills: '',
  photoCrop: '50',
};

function splitCommaValues(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean),
    ),
  ];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

export function AuthPage({
  mode,
  onMode,
  onSuccess,
}: {
  mode: AuthMode;
  onMode: (mode: AuthMode) => void;
  onSuccess: (
    user: ApiUser,
    registration?: Omit<Registration, 'password' | 'confirm'>,
  ) => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyRegistration);
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('');

  const isRegister = mode === 'Register';

  const passwordStrength =
    form.password.length >= 12
      ? 'Strong password'
      : form.password.length >= 8
        ? 'Good password'
        : 'Use at least 8 characters';

  const change = (field: keyof Registration, value: string) =>
    setForm(current => ({ ...current, [field]: value }));

  // Local demo usernames are no longer used for authentication.
  // The real API checks username uniqueness during registration.
  const usernameAvailable = (raw: string) => {
    const name = raw.toLowerCase();

    const savedProfile = loadLocal<{ username?: string } | null>(
      'profile',
      null,
    );

    const currentName = savedProfile?.username
      ?.replace(/^@/, '')
      .toLowerCase();

    const taken = [
      'wanjiku.m',
      'amaniw',
      'kevin.o',
      'njeri.k',
      currentName,
    ].filter((value): value is string => Boolean(value));

    return !taken.includes(name);
  };

  /**
   * REAL AUTHENTICATION
   *
   * Registration:
   * 1. Create account through API.
   * 2. Authenticate using the newly created credentials.
   * 3. Keep access token in memory through api.ts.
   * 4. Pass profile to the existing application.
   *
   * Login:
   * 1. Authenticate against backend.
   * 2. Store access token in memory.
   * 3. Continue into the application.
   */
  const finishAuth = async () => {
    setLoading(true);
    setMessage('');
    setErrors({});

    try {
      if (isRegister) {
        const registrationPayload = {
          name: form.name.trim(),
          username: form.username.trim().toLowerCase(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          campus: form.campus,
          course: form.course.trim(),
          year: Number(form.year),
          bio: form.bio.trim(),
          interests: splitCommaValues(form.interests),
          skills: splitCommaValues(form.skills),
          photoUrl: form.picture || undefined,
        };

        // Create a real account in the backend.
        await register(registrationPayload);

        // Registration endpoint does not issue an access token,
        // so authenticate immediately after successful registration.
        let authenticatedUser: ApiUser;
        try {
          authenticatedUser = (await login({
            identifier: registrationPayload.email,
            password: registrationPayload.password,
          })).user;
        } catch {
          // Account creation succeeded even if login fails.
          // Allow the student to sign in manually.
          setIdentifier(registrationPayload.email);
          setMessage(
            'Your account was created successfully. Please sign in to continue.',
          );
          onMode('Login');
          setStep(1);
          return;
        }

        const {
          password: _password,
          confirm: _confirm,
          ...safeProfile
        } = form;

        // Preserve the application's existing registration callback.
        onSuccess(authenticatedUser, safeProfile);
      } else {
        // Authenticate against the real API.
        const authResult = await login({
          identifier: identifier.trim(),
          password: form.password,
        });

        onSuccess(authResult.user);
      }
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (mode === 'Login') {
      const next: Record<string, string> = {};

      if (!identifier.trim()) {
        next.identifier = 'Enter your email or username.';
      }

      if (!form.password) {
        next.password = 'Enter your password.';
      }

      setErrors(next);

      if (!Object.keys(next).length) {
        void finishAuth();
      }

      return;
    }

    if (mode === 'Forgot password') {
      setMessage(
        'Password recovery is not fully configured yet. Email delivery has not been enabled.',
      );
      return;
    }

    if (mode === 'Reset password') {
      setMessage(
        'Password reset is not yet connected to the backend.',
      );
      return;
    }

    if (mode === 'Verify email') {
      setMessage(
        'Email verification is not yet configured.',
      );
      return;
    }

    if (step === 4) {
      void finishAuth();
      return;
    }

    const next: Record<string, string> = {};

    if (step === 1) {
      if (!form.name.trim()) {
        next.name = 'Enter your full name.';
      }

      if (!/^[a-zA-Z0-9._]{3,20}$/.test(form.username)) {
        next.username =
          'Use 3–20 letters, numbers, dots or underscores.';
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        next.email = 'Enter a valid email address.';
      }

      if (form.password.length < 8) {
        next.password = 'Use at least 8 characters.';
      }

      if (form.confirm !== form.password) {
        next.confirm = 'Passwords do not match.';
      }
    }

    if (step === 2) {
      if (!form.university.trim()) {
        next.university = 'Enter your university or college.';
      }

      if (!form.campus.trim()) {
        next.campus = 'Enter your campus.';
      }

      if (!form.course.trim()) {
        next.course = 'Enter your course.';
      }

      if (!form.year) {
        next.year = 'Choose your year of study.';
      }
    }

    setErrors(next);

    if (!Object.keys(next).length) {
      setStep(current => Math.min(4, current + 1));
    }
  };

  const uploadPicture = (file?: File) => {
    if (!file) return;

    if (
      !file.type.startsWith('image/') ||
      file.size > 2_000_000
    ) {
      setErrors({
        picture: 'Choose an image smaller than 2 MB.',
      });
      return;
    }

    void optimizeImage(file, 900, 0.8)
      .then(picture => {
        change('picture', picture);
        setErrors({});
      })
      .catch(() => {
        setErrors({
          picture: 'Could not prepare that image. Try another file.',
        });
      });
  };

  const field = (
    key: keyof Registration,
    label: string,
    props: InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="auth-field" key={key}>
      {label}

      <input
        {...props}
        value={form[key] ?? ''}
        onChange={event => change(key, event.target.value)}
        aria-invalid={Boolean(errors[key])}
      />

      {errors[key] && (
        <small className="auth-error">{errors[key]}</small>
      )}
    </label>
  );

  return (
    <main className="auth-page auth-page-v2">
      <aside className="auth-art">
        <button
          className="brand auth-brand"
          onClick={() => onMode('Login')}
        >
          <span className="brand-mark">
            <Sparkles size={16} />
          </span>

          <span>
            Campus<span>Link</span>
          </span>
        </button>

        <span className="hero-kicker">
          <span />
          CONNECT. DISCOVER. TRADE. GROW.
        </span>

        <h2>
          Make more
          <br />
          of your <em>campus life.</em>
        </h2>

        <p>
          Find the conversations, events and people that make your campus feel
          like yours.
        </p>

        <div className="auth-art-note">
          <UserRound size={18} />

          <span>
            Built around student life
            <br />
            <small>University community platform</small>
          </span>
        </div>
      </aside>

      <form
        className="card auth-card auth-card-v2"
        onSubmit={handleSubmit}
        noValidate
      >
        <header className="auth-card-head">
          <div className="brand auth-mobile-brand">
            <span className="brand-mark">
              <Sparkles size={15} />
            </span>

            <span>
              Campus<span>Link</span>
            </span>
          </div>

          <p>
            {isRegister
              ? 'CREATE YOUR ACCOUNT'
              : mode === 'Login'
                ? 'WELCOME BACK'
                : 'ACCOUNT HELP'}
          </p>

          <h1>
            {isRegister
              ? step === 4
                ? 'Welcome to CampusLink'
                : 'Join your campus'
              : mode === 'Login'
                ? 'Sign in'
                : mode}
          </h1>

          <span>
            {isRegister
              ? step === 4
                ? 'Your profile is ready. Create your account to continue.'
                : `Step ${step} of 3 · ${
                    ['', 'Account', 'Campus', 'Personalize'][step]
                  }`
              : mode === 'Login'
                ? 'Sign in to continue to CampusLink.'
                : 'Complete your account recovery process.'}
          </span>
        </header>

        {isRegister && step < 4 && (
          <div className="auth-stepper" aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map(item => (
              <i
                key={item}
                className={item <= step ? 'current' : ''}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${mode}-${step}`}
            className="auth-fields"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.16 }}
          >
            {/* LOGIN */}
            {mode === 'Login' && (
              <>
                <label className="auth-field">
                  Email or username

                  <input
                    type="text"
                    value={identifier}
                    onChange={event => setIdentifier(event.target.value)}
                    autoComplete="username"
                    placeholder="you@university.ac.ke"
                    aria-invalid={Boolean(errors.identifier)}
                  />

                  {errors.identifier && (
                    <small className="auth-error">
                      {errors.identifier}
                    </small>
                  )}
                </label>

                <label className="auth-field">
                  Password

                  <span className="password-field">
                    <input
                      type={visible ? 'text' : 'password'}
                      value={form.password}
                      onChange={event =>
                        change('password', event.target.value)
                      }
                      autoComplete="current-password"
                      aria-invalid={Boolean(errors.password)}
                    />

                    <button
                      type="button"
                      aria-label={visible ? 'Hide password' : 'Show password'}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>

                  {errors.password && (
                    <small className="auth-error">
                      {errors.password}
                    </small>
                  )}
                </label>

                <label className="remember-row">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={event => setRemember(event.target.checked)}
                  />
                  Remember me
                </label>

                <button
                  className="auth-inline-link"
                  type="button"
                  onClick={() => onMode('Forgot password')}
                >
                  Forgot password?
                </button>
              </>
            )}

            {/* REGISTRATION STEP 1 */}
            {isRegister && step === 1 && (
              <>
                {field('name', 'Full name', {
                  autoComplete: 'name',
                  placeholder: 'Your name',
                })}

                <label className="auth-field">
                  Username

                  <input
                    autoComplete="username"
                    value={form.username}
                    onChange={event => {
                      const value = event.target.value;

                      change('username', value);

                      if (/^[a-zA-Z0-9._]{3,20}$/.test(value)) {
                        setUsernameStatus(
                          usernameAvailable(value)
                            ? 'Format looks good. Availability will be verified when you register.'
                            : 'This matches a local demo username. The server will perform the final check.',
                        );
                      } else {
                        setUsernameStatus(
                          'Use 3–20 letters, numbers, dots or underscores.',
                        );
                      }
                    }}
                    placeholder="e.g. student.kabianga"
                    aria-invalid={Boolean(errors.username)}
                  />

                  {usernameStatus && (
                    <small className="password-strength">
                      {usernameStatus}
                    </small>
                  )}

                  {errors.username && (
                    <small className="auth-error">
                      {errors.username}
                    </small>
                  )}
                </label>

                {field('email', 'Email address', {
                  type: 'email',
                  autoComplete: 'email',
                  placeholder: 'you@university.ac.ke',
                })}

                <label className="auth-field">
                  Password

                  <span className="password-field">
                    <input
                      type={visible ? 'text' : 'password'}
                      value={form.password}
                      onChange={event =>
                        change('password', event.target.value)
                      }
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      aria-label={visible ? 'Hide password' : 'Show password'}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>

                  <small
                    className={
                      form.password.length >= 8
                        ? 'password-strength valid'
                        : 'password-strength'
                    }
                  >
                    {passwordStrength}
                  </small>

                  {errors.password && (
                    <small className="auth-error">
                      {errors.password}
                    </small>
                  )}
                </label>

                <label className="auth-field">
                  Confirm password

                  <input
                    type={visible ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={event =>
                      change('confirm', event.target.value)
                    }
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.confirm)}
                  />

                  {errors.confirm && (
                    <small className="auth-error">
                      {errors.confirm}
                    </small>
                  )}
                </label>
              </>
            )}

            {/* REGISTRATION STEP 2 */}
            {isRegister && step === 2 && (
              <>
                <label className="auth-field">
                  University

                  <input
                    value={launchUniversity.name}
                    readOnly
                    aria-readonly="true"
                  />

                  <small>
                    CampusLink is currently for University of Kabianga students.
                  </small>
                </label>

                <label className="auth-field">
                  Campus

                  <select
                    value={form.campus}
                    onChange={event => change('campus', event.target.value)}
                    aria-invalid={Boolean(errors.campus)}
                  >
                    {launchUniversity.campuses.map(campus => (
                      <option key={campus}>{campus}</option>
                    ))}
                  </select>

                  {errors.campus && (
                    <small className="auth-error">
                      {errors.campus}
                    </small>
                  )}
                </label>

                {field('course', 'Course or program', {
                  placeholder: 'e.g. Computer Science',
                })}

                <label className="auth-field">
                  Year of study

                  <select
                    value={form.year}
                    onChange={event => change('year', event.target.value)}
                    aria-invalid={Boolean(errors.year)}
                  >
                    <option value="">Select year</option>

                    {['1', '2', '3', '4', '5', '6'].map(year => (
                      <option key={year} value={year}>
                        Year {year}
                      </option>
                    ))}
                  </select>

                  {errors.year && (
                    <small className="auth-error">
                      {errors.year}
                    </small>
                  )}
                </label>
              </>
            )}

            {/* REGISTRATION STEP 3 */}
            {isRegister && step === 3 && (
              <>
                <label className="auth-picture-upload">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={event =>
                      uploadPicture(event.target.files?.[0])
                    }
                  />

                  {form.picture ? (
                    <img
                      src={form.picture}
                      alt="Profile preview"
                      style={{
                        objectPosition: `${form.photoCrop ?? 50}% center`,
                      }}
                    />
                  ) : (
                    <span className="auth-picture-placeholder">
                      <UserRound size={21} />
                    </span>
                  )}

                  <span>
                    <b>Profile photo</b>
                    <small>
                      Optional · choose a file or use your camera · max 2 MB
                    </small>
                  </span>
                </label>

                {form.picture && (
                  <label className="auth-field">
                    Reposition photo

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={form.photoCrop ?? '50'}
                      onChange={event =>
                        change('photoCrop', event.target.value)
                      }
                      aria-label="Reposition profile photo"
                    />
                  </label>
                )}

                {errors.picture && (
                  <small className="auth-error">
                    {errors.picture}
                  </small>
                )}

                <label className="auth-field">
                  Short bio <small>Optional</small>

                  <textarea
                    value={form.bio}
                    onChange={event => change('bio', event.target.value)}
                    maxLength={180}
                    rows={3}
                    placeholder="A little about you"
                  />
                </label>

                <label className="auth-field">
                  Interests <small>Optional · comma separated</small>

                  <input
                    value={form.interests}
                    onChange={event =>
                      change('interests', event.target.value)
                    }
                    placeholder="Design, football, photography"
                  />
                </label>

                <label className="auth-field">
                  Skills <small>Optional · comma separated</small>

                  <input
                    value={form.skills}
                    onChange={event =>
                      change('skills', event.target.value)
                    }
                    placeholder="Writing, coding, teamwork"
                  />
                </label>

                <button
                  className="auth-skip"
                  type="button"
                  onClick={() => {
                    setErrors({});
                    setStep(4);
                  }}
                >
                  Skip for now
                </button>
              </>
            )}

            {/* REGISTRATION STEP 4 */}
            {isRegister && step === 4 && (
              <div className="auth-welcome">
                <span className="auth-welcome-mark">
                  <Sparkles size={24} />
                </span>

                <h2>
                  You’re in, {form.name.split(' ')[0] || 'student'}.
                </h2>

                <p>
                  Your profile is ready. Create your CampusLink account to
                  explore the feed, discover students and connect with your campus.
                </p>

                <div className="auth-completion">
                  <b>Profile setup</b>

                  <span>
                    <i />
                  </span>

                  <small>
                    {form.bio || form.picture
                      ? 'Personalized profile'
                      : 'Basic account'}
                  </small>
                </div>
              </div>
            )}

            {/* FORGOT PASSWORD */}
            {mode === 'Forgot password' && (
              <>
                {field('email', 'Email address', {
                  type: 'email',
                  autoComplete: 'email',
                  placeholder: 'you@university.ac.ke',
                })}

                <button
                  className="auth-inline-link"
                  type="button"
                  onClick={() => onMode('Reset password')}
                >
                  Open reset password preview
                </button>
              </>
            )}

            {/* RESET PASSWORD */}
            {mode === 'Reset password' && (
              <>
                <label className="auth-field">
                  New password

                  <input
                    type={visible ? 'text' : 'password'}
                    value={form.password}
                    onChange={event =>
                      change('password', event.target.value)
                    }
                    minLength={8}
                  />
                </label>

                <label className="auth-field">
                  Confirm new password

                  <input
                    type={visible ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={event =>
                      change('confirm', event.target.value)
                    }
                  />
                </label>

                <button
                  className="auth-inline-link"
                  type="button"
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? 'Hide passwords' : 'Show passwords'}
                </button>
              </>
            )}

            {/* EMAIL VERIFICATION */}
            {mode === 'Verify email' && (
              <div className="auth-welcome">
                <LockKeyhole size={22} />

                <p>
                  Email verification is not yet configured. No verification
                  email has been sent.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {message && (
          <p className="auth-message" role="alert">
            {message}
          </p>
        )}

        <div className="auth-submit-row">
          {isRegister && step > 1 && step < 4 && (
            <button
              className="outline-btn"
              type="button"
              disabled={loading}
              onClick={() => {
                setErrors({});
                setStep(current => current - 1);
              }}
            >
              <ChevronLeft size={15} />
              Back
            </button>
          )}

          <button
            className="primary-btn auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait…'
              : isRegister
                ? step === 4
                  ? 'Create account'
                  : step === 3
                    ? 'Finish profile'
                    : 'Continue'
                : mode === 'Login'
                  ? 'Sign in'
                  : 'Continue'}

            {!loading && <ChevronRight size={15} />}
          </button>
        </div>

        <p className="auth-switch">
          {mode === 'Login' ? (
            <>
              New to CampusLink?{' '}
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setErrors({});
                  setMessage('');
                  onMode('Register');
                }}
              >
                Create an account
              </button>
            </>
          ) : isRegister ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrors({});
                  setMessage('');
                  onMode('Login');
                }}
              >
                Sign in
              </button>
            </>
          ) : (
            <button type="button" onClick={() => onMode('Login')}>
              Back to sign in
            </button>
          )}
        </p>

        <small className="auth-disclaimer">
          <LockKeyhole size={12} />
          Your credentials are sent securely to CampusLink for authentication.
        </small>
      </form>
    </main>
  );
}