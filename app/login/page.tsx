type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params?.error || null;

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 420 }}>
        <div className="stack-lg">
          <h1 className="h1">Sign in</h1>
          <p className="p">
            Thank you for visiting my app. Email me at paulknick at gmail dot com for sign-in
            credentials.
          </p>
          <form className="stack" action="/auth/signin" method="post" autoComplete="off">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="input"
                autoComplete="off"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                autoComplete="new-password"
                required
              />
            </div>
            {error && (
              <p className="p" style={{ color: 'var(--c-danger)' }}>
                {error}
              </p>
            )}
            <button className="btn btn--primary" type="submit">
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
