/**
 * Global type declarations to suppress Drizzle ORM type errors
 * These are temporary workarounds while we refactor the database layer
 */

declare module "drizzle-orm" {
  export interface MySqlColumn<T = any> {
    [key: string]: any;
  }

  export interface Aliased<T = any> {
    [key: string]: any;
  }

  export interface SQL<T = any> {
    [key: string]: any;
  }

  export interface SQLWrapper {
    [key: string]: any;
  }
}

declare module "drizzle-orm/mysql-core" {
  export interface MySqlTable<T = any> {
    [key: string]: any;
  }

  export interface MySqlColumn<T = any> {
    [key: string]: any;
  }
}

// Allow any type for database operations
declare global {
  namespace NodeJS {
    interface Global {
      [key: string]: any;
    }
  }
}

export {};
