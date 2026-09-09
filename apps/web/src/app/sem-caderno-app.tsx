'use client';

import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { type Session, type Snapshot, type View, request } from './model';
import { Icon, Tour } from './ui';
import { ActivityList, Customers, Expenses, Home, Products, SaleForm, Settings } from './views';

export function SemCadernoApp() {
  const [session, setSession] = useState<Session>();
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [view, setView] = useState<View>('home');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [tour, setTour] = useState(0);

  const refresh = useCallback(async (active: Session) => {
    const result = await request<{ data: Snapshot }>('/api/mvp/snapshot');
    setSnapshot(result.data);
    setSession(active);
  }, []);

  useEffect(() => {
    request<{ data: Session }>('/api/mvp/session')
      .then(async ({ data }) => refresh(data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [refresh]);

  const mutate = async (path: string, body: unknown, success: string, method = 'POST') => {
    if (!session) return undefined;
    setError(undefined);
    try {
      const result = await request<{ data?: unknown }>(
        path,
        { method, body: JSON.stringify(body) },
        session.csrfToken,
      );
      await refresh(session);
      setNotice(success);
      window.setTimeout(() => setNotice(undefined), 4200);
      return result?.data;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível concluir.');
      throw reason;
    }
  };

  if (loading)
    return (
      <div className="boot">
        <div className="brand-mark">SC</div>
        <p>Organizando seu caderno…</p>
      </div>
    );
  if (!session || !snapshot)
    return (
      <Auth
        onAuthenticated={async (active) => {
          await refresh(active);
          if (!localStorage.getItem('sem-caderno-tour')) setTour(1);
        }}
      />
    );

  const nav: { id: View; label: string; icon: string }[] = [
    { id: 'home', label: 'Início', icon: 'home' },
    { id: 'sale', label: 'Nova venda', icon: 'sale' },
    { id: 'customers', label: 'Clientes', icon: 'people' },
    { id: 'products', label: 'Produtos', icon: 'box' },
    { id: 'expenses', label: 'Despesas', icon: 'expense' },
    { id: 'activity', label: 'Atividade', icon: 'activity' },
  ];
  const titles: Record<View, string> = {
    home: 'Visão de hoje',
    sale: 'Registrar venda',
    customers: 'Clientes',
    products: 'Produtos',
    expenses: 'Despesas',
    activity: 'Atividade',
    settings: 'Seu estabelecimento',
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView('home')}>
          <span className="brand-mark">SC</span>
          <span>
            <b>Sem Caderno</b>
            <small>Simples de verdade</small>
          </span>
        </button>
        <nav aria-label="Menu principal">
          {nav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? 'active' : ''}
              onClick={() => setView(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === 'sale' && <span className="nav-plus">+</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button
            onClick={() => setView('settings')}
            className={view === 'settings' ? 'active' : ''}
          >
            <Icon name="settings" />
            <span>Configurações</span>
          </button>
          <button className="profile" onClick={() => setView('settings')}>
            <span className="avatar">{snapshot.user.name.slice(0, 2).toUpperCase()}</span>
            <span>
              <b>{snapshot.user.name}</b>
              <small>{snapshot.business.name}</small>
            </span>
          </button>
        </div>
      </aside>
      <main className="workspace">
        {snapshot.business.demo && (
          <div className="demo-strip">
            <span>Ambiente de demonstração</span>
            <span>Os dados abaixo são exemplos e voltam ao reiniciar a API.</span>
          </div>
        )}
        <header className="topbar">
          <div>
            <span className="eyebrow">{snapshot.business.name}</span>
            <h1>{titles[view]}</h1>
          </div>
          <div className="top-actions">
            <button className="help" onClick={() => setTour(1)}>
              Como usar
            </button>
            {view !== 'sale' && (
              <button className="primary compact" onClick={() => setView('sale')}>
                + Registrar venda
              </button>
            )}
          </div>
        </header>
        {error && (
          <div className="alert error" role="alert">
            <b>Não foi possível concluir</b>
            <span>{error}</span>
            <button onClick={() => setError(undefined)} aria-label="Fechar">
              ×
            </button>
          </div>
        )}
        {notice && (
          <div className="toast" role="status">
            ✓ {notice}
          </div>
        )}
        {view === 'home' && (
          <Home
            data={snapshot}
            openSale={() => setView('sale')}
            openCustomers={() => setView('customers')}
          />
        )}
        {view === 'sale' && (
          <SaleForm
            data={snapshot}
            submit={(body) =>
              mutate('/api/mvp/sales', body, 'Venda registrada com sucesso.').then(() =>
                setView('home'),
              )
            }
          />
        )}
        {view === 'customers' && (
          <Customers
            data={snapshot}
            create={(body) => mutate('/api/mvp/customers', body, 'Cliente adicionado.')}
            update={(customerId, body) =>
              mutate(
                `/api/mvp/customers/${customerId}`,
                body,
                'Dados do cliente atualizados.',
                'PUT',
              )
            }
            pay={(body) => mutate('/api/mvp/payments', body, 'Pagamento registrado.')}
            collect={(body) =>
              mutate(
                '/api/mvp/collections',
                body,
                'Lembrete preparado — o pagamento continua em aberto.',
              )
            }
          />
        )}
        {view === 'products' && (
          <Products
            data={snapshot}
            create={(body) => mutate('/api/mvp/products', body, 'Produto adicionado.')}
            update={(productId, body) =>
              mutate(`/api/mvp/products/${productId}`, body, 'Produto atualizado.', 'PUT')
            }
          />
        )}
        {view === 'expenses' && (
          <Expenses
            data={snapshot}
            create={(body) => mutate('/api/mvp/expenses', body, 'Despesa registrada.')}
          />
        )}
        {view === 'activity' && (
          <ActivityList
            data={snapshot}
            cancel={(saleId, reason) =>
              mutate(
                `/api/mvp/sales/${saleId}/cancel`,
                { reason },
                'Venda cancelada com histórico preservado.',
              )
            }
          />
        )}
        {view === 'settings' && (
          <Settings
            data={snapshot}
            save={(body) => mutate('/api/mvp/settings', body, 'Configurações salvas.', 'PUT')}
            saveWhatsApp={(body) =>
              mutate('/api/mvp/settings/whatsapp', body, 'Configuração do WhatsApp salva.', 'PUT')
            }
            signOut={async () => {
              await request('/api/mvp/sign-out', { method: 'POST' }, session.csrfToken);
              setSession(undefined);
              setSnapshot(undefined);
            }}
          />
        )}
      </main>
      <nav className="mobile-nav" aria-label="Menu principal">
        {nav.slice(0, 5).map((item) => (
          <button
            key={item.id}
            className={view === item.id ? 'active' : ''}
            onClick={() => setView(item.id)}
          >
            <Icon name={item.icon} />
            <span>{item.id === 'sale' ? 'Vender' : item.label}</span>
          </button>
        ))}
      </nav>
      {tour > 0 && (
        <Tour
          step={tour}
          close={() => {
            localStorage.setItem('sem-caderno-tour', 'done');
            setTour(0);
          }}
          next={() => setTour((value) => value + 1)}
        />
      )}
    </div>
  );
}

function Auth({ onAuthenticated }: { onAuthenticated: (session: Session) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await request<{ data: Session }>(
        mode === 'login' ? '/api/mvp/sign-in' : '/api/mvp/register',
        { method: 'POST', body: JSON.stringify(values) },
      );
      await onAuthenticated(result.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand light">
          <span className="brand-mark">SC</span>
          <span>
            <b>Sem Caderno</b>
            <small>Simples de verdade</small>
          </span>
        </div>
        <div className="story-copy">
          <span className="pill">Feito para pequenos negócios</span>
          <h1>Suas vendas, fiados e despesas em ordem.</h1>
          <p>
            Troque o caderno por uma rotina simples, sem termos complicados e sem perder o
            histórico.
          </p>
          <ul>
            <li>Saiba quem está devendo</li>
            <li>Registre vendas em poucos passos</li>
            <li>Veja quanto entrou e quanto saiu</li>
          </ul>
        </div>
        <p className="auth-foot">Seus registros organizados. Suas decisões mais tranquilas.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="mobile-brand">Sem Caderno</span>
          <h2>{mode === 'login' ? 'Que bom ter você de volta' : 'Comece seu caderno digital'}</h2>
          <p>
            {mode === 'login'
              ? 'Entre para cuidar do seu negócio.'
              : 'Crie sua conta e seu estabelecimento.'}
          </p>
          {error && (
            <div className="inline-error" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={(event) => void submit(event)}>
            {mode === 'register' && (
              <>
                <label>
                  Seu nome
                  <input
                    name="name"
                    required
                    autoComplete="name"
                    placeholder="Como podemos chamar você?"
                  />
                </label>
                <label>
                  Nome do estabelecimento
                  <input name="businessName" required placeholder="Ex.: Mercearia Boa Vizinhança" />
                </label>
              </>
            )}
            <label>
              E-mail
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={mode === 'login' ? 'demo@semcaderno.app' : ''}
                placeholder="voce@exemplo.com"
              />
            </label>
            <label>
              Senha
              <input
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                defaultValue={mode === 'login' ? 'semcaderno' : ''}
              />
            </label>
            <button className="primary wide" disabled={busy}>
              {busy ? 'Só um instante…' : mode === 'login' ? 'Entrar' : 'Criar minha conta'}
            </button>
          </form>
          {mode === 'login' && (
            <div className="demo-box">
              <b>Quer apenas conhecer?</b>
              <span>Os dados de demonstração já estão preenchidos.</span>
              <button
                onClick={() =>
                  document.querySelector<HTMLFormElement>('.auth-card form')?.requestSubmit()
                }
              >
                Entrar na demonstração
              </button>
            </div>
          )}
          <button
            className="switch-auth"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(undefined);
            }}
          >
            {mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}
          </button>
        </div>
      </section>
    </main>
  );
}
