declare module "sql.js" {
  interface Database {
    run(sql: string, params?: any[]): void;
    exec(sql: string): { columns: string[]; values: any[][] }[];
    export(): Uint8Array;
    close(): void;
  }

  interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database;
  }

  interface InitSqlJs {
    (config: { locateFile: (file: string) => string }): Promise<SqlJsStatic>;
  }

  const initSqlJs: InitSqlJs;
  export default initSqlJs;
}
