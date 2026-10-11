import { useActionState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../api";
import NavButton from "../../components/NavButton";

interface LoginState {
  error: string;
  username: string; // kept so a wrong password doesn't clear the username too
}

export default function AdminLogin() {
  const navigate = useNavigate();

  // Runs when the form is submitted. Whatever it returns becomes the new `state`.
  const [state, submit, pending] = useActionState(
    async (_previous: LoginState, form: FormData): Promise<LoginState> => {
      const username = String(form.get("username"));
      try {
        await login(username, String(form.get("password")));
        navigate("/admin", { replace: true });
        return { error: "", username };
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : "Login failed",
          username,
        };
      }
    },
    { error: "", username: "" },
  );

  return (
    <div className="admin-login">
      <form className="admin-login-card" action={submit}>
        <h2>Admin Login</h2>
        <p>Robotics Learning Crate: instructors only</p>

        {state.error && <div className="admin-error">{state.error}</div>}

        <label className="admin-field">
          Username
          <input
            name="username"
            defaultValue={state.username}
            autoComplete="username"
            required
            autoFocus
          />
        </label>

        <label className="admin-field">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>

        <button className="next-button" type="submit" disabled={pending}>
          {pending ? "Logging in..." : "Log In"}
        </button>

        <NavButton to="/">← Back to Student View</NavButton>
      </form>
    </div>
  );
}
