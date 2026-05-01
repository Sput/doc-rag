export default function DashboardPage() {
  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="stack-lg">
          <h1 className="h1">Dashboard</h1>
          <p className="p">You are signed in. This is a placeholder page.</p>
          <form action="/auth/signout" method="post">
            <button className="btn btn--primary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
