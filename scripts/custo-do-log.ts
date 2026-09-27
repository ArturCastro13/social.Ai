// Custo real de uma rodada a partir do log do servidor. Uso: npm run ia:custo -- <arquivo.log> [linha-inicial]
import { readFileSync } from "node:fs";
import { custoDoLog } from "../src/lib/llm/custo";

const [arq, desde = "0"] = process.argv.slice(2);
const texto = readFileSync(arq, "utf8").split("\n").slice(Number(desde)).join("\n");
const r = custoDoLog(texto);
const porTipo = new Map<string, number>();
for (const i of r.itens) porTipo.set(`${i.tipo} ${i.modelo}`, (porTipo.get(`${i.tipo} ${i.modelo}`) ?? 0) + i.dolares);
for (const [k, v] of porTipo) console.log(`${k.padEnd(40)} US$ ${v.toFixed(4)}`);
if (r.desconhecidos.length) console.log(`modelos sem preço (contados como Sonnet): ${[...new Set(r.desconhecidos)].join(", ")}`);
console.log(`TOTAL US$ ${r.total.toFixed(4)}`);
