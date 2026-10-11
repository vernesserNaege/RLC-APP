import { useParams } from "react-router-dom";
import { getModules, mediaUrl } from "../../api";
import AsyncView from "../../components/AsyncView";
import Layout from "../../components/Layout";
import NavButton from "../../components/NavButton";
import StatusScreen from "../../components/StatusScreen";
import { useFetch } from "../../hooks/useFetch";
import { isLevel, levelTitle } from "../../lib/levels";
import type { Level } from "../../types";

// Checks the level in the URL first, so an invalid level never reaches the server.
export default function ModuleList() {
  const { level } = useParams();
  if (!isLevel(level)) return <StatusScreen title="Level Not Found" />;
  return <LevelModules level={level} />;
}

function LevelModules({ level }: { level: Level }) {
  const state = useFetch(() => getModules(level), level);
  const title = levelTitle(level);

  return (
    <AsyncView state={state} what="modules">
      {(modules) => (
        <Layout
          showHome
          subtitle={`${title} Modules`}
          className="home-container"
        >
          <section className="welcome-section">
            <h2>{title} Modules</h2>
            <p>Choose a learning module to begin.</p>
          </section>

          {modules.length === 0 ? (
            <div className="empty-state">
              <h3>No modules available</h3>
              <p>There are currently no modules available for this level.</p>
            </div>
          ) : (
            <section className="module-grid">
              {modules.map((module) => (
                <article className="module-card" key={module.id}>
                  {module.coverImageUrl && (
                    <img
                      className="module-card-cover"
                      src={mediaUrl(module.coverImageUrl)}
                      alt=""
                    />
                  )}
                  <div className="module-card-content">
                    <span className="module-level">{title}</span>
                    <h3>{module.title}</h3>
                    <p>{module.shortDescription}</p>
                  </div>
                  <NavButton
                    to={`/module/${module.id}`}
                    className="module-button"
                  >
                    View Module
                  </NavButton>
                </article>
              ))}
            </section>
          )}

          <div style={{ textAlign: "center", marginTop: "35px" }}>
            <NavButton to="/">← Back to Home</NavButton>
          </div>
        </Layout>
      )}
    </AsyncView>
  );
}
