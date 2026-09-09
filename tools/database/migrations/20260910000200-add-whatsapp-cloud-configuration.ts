import type { MigrationBuilder } from 'node-pg-migrate';

const schema = 'sem_caderno';
const table = (name: string) => ({ schema, name });

export const up = (pgm: MigrationBuilder): void => {
  pgm.addColumns(table('businesses'), {
    whatsapp_waba_id: { type: 'text' },
    whatsapp_phone_number_id: { type: 'text' },
    whatsapp_access_token_ciphertext: { type: 'bytea' },
    whatsapp_template_name: { type: 'text' },
    whatsapp_enabled: { type: 'boolean', notNull: true, default: false },
  });
  pgm.addConstraint(table('businesses'), 'businesses_whatsapp_fields_not_blank', {
    check:
      "(whatsapp_waba_id IS NULL OR btrim(whatsapp_waba_id) <> '') AND (whatsapp_phone_number_id IS NULL OR btrim(whatsapp_phone_number_id) <> '') AND (whatsapp_template_name IS NULL OR btrim(whatsapp_template_name) <> '')",
  });
};
