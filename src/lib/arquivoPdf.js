// src/lib/arquivoPdf.js
//
// Checagem que os dois modos de upload compartilham: descobrir se o arquivo
// escolhido é *mesmo* um PDF.
//
// `File.type` não serve para isso. O navegador deriva esse campo da extensão
// do nome, então qualquer arquivo renomeado para `.pdf` chega ao front como
// "application/pdf" e passa por `validarPdf`. Sem esta checagem o problema só
// apareceria lá na frente: no modo "importar", como um erro cru do pdf.js; no
// modo "ia", depois de subir o arquivo inteiro e gastar cota do Gemini.

// Todo PDF começa com "%PDF-" (ISO 32000-1, seção 7.5.2).
const ASSINATURA = "%PDF-";

// A norma manda a assinatura vir no byte 0, mas geradores desleixados deixam
// lixo antes dela. O próprio pdf.js procura nos primeiros 1024 bytes — fazer
// o mesmo evita recusar aqui um arquivo que os dois destinos leriam sem
// reclamar.
const BYTES_INSPECIONADOS = 1024;

/**
 * Lê o início do arquivo e confere a assinatura de PDF.
 *
 * Segue a convenção de `validarPdf`: devolve string vazia quando está tudo
 * certo e a mensagem de erro quando não está.
 *
 * @param {File} arquivo
 * @returns {Promise<string>}
 */
export async function conferirAssinaturaPdf(arquivo) {
  // `slice` não copia o arquivo: só o pedaço pedido é lido do disco, então o
  // custo é o mesmo para um PDF de 1 MB ou de 10 MB.
  const inicio = await arquivo.slice(0, BYTES_INSPECIONADOS).arrayBuffer();

  // latin1 mapeia byte a byte. Com utf-8, bytes inválidos virariam U+FFFD e a
  // busca pela assinatura poderia escorregar dentro de um binário.
  const texto = new TextDecoder("latin1").decode(inicio);

  if (!texto.includes(ASSINATURA)) {
    return "Este arquivo não é um PDF — tem a extensão .pdf, mas o conteúdo é outro. Exporte o material como PDF e tente de novo.";
  }

  return "";
}
