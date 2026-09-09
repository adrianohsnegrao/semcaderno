'use client';

import { type FormEvent, useState } from 'react';

import { type Snapshot, money, parseMoney, shortDate } from './model';
import { Empty, Modal, SimpleForm } from './ui';

export function Home({
  data,
  openSale,
  openCustomers,
}: {
  data: Snapshot;
  openSale: () => void;
  openCustomers: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const received = data.payments
    .filter((payment) => payment.createdAt.slice(0, 10) === today)
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  const spent = data.expenses
    .filter((expense) => expense.occurredOn === today)
    .reduce((sum, expense) => sum + expense.amountCents, 0);
  const outstanding = data.sales.reduce((sum, sale) => sum + sale.outstandingCents, 0);
  const debtors = data.customers
    .map((customer) => ({
      customer,
      amount: data.sales
        .filter((sale) => sale.customerId === customer.id)
        .reduce((sum, sale) => sum + sale.outstandingCents, 0),
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  return (
    <div className="page-grid">
      <section className="welcome">
        <div>
          <span>Bom dia, {data.user.name.split(' ')[0]}!</span>
          <h2>Como está o movimento por aí?</h2>
        </div>
        <button className="primary" onClick={openSale}>
          + Registrar nova venda
        </button>
      </section>
      <section className="summary-grid">
        <Summary
          label="Entrou hoje"
          value={money(received)}
          note="Pagamentos recebidos"
          tone="green"
        />
        <Summary label="Saiu hoje" value={money(spent)} note="Despesas registradas" tone="orange" />
        <Summary
          label="Sobrou hoje"
          value={money(received - spent)}
          note="Entrou menos saiu"
          tone="blue"
        />
        <Summary
          label="Total em aberto"
          value={money(outstanding)}
          note={`${debtors.length} ${debtors.length === 1 ? 'cliente deve' : 'clientes devem'}`}
          tone="red"
        />
      </section>
      <div className="two-columns">
        <section className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow">FIADOS</span>
              <h3>Quem está devendo</h3>
            </div>
            <button className="text-button" onClick={openCustomers}>
              Ver todos →
            </button>
          </div>
          {debtors.length ? (
            <div className="debt-list">
              {debtors.slice(0, 4).map(({ customer, amount }) => (
                <button key={customer.id} onClick={openCustomers}>
                  <span className="avatar soft">{customer.name.slice(0, 2).toUpperCase()}</span>
                  <span>
                    <b>{customer.name}</b>
                    <small>
                      {customer.phone
                        ? `WhatsApp final ${customer.phone.slice(-4)}`
                        : 'Sem telefone'}
                    </small>
                  </span>
                  <strong>{money(amount)}</strong>
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="Nenhum valor em aberto"
              text="Quando uma venda ficar fiada, ela aparecerá aqui."
            />
          )}
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow">ÚLTIMOS REGISTROS</span>
              <h3>Atividade recente</h3>
            </div>
          </div>
          <div className="activity-list compact-list">
            {data.activities.slice(0, 5).map((item) => (
              <div key={item.id}>
                <span className={`activity-dot ${item.kind}`}>•</span>
                <span>
                  <b>{item.title}</b>
                  <small>
                    {item.detail} · {shortDate(item.createdAt)}
                  </small>
                </span>
                {item.amountCents !== undefined && <strong>{money(item.amountCents)}</strong>}
              </div>
            ))}
          </div>
        </section>
      </div>
      <p className="explain-note">
        <b>Como calculamos:</b> “Entrou” considera pagamentos recebidos hoje. “Saiu” considera as
        despesas de hoje. “Sobrou” é uma visão simples do caixa, não um relatório contábil.
      </p>
    </div>
  );
}

function Summary({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <article className={`summary ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

export function SaleForm({
  data,
  submit,
}: {
  data: Snapshot;
  submit: (body: unknown) => Promise<unknown>;
}) {
  const [items, setItems] = useState([{ description: '', quantity: 1, price: '' }]);
  const [customerId, setCustomerId] = useState('');
  const [paid, setPaid] = useState<'full' | 'partial' | 'none'>('full');
  const [received, setReceived] = useState('');
  const [method, setMethod] = useState('pix');
  const [busy, setBusy] = useState(false);
  const total = items.reduce((sum, item) => sum + item.quantity * (parseMoney(item.price) || 0), 0);
  const amountPaid = paid === 'full' ? total : paid === 'none' ? 0 : parseMoney(received);
  const send = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await submit({
        ...(customerId ? { customerId } : {}),
        amountPaidCents: amountPaid,
        paymentMethod: method,
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: parseMoney(item.price),
        })),
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="sale-layout" onSubmit={(event) => void send(event)}>
      <section className="card form-card">
        <div className="section-heading">
          <span className="step">1</span>
          <div>
            <h2>O que foi vendido?</h2>
            <p>Você pode digitar o item na hora, como faria no caderno.</p>
          </div>
        </div>
        {items.map((item, index) => (
          <div className="sale-item" key={index}>
            <label className="grow">
              Item
              <input
                required
                value={item.description}
                list="products"
                placeholder="Ex.: 2 refrigerantes"
                onChange={(event) =>
                  setItems(
                    items.map((old, itemIndex) =>
                      itemIndex === index ? { ...old, description: event.target.value } : old,
                    ),
                  )
                }
              />
            </label>
            <label>
              Qtd.
              <input
                required
                type="number"
                min="1"
                max="999"
                value={item.quantity}
                onChange={(event) =>
                  setItems(
                    items.map((old, itemIndex) =>
                      itemIndex === index ? { ...old, quantity: Number(event.target.value) } : old,
                    ),
                  )
                }
              />
            </label>
            <label>
              Valor unitário
              <input
                required
                inputMode="decimal"
                placeholder="0,00"
                value={item.price}
                onChange={(event) =>
                  setItems(
                    items.map((old, itemIndex) =>
                      itemIndex === index ? { ...old, price: event.target.value } : old,
                    ),
                  )
                }
              />
            </label>
            {items.length > 1 && (
              <button
                type="button"
                className="remove"
                aria-label="Remover item"
                onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <datalist id="products">
          {data.products
            .filter((product) => product.active)
            .map((product) => (
              <option key={product.id} value={product.name}>
                {money(product.priceCents)}
              </option>
            ))}
        </datalist>
        <button
          type="button"
          className="secondary dashed"
          onClick={() => setItems([...items, { description: '', quantity: 1, price: '' }])}
        >
          + Adicionar outro item
        </button>
        <div className="section-heading divided">
          <span className="step">2</span>
          <div>
            <h2>Como ficou o pagamento?</h2>
            <p>Informe se recebeu agora ou se ficou em aberto.</p>
          </div>
        </div>
        <div className="choice-grid">
          {(
            [
              ['full', 'Pago agora'],
              ['partial', 'Pago em parte'],
              ['none', 'Ficou fiado'],
            ] as const
          ).map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={paid === id ? 'selected' : ''}
              onClick={() => setPaid(id)}
            >
              <span className="radio">{paid === id ? '●' : ''}</span>
              {label}
            </button>
          ))}
        </div>
        {paid !== 'full' && (
          <label>
            Cliente
            <select
              required
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="">Escolha quem comprou</option>
              {data.customers
                .filter((customer) => customer.active)
                .map((customer) => (
                  <option value={customer.id} key={customer.id}>
                    {customer.name}
                  </option>
                ))}
            </select>
            <small>Para saber depois quem está devendo.</small>
          </label>
        )}
        {paid === 'partial' && (
          <label>
            Quanto recebeu agora?
            <input
              required
              inputMode="decimal"
              placeholder="0,00"
              value={received}
              onChange={(event) => setReceived(event.target.value)}
            />
          </label>
        )}
        {paid !== 'none' && (
          <label>
            Como recebeu?
            <select value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="pix">Pix</option>
              <option value="cash">Dinheiro</option>
              <option value="card">Cartão</option>
              <option value="other">Outro</option>
            </select>
          </label>
        )}
      </section>
      <aside className="card checkout">
        <span className="eyebrow">RESUMO DA VENDA</span>
        <div className="checkout-items">
          {items
            .filter((item) => item.description)
            .map((item, index) => (
              <span key={index}>
                <span>
                  {item.quantity}× {item.description}
                </span>
                <b>{money(item.quantity * (parseMoney(item.price) || 0))}</b>
              </span>
            ))}
        </div>
        <div className="checkout-total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>
        <div className="checkout-line">
          <span>Recebido agora</span>
          <b>{money(Number.isFinite(amountPaid) ? amountPaid : 0)}</b>
        </div>
        <div className="checkout-line open">
          <span>Fica em aberto</span>
          <b>{money(Math.max(0, total - (Number.isFinite(amountPaid) ? amountPaid : 0)))}</b>
        </div>
        <button className="primary wide" disabled={busy || total <= 0}>
          {busy ? 'Registrando…' : 'Confirmar venda'}
        </button>
        <small className="safe-copy">
          O registro fica no histórico e pode ser corrigido sem apagar o que aconteceu.
        </small>
      </aside>
    </form>
  );
}

export function Customers({
  data,
  create,
  pay,
  collect,
}: {
  data: Snapshot;
  create: (body: unknown) => Promise<unknown>;
  pay: (body: unknown) => Promise<unknown>;
  collect: (body: unknown) => Promise<unknown>;
}) {
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [action, setAction] = useState<'pay' | 'collect'>();
  const rows = data.customers.map((customer) => ({
    customer,
    sales: data.sales.filter(
      (sale) => sale.customerId === customer.id && sale.status !== 'cancelled',
    ),
    debt: data.sales
      .filter((sale) => sale.customerId === customer.id)
      .reduce((sum, sale) => sum + sale.outstandingCents, 0),
  }));
  const current = rows.find((row) => row.customer.id === selected);
  return (
    <div>
      <div className="page-actions">
        <p>Veja o histórico e os valores em aberto de cada pessoa.</p>
        <button className="primary" onClick={() => setAdding(true)}>
          + Adicionar cliente
        </button>
      </div>
      <section className="card table-card">
        <div className="table-head">
          <span>Cliente</span>
          <span>Última compra</span>
          <span>Situação</span>
          <span>Em aberto</span>
        </div>
        {rows.length ? (
          rows.map(({ customer, sales, debt }) => (
            <button
              className="table-row"
              key={customer.id}
              onClick={() => setSelected(customer.id)}
            >
              <span className="person">
                <span className="avatar soft">{customer.name.slice(0, 2).toUpperCase()}</span>
                <span>
                  <b>{customer.name}</b>
                  <small>{customer.phone ?? 'Sem telefone'}</small>
                </span>
              </span>
              <span>{sales[0] ? shortDate(sales[0].createdAt) : 'Nenhuma'}</span>
              <span>
                <em className={debt ? 'status pending' : 'status paid'}>
                  {debt ? 'Tem valor em aberto' : 'Tudo certo'}
                </em>
              </span>
              <strong>{money(debt)}</strong>
            </button>
          ))
        ) : (
          <Empty
            title="Nenhum cliente ainda"
            text="Adicione clientes quando precisar registrar uma venda fiada."
          />
        )}
      </section>
      {adding && (
        <Modal title="Adicionar cliente" close={() => setAdding(false)}>
          <SimpleForm
            fields={[
              ['name', 'Nome ou apelido', 'text'],
              ['phone', 'Telefone / WhatsApp', 'tel'],
              ['note', 'Observação (opcional)', 'text'],
            ]}
            submit={async (body) => {
              await create(body);
              setAdding(false);
            }}
            button="Adicionar cliente"
          />
        </Modal>
      )}
      {current && (
        <Modal
          title={current.customer.name}
          close={() => {
            setSelected(undefined);
            setAction(undefined);
          }}
        >
          <div className="customer-summary">
            <span>
              <small>Em aberto</small>
              <strong>{money(current.debt)}</strong>
            </span>
            <span>
              <small>Compras registradas</small>
              <strong>{current.sales.length}</strong>
            </span>
          </div>
          {current.debt > 0 && (
            <div className="modal-actions">
              <button className="primary" onClick={() => setAction('pay')}>
                Registrar pagamento
              </button>
              <button className="secondary" onClick={() => setAction('collect')}>
                Preparar lembrete
              </button>
            </div>
          )}
          {action === 'pay' && (
            <SimpleForm
              fields={[['amount', 'Valor recebido', 'money']]}
              submit={async (body) => {
                const openSale = current.sales.find((sale) => sale.outstandingCents > 0)!;
                await pay({
                  saleId: openSale.id,
                  amountCents: parseMoney(body['amount'] ?? ''),
                  method: 'pix',
                });
                setSelected(undefined);
              }}
              button="Confirmar pagamento"
            />
          )}
          {action === 'collect' && (
            <SimpleForm
              fields={[['amount', 'Valor do lembrete', 'money']]}
              submit={async (body) => {
                const result = (await collect({
                  customerId: current.customer.id,
                  amountCents: parseMoney(body['amount'] ?? ''),
                })) as { whatsappUrl?: string };
                if (result?.whatsappUrl)
                  window.open(result.whatsappUrl, '_blank', 'noopener,noreferrer');
                setSelected(undefined);
              }}
              button="Preparar no WhatsApp"
            />
          )}
          <div className="history">
            <h3>Histórico de compras</h3>
            {current.sales.map((sale) => (
              <div key={sale.id}>
                <span>
                  <b>{shortDate(sale.createdAt)}</b>
                  <small>{sale.items.map((item) => item.description).join(', ')}</small>
                </span>
                <span>
                  <b>{money(sale.totalCents)}</b>
                  <small>
                    {sale.outstandingCents ? `${money(sale.outstandingCents)} em aberto` : 'Pago'}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

export function Products({
  data,
  create,
}: {
  data: Snapshot;
  create: (body: unknown) => Promise<unknown>;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div>
      <div className="page-actions">
        <p>
          Uma lista curta para agilizar vendas frequentes. Também é possível vender itens avulsos.
        </p>
        <button className="primary" onClick={() => setAdding(true)}>
          + Adicionar produto
        </button>
      </div>
      <section className="catalog">
        {data.products.map((product) => (
          <article className="product-card" key={product.id}>
            <span className="product-visual">{product.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <h3>{product.name}</h3>
              <strong>{money(product.priceCents)}</strong>
              <small>{product.active ? 'Disponível nas vendas' : 'Desativado'}</small>
            </div>
          </article>
        ))}
        {!data.products.length && (
          <div className="card">
            <Empty
              title="Sua lista está vazia"
              text="Cadastre os produtos que você vende com mais frequência."
            />
          </div>
        )}
      </section>
      {adding && (
        <Modal title="Adicionar produto" close={() => setAdding(false)}>
          <SimpleForm
            fields={[
              ['name', 'Nome do produto', 'text'],
              ['price', 'Preço de venda', 'money'],
            ]}
            submit={async (body) => {
              await create({ name: body['name'], priceCents: parseMoney(body['price'] ?? '') });
              setAdding(false);
            }}
            button="Adicionar produto"
          />
        </Modal>
      )}
    </div>
  );
}

export function Expenses({
  data,
  create,
}: {
  data: Snapshot;
  create: (body: unknown) => Promise<unknown>;
}) {
  const [adding, setAdding] = useState(false);
  const total = data.expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  return (
    <div>
      <div className="page-actions">
        <p>Registre o dinheiro usado no dia a dia do estabelecimento.</p>
        <button className="primary" onClick={() => setAdding(true)}>
          + Registrar despesa
        </button>
      </div>
      <section className="card">
        <div className="expense-total">
          <span>Total registrado</span>
          <strong>{money(total)}</strong>
        </div>
        <div className="list-lines">
          {data.expenses.map((expense) => (
            <div key={expense.id}>
              <span className="activity-dot expense">•</span>
              <span>
                <b>{expense.description}</b>
                <small>
                  {new Intl.DateTimeFormat('pt-BR').format(
                    new Date(`${expense.occurredOn}T12:00:00`),
                  )}
                </small>
              </span>
              <strong>- {money(expense.amountCents)}</strong>
            </div>
          ))}
        </div>
      </section>
      {adding && (
        <Modal title="Registrar despesa" close={() => setAdding(false)}>
          <SimpleForm
            fields={[
              ['description', 'No que você gastou?', 'text'],
              ['amount', 'Valor', 'money'],
              ['occurredOn', 'Data', 'date'],
            ]}
            defaults={{ occurredOn: new Date().toISOString().slice(0, 10) }}
            submit={async (body) => {
              await create({
                description: body['description'],
                amountCents: parseMoney(body['amount'] ?? ''),
                occurredOn: body['occurredOn'],
              });
              setAdding(false);
            }}
            button="Registrar despesa"
          />
        </Modal>
      )}
    </div>
  );
}

export function ActivityList({
  data,
  cancel,
}: {
  data: Snapshot;
  cancel: (saleId: string, reason: string) => Promise<unknown>;
}) {
  const [selectedSale, setSelectedSale] = useState<string>();
  const sale = data.sales.find((item) => item.id === selectedSale);
  return (
    <div className="activity-columns">
      <section className="card activity-page">
        <h2>O que aconteceu</h2>
        <p>Um histórico simples para entender cada registro, sem apagar o passado.</p>
        <div className="activity-list">
          {data.activities.map((item) => (
            <div key={item.id}>
              <span className={`activity-dot ${item.kind}`}>•</span>
              <span>
                <b>{item.title}</b>
                <small>
                  {item.detail}
                  <br />
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(item.createdAt))}
                </small>
              </span>
              {item.amountCents !== undefined && <strong>{money(item.amountCents)}</strong>}
            </div>
          ))}
        </div>
      </section>
      <section className="card activity-page">
        <h2>Vendas registradas</h2>
        <p>Abra uma venda para conferir os itens ou corrigir um registro.</p>
        <div className="sale-history">
          {data.sales.slice(0, 20).map((item) => (
            <button key={item.id} onClick={() => setSelectedSale(item.id)}>
              <span>
                <b>{item.items.map((line) => line.description).join(', ')}</b>
                <small>
                  {shortDate(item.createdAt)} ·{' '}
                  {item.status === 'paid'
                    ? 'Paga'
                    : item.status === 'partial'
                      ? 'Paga em parte'
                      : item.status === 'open'
                        ? 'Em aberto'
                        : 'Cancelada'}
                </small>
              </span>
              <strong>{money(item.totalCents)}</strong>
            </button>
          ))}
        </div>
      </section>
      {sale && (
        <Modal title="Detalhes da venda" close={() => setSelectedSale(undefined)}>
          <div className="history sale-detail">
            {sale.items.map((item) => (
              <div key={item.id}>
                <span>
                  <b>
                    {item.quantity}× {item.description}
                  </b>
                  <small>{money(item.unitPriceCents)} por unidade</small>
                </span>
                <b>{money(item.totalCents)}</b>
              </div>
            ))}
          </div>
          <div className="checkout-total">
            <span>Total</span>
            <strong>{money(sale.totalCents)}</strong>
          </div>
          <div className="checkout-line">
            <span>Recebido</span>
            <b>{money(sale.paidCents)}</b>
          </div>
          <div className="checkout-line open">
            <span>Em aberto</span>
            <b>{money(sale.outstandingCents)}</b>
          </div>
          {sale.status !== 'cancelled' ? (
            <SimpleForm
              fields={[['reason', 'Motivo da correção', 'text']]}
              submit={async (body) => {
                await cancel(sale.id, body['reason'] ?? '');
                setSelectedSale(undefined);
              }}
              button="Cancelar sem apagar o histórico"
            />
          ) : (
            <div className="inline-error">
              Esta venda foi cancelada e permanece visível no histórico.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export function Settings({
  data,
  save,
  signOut,
}: {
  data: Snapshot;
  save: (body: unknown) => Promise<unknown>;
  signOut: () => Promise<void>;
}) {
  return (
    <div className="settings-grid">
      <section className="card form-card">
        <h2>Dados do estabelecimento</h2>
        <p>Essas informações aparecem nos lembretes enviados aos clientes.</p>
        <SimpleForm
          fields={[
            ['businessName', 'Nome do estabelecimento', 'text'],
            ['pixKey', 'Chave Pix (opcional)', 'text'],
          ]}
          defaults={{ businessName: data.business.name, pixKey: data.business.pixKey ?? '' }}
          submit={save}
          button="Salvar alterações"
        />
      </section>
      <section className="card account-card">
        <h2>Sua conta</h2>
        <p>
          <b>{data.user.name}</b>
          <br />
          {data.user.email}
        </p>
        <button className="secondary danger" onClick={() => void signOut()}>
          Sair deste aparelho
        </button>
      </section>
    </div>
  );
}
