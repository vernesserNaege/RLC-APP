import { useState } from "react";
import { mediaUrl } from "../../api";
import AsyncView from "../../components/AsyncView";
import Layout from "../../components/Layout";
import ModelViewer from "../../components/ModelViewer";
import NavButton from "../../components/NavButton";
import StatusScreen from "../../components/StatusScreen";
import { useRouteModule } from "../../hooks/useRouteModule";
import { useToast } from "../../hooks/useToast";
import { downloadFile } from "../../lib/download";
import { levelTitle } from "../../lib/levels";
import { sketchName } from "../../lib/sketch";
import type { ModuleDetail } from "../../types";

export default function Lesson() {
  const state = useRouteModule();

  return (
    <AsyncView state={state} what="lesson">
      {(module) =>
        module.steps.length === 0 ? (
          <StatusScreen title="This module has no steps yet" />
        ) : (
          <LessonSteps key={module.id} module={module} />
        )
      }
    </AsyncView>
  );
}

// Only drawn once the module has loaded, so `module` is always available here.
function LessonSteps({ module }: { module: ModuleDetail }) {
  const [current, setCurrent] = useState(0);
  const [toast, showToast] = useToast(); // the same pop-up message the admin pages use

  const step = module.steps[current];
  const total = module.steps.length;
  const isFirst = current === 0;
  const isLast = current === total - 1;
  const percent = Math.round(((current + 1) / total) * 100);

  const copyCode = async () => {
    if (!step.code) return;
    try {
      await navigator.clipboard.writeText(step.code);
      showToast("Code copied! Paste it into Arduino IDE.");
    } catch {
      showToast(
        "Could not copy automatically. Select the code and copy it.",
        "error",
      );
    }
  };

  // On the web, "Open in Arduino IDE" downloads the code as a .ino file,
  // which Arduino IDE opens when you double-click it.
  // On the crate (Phase 2, Step 11) the same button will open Arduino IDE directly.
  const openInArduino = () => {
    if (!step.code) return;
    const name = sketchName(step.codeTitle, step.title);
    downloadFile(`${name}.ino`, step.code, "text/x-arduino");
    showToast(
      `Saved ${name}.ino to Downloads. Open it to load the code in Arduino IDE.`,
    );
  };

  return (
    <Layout showHome subtitle={module.title} className="lesson-container">
      <section className="lesson-title-section">
        <span className="module-level">{levelTitle(module.level)}</span>
        <h2>{module.title}</h2>
        <p>Follow each step carefully to complete this learning activity.</p>
      </section>

      <section className="lesson-progress-section">
        <div className="lesson-progress-text">
          <span>
            Step {current + 1} of {total}
          </span>
          <span>{percent}%</span>
        </div>
        <div className="lesson-progress-bar">
          <div
            className="lesson-progress-fill"
            style={{ width: `${percent}%` }}
          ></div>
        </div>
      </section>

      <section className="lesson-step-card">
        <div className="lesson-step-number">Step {step.number}</div>
        <h3>{step.title}</h3>

        <div className="instruction-box">
          <p>{step.instruction}</p>
        </div>

        {step.imageUrl && (
          <img
            className="step-image"
            src={mediaUrl(step.imageUrl)}
            alt={step.title}
          />
        )}
        {step.modelUrl && (
          <ModelViewer
            src={mediaUrl(step.modelUrl)}
            alt={`3D model for: ${step.title}`}
          />
        )}

        {step.type === "arduino" && (
          <section className="arduino-section">
            <div className="arduino-header">
              <h4>{step.codeTitle ?? "Arduino Program"}</h4>
              <span>Arduino IDE</span>
            </div>

            {step.code ? (
              <pre className="code-block">
                <code>{step.code}</code>
              </pre>
            ) : (
              <p>Code for this step has not been added yet.</p>
            )}

            <div className="arduino-actions">
              <button
                className="arduino-button"
                onClick={copyCode}
                disabled={!step.code}
              >
                Copy Code
              </button>
              <button
                className="arduino-button"
                onClick={openInArduino}
                disabled={!step.code}
              >
                Open in Arduino IDE
              </button>
            </div>
          </section>
        )}
      </section>

      <div className="lesson-navigation">
        {isFirst ? (
          <NavButton to={`/module/${module.id}`}>← Module</NavButton>
        ) : (
          <button
            className="lesson-back-button"
            onClick={() => setCurrent(current - 1)}
          >
            ← Back
          </button>
        )}
        <button
          className="next-button"
          onClick={() => setCurrent(current + 1)}
          disabled={isLast}
        >
          {isLast ? "Last Step" : "Next Step →"}
        </button>
      </div>
      {toast}
    </Layout>
  );
}
