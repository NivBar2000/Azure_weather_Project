function App() {
  return (
    <main className="page-shell">
      <section className="weather-card" aria-labelledby="page-title">
        <div className="weather-icon" aria-hidden="true">
          <span className="sun" />
          <span className="cloud" />
        </div>
        <p className="eyebrow">Weather, made clear</p>
        <h1 id="page-title">Azure Weather</h1>
        <p className="description">
          A focused weather application that will display clear, dependable
          forecasts for the places that matter to you.
        </p>
        <div className="status" role="status">
          <span className="status-dot" />
          Initial project foundation
        </div>
      </section>
    </main>
  );
}

export default App;
