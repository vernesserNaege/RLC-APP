import AsyncView from "../../components/AsyncView";
import Layout from "../../components/Layout";
import NavButton from "../../components/NavButton";
import { useRouteModule } from "../../hooks/useRouteModule";
import { levelTitle } from "../../lib/levels";

export default function ModuleDetails() {
  const state = useRouteModule();

  return (
    <AsyncView state={state} what="module">
      {(module) => {
        const level = levelTitle(module.level);
        const info = [
          { label: "Level", value: level },
          {
            label: "Estimated Duration",
            value: `${module.durationMinutes} minutes`,
          },
          { label: "Learning Steps", value: module.steps.length },
        ];

        return (
          <Layout
            showHome
            subtitle="Module Details"
            className="module-details-container"
          >
            <section className="module-details-header">
              <div>
                <span className="module-level">{level}</span>
                <h2>{module.title}</h2>
                <p>{module.description}</p>
              </div>
            </section>

            <section className="details-section">
              <h3>Learning Objective</h3>
              <p>{module.objective}</p>
            </section>

            <section className="details-section">
              <div className="section-heading">
                <h3>Required Components</h3>
                <span>{module.components.length} items</span>
              </div>
              <div className="component-list">
                {module.components.map((component) => (
                  <div className="component-item" key={component.id}>
                    <div className="component-information">
                      <h4>{component.name}</h4>
                      <p>Quantity: {component.quantity}</p>
                    </div>
                    <div className="compartment-badge">
                      {component.compartment}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="details-section">
              <h3>Module Information</h3>
              <div className="module-information-grid">
                {info.map((item) => (
                  <div className="information-box" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <div className="module-actions">
              <NavButton to={`/modules/${module.level}`}>
                ← Back to Modules
              </NavButton>
              <NavButton
                to={`/lesson/${module.id}`}
                className="next-button"
                disabled={module.steps.length === 0}
              >
                Start Module →
              </NavButton>
            </div>
          </Layout>
        );
      }}
    </AsyncView>
  );
}
