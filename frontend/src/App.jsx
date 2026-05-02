import { useEffect, useState } from 'react';

const API_BASE = 'https://task-manager-app-kw6i.onrender.com/api';

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState(0);

  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  const [authMode, setAuthMode] = useState('login');
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');

  const authHeaders = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

  const fetchTasks = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/tasks`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchTasks(); }, [token]);

  const handleRegisterOrLogin = async (e) => {
    e.preventDefault();
    const route = authMode === 'login' ? 'login' : 'register';
    try {
      const res = await fetch(`${API_BASE}/auth/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUser, password: authPass })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        setUsername(data.username);
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        setAuthPass('');
        setAuthUser('');
      } else {
        alert(data.msg || 'Auth error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    setToken('');
    setUsername('');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setTasks([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return;
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title, priority: Number(priority) })
      });
      if (res.ok) {
        setTitle('');
        setPriority(0);
        fetchTasks();
      } else if (res.status === 401) handleLogout();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) setTasks(tasks.filter(t => t._id !== id));
    } catch (err) { console.error(err); }
  };

  const toggleCompleted = async (task) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${task._id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ completed: !task.completed })
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks(tasks.map(t => t._id === updated._id ? updated : t));
      }
    } catch (err) { console.error(err); }
  };

  const changePriority = async (task, newPriority) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${task._id}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ priority: Number(newPriority) })
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks(tasks.map(t => t._id === updated._id ? updated : t));
      }
    } catch (err) { console.error(err); }
  };

  if (!token) {
    return (
      <div style={{ padding: '20px', maxWidth: '420px', margin: 'auto', fontFamily: 'sans-serif' }}>
        <h2 style={{ textAlign: 'center' }}>{authMode === 'login' ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleRegisterOrLogin} style={{ display: 'grid', gap: '10px' }}>
          <input placeholder="Username" value={authUser} onChange={e => setAuthUser(e.target.value)} required style={{ padding: '10px' }} />
          <input placeholder="Password" type="password" value={authPass} onChange={e => setAuthPass(e.target.value)} required style={{ padding: '10px' }} />
          <button style={{ padding: '10px' }} type="submit">{authMode === 'login' ? 'Login' : 'Register'}</button>
        </form>
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} style={{ background: 'transparent', border: 'none', color: '#06f', cursor: 'pointer' }}>{authMode === 'login' ? 'Create account' : 'Have an account? Login'}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Task Manager</h2>
        <div>
          <strong>{username}</strong>
          <button onClick={handleLogout} style={{ marginLeft: '10px' }}>Logout</button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="New task..." style={{ flex: 1, padding: '10px' }} required />
        <select value={priority} onChange={e => setPriority(e.target.value)} style={{ padding: '10px' }}>
          <option value={0}>Priority 0</option>
          <option value={1}>Priority 1</option>
          <option value={2}>Priority 2</option>
          <option value={3}>Priority 3</option>
        </select>
        <button type="submit" style={{ padding: '10px' }}>Add</button>
      </form>

      <div>
        {tasks.map(t => (
          <div key={t._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #ddd', padding: '12px', marginBottom: '10px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="checkbox" checked={t.completed} onChange={() => toggleCompleted(t)} />
              <div>
                <div style={{ fontSize: '1.05em', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</div>
                <div style={{ fontSize: '0.8em', color: '#666' }}>Priority: {t.priority}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select value={t.priority} onChange={e => changePriority(t, e.target.value)}>
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
              <button onClick={() => handleDelete(t._id)} style={{ background: '#ff6666', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;