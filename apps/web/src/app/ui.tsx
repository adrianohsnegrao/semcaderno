'use client';

import { type FormEvent, type ReactNode, useState } from 'react';

import { formatMoneyInput } from './model';

export function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: (
      <>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10.5V20h13v-9.5M9 20v-6h6v6" />
      </>
    ),
    sale: (
      <>
        <path d="M4 4h2l2.2 10.2a2 2 0 0 0 2 1.6h6.7a2 2 0 0 0 2-1.6L20 8H7" />
        <circle cx="10" cy="19" r="1" />
        <circle cx="18" cy="19" r="1" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 4.8V20" />
      </>
    ),
    box: (
      <>
        <path d="m4 7 8-4 8 4-8 4-8-4Z" />
        <path d="m4 7 8 4 8-4v10l-8 4-8-4V7ZM12 11v10" />
      </>
    ),
    expense: (
      <>
        <path d="M4 7h16v12H4zM7 4h10v3" />
        <path d="M8 13h8M12 9v8" />
      </>
    ),
    activity: <path d="M4 12h3l2-6 4 12 2-6h5" />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 15a2 2 0 0 0 .4 2l.1.1-2.4 2.4-.1-.1a2 2 0 0 0-2-.4 2 2 0 0 0-1 1.7v.2h-4v-.2A2 2 0 0 0 9 19a2 2 0 0 0-2 .4l-.1.1-2.4-2.4.1-.1A2 2 0 0 0 5 15a2 2 0 0 0-1.7-1H3v-4h.3A2 2 0 0 0 5 9a2 2 0 0 0-.4-2l-.1-.1 2.4-2.4.1.1A2 2 0 0 0 9 5a2 2 0 0 0 1-1.7V3h4v.3A2 2 0 0 0 15 5a2 2 0 0 0 2-.4l.1-.1 2.4 2.4-.1.1a2 2 0 0 0-.4 2 2 2 0 0 0 1.7 1h.3v4h-.3A2 2 0 0 0 19 15Z" />
      </>
    ),
  };
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function SimpleForm({
  fields,
  defaults = {},
  submit,
  button,
  className,
}: {
  fields: [string, string, string][];
  defaults?: Record<string, string>;
  submit: (body: Record<string, string>) => Promise<unknown>;
  button: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={`simple-form${className ? ` ${className}` : ''}`}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBusy(true);
        const values = Object.fromEntries(
          [...new FormData(event.currentTarget).entries()].map(([key, value]) => [
            key,
            typeof value === 'string' ? value : '',
          ]),
        );
        void submit(values)
          .catch(() => undefined)
          .finally(() => setBusy(false));
      }}
    >
      {fields.map(([name, label, type]) => (
        <label key={name}>
          {label}
          <input
            name={name}
            required={!label.includes('opcional')}
            defaultValue={defaults[name]}
            autoComplete="off"
            type={type === 'money' ? 'text' : type}
            inputMode={type === 'money' ? 'numeric' : undefined}
            min={type === 'number' ? 0 : undefined}
            step={type === 'number' ? 1 : undefined}
            placeholder={type === 'money' ? 'R$ 0,00' : undefined}
            onInput={(event) => {
              if (type !== 'money') return;
              event.currentTarget.value = formatMoneyInput(event.currentTarget.value);
              event.currentTarget.setSelectionRange(
                event.currentTarget.value.length,
                event.currentTarget.value.length,
              );
            }}
          />
        </label>
      ))}
      <button className="primary wide" disabled={busy}>
        {busy ? 'Salvando…' : button}
      </button>
    </form>
  );
}

export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header>
          <h2 id="modal-title">{title}</h2>
          <button onClick={close} aria-label="Fechar">
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <span>○</span>
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}

export function Tour({ step, close, next }: { step: number; close: () => void; next: () => void }) {
  const slides = [
    {
      title: 'Seu negócio, sem complicação',
      text: 'Aqui você registra vendas, acompanha fiados e anota despesas usando palavras do dia a dia.',
    },
    {
      title: 'Comece pela visão de hoje',
      text: 'A tela inicial mostra quanto entrou, quanto saiu, quanto sobrou e quem ainda está devendo.',
    },
    {
      title: 'O histórico protege você',
      text: 'Pagamentos e correções ficam registrados. Assim, você não perde o que aconteceu e entende cada valor.',
    },
  ];
  const slide = slides[Math.min(step - 1, 2)]!;
  return (
    <div className="modal-backdrop tour-backdrop">
      <section className="tour">
        <span className="tour-art">{step === 1 ? '✓' : step === 2 ? 'R$' : '↻'}</span>
        <span className="eyebrow">PASSO {step} DE 3</span>
        <h2>{slide.title}</h2>
        <p>{slide.text}</p>
        <div className="tour-dots">
          {slides.map((_, index) => (
            <span className={index === step - 1 ? 'active' : ''} key={index} />
          ))}
        </div>
        <button className="primary wide" onClick={step === 3 ? close : next}>
          {step === 3 ? 'Começar a usar' : 'Continuar'}
        </button>
        <button className="text-button" onClick={close}>
          Pular apresentação
        </button>
      </section>
    </div>
  );
}
