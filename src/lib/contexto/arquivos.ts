import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { ErroContexto } from "./erros";
export const MAX_ARQUIVO = 3_000_000;
export type ArquivoValidado = { mime: "application/pdf" | "image/png" | "image/jpeg"; bytes: Uint8Array };

export async function validarArquivo(file: File): Promise<ArquivoValidado> {
  if (!file.size) throw new ErroContexto("O arquivo está vazio.");
  if (file.size > MAX_ARQUIVO) throw new ErroContexto("Cada arquivo pode ter até 3 MB.", 413, "tamanho");
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = bytes.subarray(0, 5).toString() === "%PDF-" ? "application/pdf"
    : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "image/png"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "image/jpeg" : null;
  if (!mime) throw new ErroContexto("Use um PDF, PNG ou JPG válido.");
  if (file.type && file.type !== "application/octet-stream" && file.type !== mime) throw new ErroContexto("O tipo do arquivo não corresponde ao conteúdo.");
  const ext = mime === "application/pdf" ? /\.pdf$/i : mime === "image/png" ? /\.png$/i : /\.jpe?g$/i;
  if (!ext.test(file.name)) throw new ErroContexto("A extensão do arquivo não corresponde ao conteúdo.");
  if (mime === "application/pdf") {
    try {
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, throwOnInvalidObject: true });
      if (pdf.getPageCount() < 1 || pdf.getPageCount() > 20) throw new ErroContexto("Envie um PDF com 1 a 20 páginas.");
    } catch (e) {
      if (e instanceof ErroContexto) throw e;
      throw new ErroContexto(/encrypt/i.test(String(e)) ? "PDF protegido por senha. Exporte uma cópia sem senha." : "Não consegui ler esse PDF. Ele pode estar corrompido.");
    }
    return { mime, bytes };
  }
  try {
    const img = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "warning", animated: true });
    const meta = await img.metadata();
    if ((meta.pages ?? 1) > 1) throw new ErroContexto("Use uma imagem estática, sem animação.");
    const clean = await img.rotate().toFormat(mime === "image/png" ? "png" : "jpeg").toBuffer();
    if (clean.length > MAX_ARQUIVO) throw new ErroContexto("A imagem processada excede 3 MB. Reduza a resolução.", 413, "tamanho");
    return { mime, bytes: clean };
  } catch (e) {
    if (e instanceof ErroContexto) throw e;
    throw new ErroContexto("Imagem inválida ou grande demais em resolução. Use até 16 megapixels.");
  }
}
