export default function Home() {
  return (
    <main className="main">
      <div className="container">
        <h1 className="title">
          Welcome to <span className="highlight">Next.js!</span>
        </h1>
        <p className="description">
          Get started by editing <code className="code">app/page.tsx</code>
        </p>
        <div className="grid">
          <div className="card">
            <h2>Documentation &rarr;</h2>
            <p>Find in-depth information about Next.js features and API.</p>
          </div>
          <div className="card">
            <h2>Learn &rarr;</h2>
            <p>Learn about Next.js in an interactive course with quizzes!</p>
          </div>
          <div className="card">
            <h2>Examples &rarr;</h2>
            <p>Discover and deploy boilerplate example Next.js projects.</p>
          </div>
          <div className="card">
            <h2>Deploy &rarr;</h2>
            <p>
              Instantly deploy your Next.js site to a shareable URL with Vercel.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

