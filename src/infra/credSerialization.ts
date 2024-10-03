// Serializa as credenciais para salvar no banco
export const encodeCreds = (creds: any) => {
    return JSON.stringify(creds, (key, value) => {
      // Converte `Uint8Array` e `Buffer` para base64
      if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
        return {
          type: 'Buffer',
          data: Array.from(value), // Converte Buffer ou Uint8Array em array
        };
      }
      return value;
    });
  };
// Desserializa as credenciais recuperadas do banco
// Desserializa as credenciais recuperadas do banco
export const decodeCreds = (credsString: string) => {
    return JSON.parse(credsString, (key, value) => {
      // Verifica se o valor é um objeto complexo com `type` e `data`
      if (value && value.type && value.data && Array.isArray(value.data)) {
        return Buffer.from(value.data);  // Converte o array de volta para Buffer
      }
      return value;
    });
  };
  
