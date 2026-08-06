# Product Vision

## Problem

Many small Brazilian businesses still manage day-to-day operations with notebooks, loose paper, memory, or informal phone messages. This creates practical problems:

- The merchant may not know clearly who still owes money.
- Payment history can be lost or overwritten.
- Expenses and sales can be hard to compare at the end of the day or month.
- Paper records can be damaged, misplaced, or misunderstood by another employee.
- Existing ERP systems can feel too complex, technical, or expensive for the merchant's real routine.

Sem Caderno exists to replace the notebook without forcing the merchant to learn how to use an ERP.

## Product Positioning

Sem Caderno is a simple management system for bars, small grocery stores, neighborhood shops, and similar establishments. Its value is simplicity, clarity, and reducing dependence on paper.

It should help the merchant answer everyday questions such as:

- "Quem está devendo?"
- "Quanto entrou hoje?"
- "Quanto saiu este mês?"
- "Quanto sobrou este mês?"
- "O cliente já pagou alguma parte?"

## Target Users

The initial product is for small-business owners, family operators, and trusted employees who handle sales, expenses, collections, and basic customer records. Some users may have limited comfort with technology, may use older phones, and may operate in a busy counter environment.

## Success Criteria

Early product success should be measured by practical adoption, not by feature count:

- A merchant can register customers and products without training.
- A merchant can record a paid or unpaid sale quickly.
- A merchant can see customer debt and payment history without reconstructing notebook entries.
- A merchant can record simple expenses and understand what entered, what left, and what remains.
- A merchant can send a manual Pix or WhatsApp collection message without automatic bank integration.
- The product avoids ERP-like complexity in the MVP.

## Confirmed Decisions

- The web application is the primary operational interface.
- The mobile application is a supporting client for photos, collections, and report consultation.
- The MVP must stay deliberately small.
- Pix in the MVP is manual: the system may generate or share a payment message containing amount and Pix information, but payment confirmation is performed manually.
- Future payment provider integration must remain behind a domain boundary.

## Assumptions

- The first users are Brazilian small businesses with simple sales and debt tracking needs.
- The merchant values speed and clarity more than advanced configuration.
- Some businesses may use the system on a phone even when using the web application.
- Product photos are useful but not required for every product.

## Open Questions

- Which business segment should be validated first: bars, small grocery stores, or neighborhood shops?
- Which payment methods besides Pix and cash must be represented in the first specifications?
- What level of employee permission control is required for the first release?
- What exact offline or poor-connectivity behavior is required, if any?

## Future Possibilities

Future possibilities must not enter the MVP without explicit specification and scope approval:

- Automatic Pix charge creation and reconciliation.
- Tax invoice issuance.
- Marketplace or delivery integrations.
- Kitchen, table, printer, loyalty, inventory purchasing, or accounting features.
