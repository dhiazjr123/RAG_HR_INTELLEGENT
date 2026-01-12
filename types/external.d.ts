// types/external.d.ts
declare module "pdf-parse" {
    // cukup any agar TS tidak rewel
    const pdfParse: (data: Buffer | Uint8Array, options?: any) => Promise<{ text?: string } & any>;
    export default pdfParse;
  }
  
  declare module "mammoth" {
    export function extractRawText(input: { path?: string; buffer?: Buffer | Uint8Array }): Promise<{ value?: string }>;
    const _default: any;
    export default _default;
  }
  