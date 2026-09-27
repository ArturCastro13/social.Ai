"use client";

import { createContext } from "react";
import type { EstadoCapa } from "@/lib/client/capas";

/** Estado da capa automática de cada post, por id. O cartão do post mostra "Pintando a capa". */
export const CapasContexto = createContext<Record<string, EstadoCapa>>({});
