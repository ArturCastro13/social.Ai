import { describe, expect, it } from "vitest";
import { IDS_NICHO, NICHOS, type BrandProfile } from "@/lib/types";
import { palpiteNicho } from "@/lib/engine/nicho";
import { nichoDoMotor, nichoParaMotor } from "@/lib/motor/mapa";
import { nichoSchema } from "@/lib/virais/schema";

const marca = (texto: string) =>
  ({ title: texto, description: texto, og: { title: null, description: null, image: null }, headings: { h1: [], h2: [] }, paragrafos: [] }) as unknown as BrandProfile;

describe("nichos", () => {
  it("os 8 nichos estão no tipo, na lista e no esquema", () => {
    expect(IDS_NICHO).toHaveLength(8);
    expect(NICHOS.map((n) => n.id)).toEqual([...IDS_NICHO]);
    for (const id of IDS_NICHO) expect(nichoSchema.safeParse(id).success).toBe(true);
  });

  it("o palpite reconhece os nichos novos", () => {
    expect(palpiteNicho(marca("Agência de marketing digital: tráfego pago, social media e branding para marcas")).nicho).toBe("marketing-agencias");
    expect(palpiteNicho(marca("Clínica de estética no seu bairro. Agende sua avaliação, horário de funcionamento estendido")).nicho).toBe("servicos-locais");
    expect(palpiteNicho(marca("SDK open source para desenvolvedores criarem agentes com LLM")).nicho).toBe("ia-dev");
  });

  it("os ids do motor vão e voltam", () => {
    for (const id of IDS_NICHO) expect(nichoDoMotor(nichoParaMotor(id))).toBe(id);
  });
});
