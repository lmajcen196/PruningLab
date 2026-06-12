import { Sword, Info } from "lucide-react";
import type { Attack } from "../types";
import attacks from "./attacks";

interface AttackSelectorProps {
   selectedAttack: Attack;
   setSelectedAttack: (attack: Attack) => void;
   onInfoClick: (title: string, body: string, refs: string[]) => void;
}

export default function AttackSelector({
   selectedAttack,
   setSelectedAttack,
   onInfoClick,
}: AttackSelectorProps) {
   return (
      <div className="h-full rounded-2xl border border-[#ef4444]/25 bg-gradient-to-br from-[#21151c]/90 via-[#171923]/90 to-[#111827]/90 p-5 shadow-xl shadow-black/20 transition-all duration-300 hover:border-[#ef4444]/45">
         <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
               <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]">
                  <Sword className="h-5 w-5" />
               </div>

               <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#fca5a5]">
                     Attack
                  </p>
                  <h2 className="text-lg font-bold text-[#f8fafc]">
                     Attack Vector
                  </h2>
               </div>
            </div>

            <button
               type="button"
               onClick={() => {
                  onInfoClick(
                     selectedAttack.name,
                     selectedAttack.longDescription ||
                        selectedAttack.description ||
                        "",
                     selectedAttack.references || []
                  );
               }}
               title={selectedAttack.description}
               className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444] transition-all duration-200 hover:bg-[#ef4444]/20 hover:border-[#ef4444]/60"
            >
               <Info size={18} />
            </button>
         </div>

         <select
            value={selectedAttack.id}
            onChange={(e) =>
               setSelectedAttack(
                  attacks.find((a) => a.id === e.target.value) || attacks[0]
               )
            }
            className="mb-4 w-full cursor-pointer appearance-none rounded-xl border-2 border-[#ef4444]/35 bg-[#252532] px-4 py-3 pr-10 text-base font-semibold text-[#f8fafc] outline-none transition-all duration-200 hover:border-[#ef4444]/60 focus:border-[#ef4444]"
            style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ef4444'%3E%3Cpath strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
               backgroundRepeat: "no-repeat",
               backgroundPosition: "right 0.75rem center",
               backgroundSize: "1.25rem 1.25rem",
            }}
         >
            {attacks.map((attack) => (
               <option key={attack.id} value={attack.id} className="bg-[#252532]">
                  {attack.name}
               </option>
            ))}
         </select>

         <div className="rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/10 p-4">
            <div className="flex items-start gap-3">
               <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#ef4444]" />
               <p className="text-sm leading-relaxed text-[#cbd5e1]">
                  {selectedAttack.description}
               </p>
            </div>
         </div>
      </div>
   );
}
