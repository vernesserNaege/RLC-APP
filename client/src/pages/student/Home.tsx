import Layout from "../../components/Layout";
import NavButton from "../../components/NavButton";
import { LEVELS } from "../../lib/levels";

export default function Home() {
  return (
    <Layout className="home-container">
      <section className="welcome-section">
        <h2>Welcome to the Robotics Learning Crate</h2>
        <p>
          Explore robotics lessons, build circuits, program microcontrollers,
          and complete hands-on activities.
        </p>
      </section>

      <section className="level-section">
        {LEVELS.map((level) => (
          <NavButton
            key={level.key}
            to={`/modules/${level.key}`}
            className="level-card"
          >
            <h3>{level.title}</h3>
            <p>{level.description}</p>
          </NavButton>
        ))}
      </section>
    </Layout>
  );
}
