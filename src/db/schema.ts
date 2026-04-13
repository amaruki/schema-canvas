import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const schemas = pgTable("schemas", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Untitled Schema"),
  description: text("description"),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  version: integer("version").notNull().default(1),
});

export const schemaVersions = pgTable("schema_versions", {
  id: text("id").primaryKey(),
  schemaId: text("schema_id")
    .notNull()
    .references(() => schemas.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  label: text("label"),
  snapshot: text("snapshot").notNull(), // Stored as JSON string
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const tables = pgTable("tables", {
  id: text("id").primaryKey(),
  schemaId: text("schema_id")
    .notNull()
    .references(() => schemas.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  alias: text("alias"),
  note: text("note"),
  headerColor: text("header_color"),
  positionX: real("position_x").notNull().default(0),
  positionY: real("position_y").notNull().default(0),
  description: text("description"),
  color: text("color"),
});

export const columns = pgTable("columns", {
  id: text("id").primaryKey(),
  tableId: text("table_id")
    .notNull()
    .references(() => tables.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  nullable: boolean("nullable").notNull().default(false),
  primaryKey: boolean("primary_key").notNull().default(false),
  unique: boolean("unique").notNull().default(false),
  defaultValue: text("default_value"),
  note: text("note"),
  increment: boolean("increment"),
  description: text("description"),
  foreignKeyTableId: text("foreign_key_table_id"),
  foreignKeyColumnId: text("foreign_key_column_id"),
  foreignKeyOnDelete: text("foreign_key_on_delete"),
  foreignKeyOnUpdate: text("foreign_key_on_update"),
});

export const relationships = pgTable("relationships", {
  id: text("id").primaryKey(),
  schemaId: text("schema_id")
    .notNull()
    .references(() => schemas.id, { onDelete: "cascade" }),
  sourceTableId: text("source_table_id").notNull(),
  sourceColumnId: text("source_column_id").notNull(),
  targetTableId: text("target_table_id").notNull(),
  targetColumnId: text("target_column_id").notNull(),
  type: text("type").notNull(),
  isInline: boolean("is_inline"),
  name: text("name"),
  onDelete: text("on_delete"),
  onUpdate: text("on_update"),
});

// Relations

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  schemas: many(schemas),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const schemasRelations = relations(schemas, ({ one, many }) => ({
  user: one(users, {
    fields: [schemas.userId],
    references: [users.id],
  }),
  versions: many(schemaVersions),
  tables: many(tables),
  relationships: many(relationships),
}));

export const schemaVersionsRelations = relations(schemaVersions, ({ one }) => ({
  schema: one(schemas, {
    fields: [schemaVersions.schemaId],
    references: [schemas.id],
  }),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  schema: one(schemas, {
    fields: [tables.schemaId],
    references: [schemas.id],
  }),
  columns: many(columns),
}));

export const columnsRelations = relations(columns, ({ one }) => ({
  table: one(tables, {
    fields: [columns.tableId],
    references: [tables.id],
  }),
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  schema: one(schemas, {
    fields: [relationships.schemaId],
    references: [schemas.id],
  }),
}));
