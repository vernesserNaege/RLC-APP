import { useState, type FormEvent } from "react";
import { createAccount, deleteAccount, getAccounts, getMe, setAccountPassword, setAccountRole } from "../../api";
import AsyncView from "../../components/AsyncView";
import Layout from "../../components/Layout";
import NavButton from "../../components/NavButton";
import { useFetch } from "../../hooks/useFetch";
import { useToast } from "../../hooks/useToast";
import type { Account, Me, Role } from "../../types";

// Staff accounts. Only admins can open this page (the server answers 403 to teachers),
// and it is the only place an account can be made, so students cannot sign themselves up.
// New accounts are teachers; an admin can make any of them an admin too.
export default function Accounts() {
  const state = useFetch(() => Promise.all([getAccounts(), getMe()]), "accounts");
  return (
    <AsyncView state={state} what="accounts">
      {([accounts, me]) => <AccountList initial={accounts} me={me} />}
    </AsyncView>
  );
}

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", teacher: "Teacher" };

const MIN_PASSWORD = 8;
const emptyForm = { displayName: "", username: "", password: "", confirm: "" };

function AccountList({ initial, me }: { initial: Account[]; me: Me }) {
  const [accounts, setAccounts] = useState(initial);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null); // the row showing the new-password box
  const [newPassword, setNewPassword] = useState("");
  const [toast, showToast] = useToast();

  const set = (field: keyof typeof emptyForm, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const fail = (err: unknown) => showToast(err instanceof Error ? err.message : "Something went wrong", "error");

  async function create(event: FormEvent) {
    event.preventDefault();
    if (form.password !== form.confirm) return showToast("The two passwords are different.", "error");
    setCreating(true);
    try {
      const { displayName, username, password } = form; // the "confirm" box stays in the browser
      const account = await createAccount({ displayName, username, password });
      setAccounts((list) => [...list, account]);
      setForm(emptyForm);
      showToast(`Account made for ${account.displayName}. They can log in as "${account.username}".`);
    } catch (err) {
      fail(err);
    } finally {
      setCreating(false);
    }
  }

  async function savePassword(account: Account) {
    try {
      await setAccountPassword(account.id, newPassword);
      setResetId(null);
      setNewPassword("");
      showToast(`New password set for ${account.displayName}`);
    } catch (err) {
      fail(err);
    }
  }

  // Teacher -> admin, or admin -> teacher. Applies from that person's next click.
  async function changeRole(account: Account) {
    const role: Role = account.role === "admin" ? "teacher" : "admin";
    const question =
      role === "admin"
        ? `Make ${account.displayName} an admin? Admins can also add, change and delete staff accounts.`
        : `Make ${account.displayName} a teacher again? They will no longer manage accounts.`;
    if (!window.confirm(question)) return;
    try {
      const updated = await setAccountRole(account.id, role);
      setAccounts((list) => list.map((a) => (a.id === updated.id ? updated : a)));
      showToast(`${updated.displayName} is now ${role === "admin" ? "an admin" : "a teacher"}`);
    } catch (err) {
      fail(err);
    }
  }

  async function remove(account: Account) {
    if (!window.confirm(`Delete the account of ${account.displayName} (${account.username})? They will be logged out at once.`)) return;
    try {
      await deleteAccount(account.id);
      setAccounts((list) => list.filter((a) => a.id !== account.id));
      showToast(`Deleted the account of ${account.displayName}`);
    } catch (err) {
      fail(err);
    }
  }

  return (
    <Layout subtitle="Admin Panel" className="admin-container" admin>
      <div className="admin-toolbar">
        <div>
          <h2>Staff Accounts ({accounts.length})</h2>
          <span className="save-state">Only admins can make accounts. There is no public sign-up.</span>
        </div>
        <div className="admin-toolbar-actions">
          <NavButton to="/admin">← Dashboard</NavButton>
        </div>
      </div>

      <form className="editor-card" onSubmit={create}>
        <h3>Add a Teacher</h3>
        <p className="save-state">New accounts start as teachers. You can make them an admin from the list below.</p>
        <div className="editor-grid account-grid">
          <label className="admin-field">
            Full name
            <input value={form.displayName} onChange={(e) => set("displayName", e.target.value)} maxLength={80} required />
          </label>
          <label className="admin-field">
            Username
            <input
              value={form.username} onChange={(e) => set("username", e.target.value)}
              pattern={"[A-Za-z0-9._\\-]{3,30}"} title="3 to 30 letters, numbers, dots, dashes or underscores"
              autoComplete="off" required
            />
          </label>
          <label className="admin-field">
            Password
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
              minLength={MIN_PASSWORD} autoComplete="new-password" required />
          </label>
          <label className="admin-field">
            Confirm password
            <input type="password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)}
              minLength={MIN_PASSWORD} autoComplete="new-password" required />
          </label>
        </div>
        <button className="next-button" type="submit" disabled={creating}>
          {creating ? "Creating..." : "Create Account"}
        </button>
      </form>

      {accounts.length === 0 ? (
        <div className="empty-state">
          <h3>No staff accounts yet</h3>
          <p>Accounts you add above will appear here.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.displayName}
                    {a.id === me.id && <span className="you-tag"> (you)</span>}
                  </td>
                  <td>{a.username}</td>
                  <td>
                    <span className={`status-pill role-${a.role}`}>{ROLE_LABEL[a.role]}</span>
                  </td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td>
                    {resetId === a.id ? (
                      <div className="table-actions">
                        <input
                          className="inline-password" type="password" placeholder={`New password (${MIN_PASSWORD}+ characters)`}
                          value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" autoFocus
                        />
                        <button className="table-action" onClick={() => savePassword(a)} disabled={newPassword.length < MIN_PASSWORD}>
                          Save
                        </button>
                        <button className="table-action" onClick={() => { setResetId(null); setNewPassword(""); }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="table-actions">
                        <button className="table-action" onClick={() => { setResetId(a.id); setNewPassword(""); }}>
                          Reset Password
                        </button>
                        {/* Nobody can change their own role or delete themselves (the server checks too) */}
                        {a.id !== me.id && (
                          <>
                            <button className="table-action" onClick={() => changeRole(a)}>
                              {a.role === "admin" ? "Make Teacher" : "Make Admin"}
                            </button>
                            <button className="table-action danger" onClick={() => remove(a)}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {toast}
    </Layout>
  );
}
