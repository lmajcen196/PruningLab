import { Cpu, Info } from "lucide-react";
import type { Model } from "../types";
import models from "./models";

interface ModelSelectorProps {
   selectedModel: Model;
   setSelectedModel: (model: Model) => void;
}

export default function ModelSelector({
   selectedModel,
   setSelectedModel,
}: ModelSelectorProps) {
   return (
      <div className="h-full rounded-2xl border border-[#3b82f6]/25 bg-gradient-to-br from-[#111d33]/90 via-[#151a28]/90 to-[#111827]/90 p-5 shadow-xl shadow-black/20 transition-all duration-300 hover:border-[#3b82f6]/45">
         <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]">
               <Cpu className="h-5 w-5" />
            </div>

            <div>
               <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#93c5fd]">
                  Model
               </p>
               <h2 className="text-lg font-bold text-[#f8fafc]">
                  Target Model
               </h2>
            </div>
         </div>

         <select
            value={selectedModel.id}
            onChange={(e) =>
               setSelectedModel(
                  models.find((m) => m.id === e.target.value) || models[0]
               )
            }
            className="mb-4 w-full cursor-pointer appearance-none rounded-xl border-2 border-[#3b82f6]/45 bg-[#252532] px-4 py-3 pr-10 text-base font-semibold text-[#f8fafc] outline-none transition-all duration-200 hover:border-[#3b82f6]/70 focus:border-[#3b82f6]"
            style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
               backgroundRepeat: "no-repeat",
               backgroundPosition: "right 0.75rem center",
               backgroundSize: "1.25rem 1.25rem",
            }}
         >
            {models.map((model) => (
               <option key={model.id} value={model.id} className="bg-[#252532]">
                  {model.name}
               </option>
            ))}
         </select>

         <div className="rounded-xl border border-[#3b82f6]/20 bg-[#3b82f6]/10 p-4">
            <div className="flex items-start gap-3">
               <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#3b82f6]" />
               <p className="text-sm leading-relaxed text-[#cbd5e1]">
                  {selectedModel.description}
               </p>
            </div>
         </div>
      </div>
   );
}
