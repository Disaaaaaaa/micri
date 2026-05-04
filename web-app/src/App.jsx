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
  },
  {
    id: 2,
    title: 'Instagram контент-жоспар',
    category: 'Маркетинг',
    catClass: 'b-marketing',
    price: '15 000 ₸',
    desc: 'Технологиялық стартап үшін 1 апталық SMM контент жоспарын жазу.',
    aiWelcome: 'Сәлем! SMM жоспар құруға дайынмын. Біздің стартаптың мақсатты аудиториясы кім?'
  },
  {
    id: 3,
    title: 'Excel деректерді өңдеу',
    category: 'Аналитика',
    catClass: 'b-data',
    price: '30 000 ₸',
    desc: 'Дүкеннің бір айлық сатылым тарихын талдап, графиктер құру.',
    aiWelcome: 'Сәлем! Деректерді талдауға көмектесемін. Алдымен деректердің қай бағаны ең маңызды екенін анықтап алайық.'
  },
  {
    id: 4,
    title: 'Инвесторларға презентация (Pitch Deck)',
    category: 'Дизайн',
    catClass: 'b-design',
    price: '40 000 ₸',
    desc: 'Жаңа стартап жоба үшін инвесторларға көрсететін 10 слайдтан тұратын әдемі презентация жасау.',
    aiWelcome: 'Сәлем! Презентация құрылымын Gamma.app арқылы жасаймыз ба? Қандай стиль ұнайды?'
  },
  {
    id: 5,
    title: 'Landing Page кодын жазу (React)',
    category: 'Бағдарламалау',
    catClass: 'b-dev',
    price: '60 000 ₸',
    desc: 'Дайын Figma дизайны бойынша шағын лендинг бетті React JS арқылы кодтап шығу.',
    aiWelcome: 'Сәлем! Код жазуды бастайық. Компоненттерді бөлшектеуден бастаймыз ба?'
  },
  {
    id: 6,
    title: 'SEO мақала жазу',
    category: 'Маркетинг',
    catClass: 'b-marketing',
    price: '12 000 ₸',
    desc: 'Тіс емханасының блогына арналған "Тіс тазалаудың маңызы" тақырыбында 500 сөздік SEO-мақала жазу.',
    aiWelcome: 'Сәлем! Мақалаға қандай SEO кілт сөздерді (keywords) қосамыз?'
  },
  {
    id: 7,
    title: 'Бәсекелестерге талдау жасау',
    category: 'Аналитика',
    catClass: 'b-data',
    price: '35 000 ₸',
    desc: 'Нарықтағы 5 негізгі бәсекелес компанияның әлсіз және мықты тұстарын тауып, кестеге түсіру.',
    aiWelcome: 'Сәлем! Бәсекелестердің тізімін беріңіз, мен олардың ақпараттарын жинауға көмектесемін.'
  },
  {
    id: 8,
    title: 'TikTok / Reels видео-монтаж',
    category: 'Дизайн',
    catClass: 'b-design',
    price: '20 000 ₸',
    desc: 'Дайын түсірілген видео материалдардан 30 секундтық динамикалық Reels видеосын құрастыру.',
    aiWelcome: 'Сәлем! Видеоның музыкасы қандай болғанын қалайсыз? Динамикалық па әлде баяу ма?'
  },
  {
    id: 9,
    title: 'Python арқылы парсер жазу',
    category: 'Бағдарламалау',
    catClass: 'b-dev',
    price: '50 000 ₸',
    desc: 'Белгілі бір сайттан тауарлардың бағасын автоматты түрде жинайтын қарапайым Python скриптін жазу.',
    aiWelcome: 'Сәлем! Қай сайттан ақпарат жинауымыз керек? BeautifulSoup әлде Selenium қолданамыз ба?'
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

  const [studentWork, setStudentWork] = useState('');

  const handleSelectTask = (task) => {
    setSelectedTask(task);
    setMessages([{ role: 'assistant', text: task.aiWelcome || task.ai_welcome }]);
    setStudentWork('');
    setView('task-workspace');
  };

  const handleSubmitWork = async () => {
    if (!studentWork.trim()) {
      alert("Алдымен жұмысыңызды жазыңыз немесе сілтемесін қалдырыңыз!");
      return;
    }
    
    const prompt = `Студенттің орындаған жұмысы: "${studentWork}". Осы жұмысты берілген тапсырмаға ("${selectedTask.title}") сай тексеріп, 100 баллдық жүйемен әділ бағалап, қысқаша кері байланыс (не дұрыс, не бұрыс) бер.`;
    
    const newMsgs = [...messages, { role: 'user', text: "Жұмысты тексеруге жібердім." }];
    setMessages(newMsgs);
    setIsTyping(true);

    try {
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: "Сен қатаң, бірақ әділ тәлімгерсің. Жұмысты тексеріп баға қоясың. Қазақ тілінде жауап бер." },
          { role: "user", content: prompt }
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
        <main>
          <section className="hero">
              <div className="hero-content">
                  <span className="badge" style={{background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', marginBottom: '1.5rem', display: 'inline-block'}}>Жаңа ЖИ мүмкіндігі ✨</span>
                  <h1>Тәжірибе жоқ па? <br/><span className="gradient-text">Оны өзіміз жасаймыз!</span></h1>
                  <p>ЖИ көмегімен нақты компаниялардың шағын тапсырмаларын орындап, өзіңнің алғашқы цифрлық портфолиоңды жина. Тұйық шеңберді бірге бұзамыз.</p>
                  <div className="hero-buttons">
                      <button className="btn btn-primary" style={{fontSize: '1.1rem', padding: '1rem 2rem'}} onClick={() => setView('auth')}>Платформаға кіру</button>
                      <button className="btn btn-outline" style={{fontSize: '1.1rem', padding: '1rem 2rem'}} onClick={() => setView('auth')}>Тіркелу</button>
                  </div>
              </div>
              <div className="hero-image">
                  <img src="/platform_ui_mockup.png" alt="Platform Interface" className="glass-image" />
              </div>
          </section>

          <section className="features">
              <h2>Платформа қалай жұмыс істейді?</h2>
              <div className="feature-cards">
                  <div className="glass-card">
                      <div className="icon">💼</div>
                      <h3>1. Тапсырма таңда</h3>
                      <p>Нақты бизнес иелері қалдырған шынайы тапсырмаларды қарап, өзіңе ұнағанын таңдап ал.</p>
                  </div>
                  <div className="glass-card">
                      <div className="icon">🤖</div>
                      <h3>2. ЖИ-мен бірге орында</h3>
                      <p>Платформадағы кіріктірілген AI-ассистент саған тапсырманы орындау барысында көмектеседі.</p>
                  </div>
                  <div className="glass-card">
                      <div className="icon">🚀</div>
                      <h3>3. Портфолио жина</h3>
                      <p>Тапсырманы сәтті тапсырған соң, ол сенің цифрлық портфолиоңа қосылады және сен алғашқы табысыңды табасың.</p>
                  </div>
              </div>
          </section>
        </main>
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
        <div className="landing-page" style={{maxWidth: '1200px'}}>
          <h2 style={{fontSize: '2.5rem', marginBottom: '2rem'}}>Ашық тапсырмалар тақтасы</h2>
          <div className="feature-cards">
            {tasks.map(task => (
              <div key={task.id} className="glass-card" style={{cursor: 'pointer', textAlign: 'left'}} onClick={() => handleSelectTask(task)}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                  <span className="badge" style={{background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8'}}>{task.category}</span>
                  <span style={{color: '#10b981', fontWeight: 'bold'}}>{task.price}</span>
                </div>
                <h3 style={{marginBottom: '1rem'}}>{task.title}</h3>
                <p style={{fontSize: '0.9rem', color: '#cbd5e1'}}>{task.desc?.substring(0, 100)}...</p>
                <div style={{marginTop: '1.5rem', color: '#c084fc', fontSize: '0.9rem'}}>Толығырақ көру →</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'task-workspace' && selectedTask && (
        <div className="dashboard">
          <div className="tasks-panel" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <button className="btn btn-outline" style={{alignSelf: 'flex-start'}} onClick={() => setView('dashboard')}>← Артқа қайту</button>
            <div className="task-header" style={{marginTop: '1rem'}}>
              <span className="badge" style={{background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8'}}>{selectedTask.category}</span>
              <span className="price">{selectedTask.price}</span>
            </div>
            <h2>{selectedTask.title}</h2>
            <p style={{color: '#cbd5e1', lineHeight: '1.6'}}>{selectedTask.desc || selectedTask['desc']}</p>
            
            <div style={{marginTop: '2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              <h3>💻 Жұмыс алаңы</h3>
              <p style={{fontSize: '0.9rem', color: '#94a3b8'}}>Төмендегі өріске жұмысыңыздың нәтижесін, кодын немесе Google Drive/Figma сілтемесін қалдырыңыз:</p>
              <textarea 
                className="form-input" 
                style={{flex: 1, resize: 'none', fontFamily: 'monospace'}} 
                placeholder="Мысалы: Мен бұл тапсырманы былай орындадым..."
                value={studentWork}
                onChange={e => setStudentWork(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleSubmitWork} disabled={isTyping}>✨ Жұмысты тексеруге жіберу (ЖИ Эвалюатор)</button>
            </div>
          </div>

          <div className="chat-panel">
            <div className="chat-header">🤖 ЖИ-Ассистент {selectedTask ? `- ${selectedTask.title}` : ''}</div>
            <div className="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`message ${m.role === 'assistant' ? 'msg-ai' : 'msg-user'}`}>{m.text}</div>
              ))}
              {isTyping && <div className="message msg-ai">Теріп жатыр...</div>}
            </div>
            <form className="chat-input" onSubmit={handleSendMessage}>
              <input type="text" placeholder="Сұрақ қою немесе көмек сұрау..." value={inputValue} onChange={e => setInputValue(e.target.value)} />
              <button type="submit" className="btn btn-primary" disabled={isTyping}>Жіберу</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
