import { expect, it } from "vitest";
import { PDFDocument, PDFName, PDFDict, PDFNumber } from "pdf-lib";
import sharp from "sharp";
import { validarArquivo } from "@/lib/contexto/arquivos";

it("valida PDF real e rejeita excesso de páginas", async () => {
  const doc = await PDFDocument.create(); doc.addPage();
  expect((await validarArquivo(new File([new Uint8Array(await doc.save())], "manual.pdf", { type: "application/pdf" }))).mime).toBe("application/pdf");
  for (let i = 0; i < 20; i++) doc.addPage();
  await expect(validarArquivo(new File([new Uint8Array(await doc.save())], "manual.pdf"))).rejects.toThrow(/20 páginas/);
});
it("rejeita bytes falsos, vazios, truncados e excesso antes da IA", async () => {
  for (const f of [new File(["<html>oi</html>"], "marca.png"), new File([], "vazio.pdf"), new File(["%PDF-1.7\nquebrado"], "manual.pdf")]) await expect(validarArquivo(f)).rejects.toThrow();
  await expect(validarArquivo(new File([new Uint8Array(3_000_001)], "marca.png"))).rejects.toThrow(/3 MB/);
});
it("rejeita PDF marcado como criptografado antes de enviar", async () => {
  const doc = await PDFDocument.create(); doc.addPage();
  const encrypt = PDFDict.withContext(doc.context);
  encrypt.set(PDFName.of("Filter"), PDFName.of("Standard")); encrypt.set(PDFName.of("V"), PDFNumber.of(1));
  doc.context.trailerInfo.Encrypt = doc.context.register(encrypt);
  await expect(validarArquivo(new File([new Uint8Array(await doc.save())], "protegido.pdf"))).rejects.toThrow(/protegido|senha/);
});
it("decodifica PNG/JPEG reais, rejeita MIME conflitante e imagem truncada", async () => {
  for (const format of ["png", "jpeg"] as const) {
    const bytes = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#0055AA" } }).toFormat(format).toBuffer();
    expect((await validarArquivo(new File([new Uint8Array(bytes)], `marca.${format}`, { type: `image/${format}` }))).mime).toBe(`image/${format}`);
    await expect(validarArquivo(new File([new Uint8Array(bytes)], `marca.${format}`, { type: "application/pdf" }))).rejects.toThrow();
    await expect(validarArquivo(new File([new Uint8Array(bytes.subarray(0, 24))], `marca.${format}`))).rejects.toThrow();
  }
});
it("rejeita bomba de pixels apesar de comprimida", async () => {
  const bytes = await sharp({ create: { width: 4100, height: 4100, channels: 3, background: "white" } }).png().toBuffer();
  await expect(validarArquivo(new File([new Uint8Array(bytes)], "enorme.png"))).rejects.toThrow();
});
