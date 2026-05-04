import React, { useState, useEffect } from 'react';
import OpenAI from 'openai';
import { supabase } from './supabaseClient';
import './index.css';

// OpenAI инициализациясы
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const MOCK_TASKS = [
  {
    id: 1,
    title: 'Кофеханаға логотип жасау',
    category: 'Дизайн',
    catClass: 'b-design',
    price: '25 000 ₸',
    desc: '"Bean Street" кофеханасына минималистік логотиптің 3 эскизін дайындау.',
    aiWelcome: 'Сәлем! Логотип жасауға көмектесемін. Midjourney немесе Canva қолданамыз ба?'
  }
];

function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('landing'); // landing, auth, dashboard, create-task
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Create Task state
  const [newTask, setNewTask] = useState({ title: '', category: 'Дизайн', price: '', desc: '', aiWelcome: 'Сәлем! Бұл тапсырманы орындауға қалай көмектесе аламын?' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setView('dashboard');
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setView('dashboard');
      else setView('landing');
    });
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase error (using mock tasks instead):', error);
      setTasks(MOCK_TASKS); // Қате болса (кесте жоқ болса) MOCK қолданамыз
    } else {
      setTasks(data.length > 0 ? data : MOCK_TASKS);
    }
  };

  useEffect(() => {
    if (view === 'dashboard') {
      fetchTasks();
    }
  }, [view]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Пошта мен құпия сөзді толтырыңыз!");
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setAuthLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Пошта мен құпия сөзді толтырыңыз!");
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Поштаңызды тексеріп, растаңыз! (Немесе жалған пошта жазсаңыз, Supabase параметрлерінен Auto Confirm қосып қойыңыз)");
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('landing');
    setSelectedTask(null);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from('tasks').insert([
      { ...newTask, user_id: session.user.id }
    ]);
    if (error) {
      alert("Қате! Дерекқорда 'tasks' кестесі құрылмаған болуы мүмкін. SQL Editor арқылы кестені құрыңыз.");
      console.error(error);
    } else {
      alert("Тапсырма сәтті қосылды!");
      setView('dashboard');
      fetchTasks();
    }
  };

  const handleSelectTask = (task) => {
    setSelectedTask(task);
    setMessages([{ role: 'assistant', text: task.aiWelcome || task.ai_welcome }]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    const userMsg = inputValue;
    const newMsgs = [...messages, { role: 'user', text: userMsg }];
    setMessages(newMsgs);
    setInputValue('');
    setIsTyping(true);

    try {
      const completion = await openai.chat.completions.create({
        messages: [
          { 
            role: "system", 
            content: `Сен Micro-Internship Hub платформасының ЖИ-көмекшісісің. Студентке тапсырманы орындауға нақты көмек бер. Қазақ тілінде жауап бер.` 
          },
          ...newMsgs.map(m => ({ role: m.role, content: m.text }))
        ],
        model: "gpt-4o",
      });
      setMessages([...newMsgs, { role: 'assistant', text: completion.choices[0].message.content }]);
    } catch (error) {
      console.error("OpenAI Error:", error);
      setMessages([...newMsgs, { role: 'assistant', text: "ЖИ қатесі: " + error.message }]);
    } finally {
      setIsTyping(false);
    }
  };

  // UI Рендері
  return (
    <>
      <div className="bg-blobs">
        <div className="blob blob-1"></div><div className="blob blob-2"></div>
      </div>

      <nav className="navbar">
        <div className="logo-container" onClick={() => setView(session ? 'dashboard' : 'landing')}>
          <img src="/micro_internship_logo.png" alt="Logo" />
          <span>Micro-Internship Hub</span>
        </div>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          {session ? (
            <>
              <span style={{ color: '#94a3b8' }}>{session.user.email}</span>
              <button className="btn btn-outline" onClick={() => setView('create-task')}>+ Жаңа тапсырма</button>
              <button className="btn btn-outline" onClick={handleLogout}>Шығу</button>
            </>
          ) : (
            view !== 'auth' && <button className="btn btn-primary" onClick={() => setView('auth')}>Кіру / Тіркелу</button>
          )}
        </div>
      </nav>

      {view === 'landing' && (
        <div className="landing-page">
          <span className="badge" style={{background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', marginBottom: '1rem', display: 'inline-block'}}>Жаңа ЖИ мүмкіндігі ✨</span>
          <h1>Тәжірибе жоқ па? <br/><span className="gradient-text">Оны өзіміз жасаймыз!</span></h1>
          <button className="btn btn-primary" style={{fontSize: '1.2rem', padding: '1rem 2rem'}} onClick={() => setView('auth')}>Платформаға кіру</button>
        </div>
      )}

      {view === 'auth' && (
        <div className="landing-page" style={{maxWidth: '400px'}}>
          <h2>Авторизация</h2>
          <form style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem'}}>
            <input type="email" placeholder="Email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Құпия сөз" className="form-input" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="btn btn-primary" onClick={handleLogin} disabled={authLoading}>Кіру</button>
            <button className="btn btn-outline" onClick={handleSignUp} disabled={authLoading}>Тіркелу</button>
          </form>
        </div>
      )}

      {view === 'create-task' && (
        <div className="landing-page" style={{maxWidth: '600px', textAlign: 'left'}}>
          <h2>Жаңа тапсырма жариялау (Бизнес үшін)</h2>
          <form style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem'}} onSubmit={handleCreateTask}>
            <input placeholder="Тақырыбы" className="form-input" required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
            <select className="form-input" value={newTask.category} onChange={e => setNewTask({...newTask, category: e.target.value})}>
              <option>Дизайн</option><option>Маркетинг</option><option>Аналитика</option><option>Бағдарламалау</option>
            </select>
            <input placeholder="Бағасы (мысалы: 15 000 ₸)" className="form-input" required value={newTask.price} onChange={e => setNewTask({...newTask, price: e.target.value})} />
            <textarea placeholder="Тапсырманың толық сипаттамасы" className="form-input" rows="4" required value={newTask.desc} onChange={e => setNewTask({...newTask, desc: e.target.value})} />
            <input placeholder="ЖИ көмекшісінің алғашқы сөзі" className="form-input" required value={newTask.aiWelcome} onChange={e => setNewTask({...newTask, aiWelcome: e.target.value})} />
            <button type="submit" className="btn btn-primary">Жариялау</button>
          </form>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="dashboard">
          <div className="tasks-panel">
            <h2>Ашық тапсырмалар</h2>
            {tasks.map(task => (
              <div key={task.id} className="task-card" onClick={() => handleSelectTask(task)}>
                <div className="task-header">
                  <span className="badge" style={{background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8'}}>{task.category}</span>
                  <span className="price">{task.price}</span>
                </div>
                <h3>{task.title}</h3>
                <p>{task.desc}</p>
              </div>
            ))}
          </div>

          <div className="chat-panel">
            <div className="chat-header">🤖 ЖИ-Ассистент {selectedTask ? `- ${selectedTask.title}` : ''}</div>
            {!selectedTask ? (
              <div className="empty-chat">Тапсырманы таңдасаңыз, мен оны орындауға көмектесемін.</div>
            ) : (
              <>
                <div className="chat-messages">
                  {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role === 'assistant' ? 'msg-ai' : 'msg-user'}`}>{m.text}</div>
                  ))}
                  {isTyping && <div className="message msg-ai">Теріп жатыр...</div>}
                </div>
                <form className="chat-input" onSubmit={handleSendMessage}>
                  <input type="text" placeholder="ЖИ-ға хабарлама жазу..." value={inputValue} onChange={e => setInputValue(e.target.value)} />
                  <button type="submit" className="btn btn-primary" disabled={isTyping}>Жіберу</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
