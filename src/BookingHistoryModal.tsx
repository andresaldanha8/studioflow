import React from "react";
import { XCircle, Calendar, Clock, User } from "lucide-react";

type Remarcacao = {
  de: string;
  para: string;
  quando: string;
  por: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  remarcacoes?: Remarcacao[] | null;
};

export default function BookingHistoryModal({ open, onClose, remarcacoes }: Props) {
  if (!open) return null;

  const items = remarcacoes || [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-md w-full space-y-4 animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center">
            <Calendar className="h-5 w-5 text-indigo-600 mr-2" />
            Histórico de Remarcações
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-72 overflow-auto">
          {items.length === 0 ? (
            <div className="text-center text-sm text-slate-500 py-6">Histórico de remarcações indisponível.</div>
          ) : (
            items.map((r, idx) => {
              // Display 'por' mapping for the two known values, otherwise show raw
              const porLabel = r.por === "profissional" ? "Profissional" : r.por === "cliente" ? "Cliente" : r.por;

              const deDate = new Date(r.de);
              const paraDate = new Date(r.para);

              const formatDate = (d: Date) => {
                return d.toLocaleDateString("pt-BR");
              };

              const formatTime = (d: Date) => {
                return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              };

              return (
                <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <div className="text-sm font-semibold text-slate-800">{formatDate(deDate)}</div>
                  <div className="text-xs text-slate-500 mb-2">{formatTime(deDate)}</div>

                  <div className="text-center text-pink-600 font-bold">↓</div>

                  <div className="text-sm font-semibold text-slate-800 mt-2">{formatDate(paraDate)}</div>
                  <div className="text-xs text-slate-500 mb-2">{formatTime(paraDate)}</div>

                  <div className="flex items-center gap-2 text-[13px] text-slate-600 mt-1">
                    <User className="h-4 w-4 text-slate-400" />
                    <div className="font-medium">{porLabel}</div>
                  </div>

                  <div className="text-[12px] text-slate-400 mt-1">{new Date(r.quando).toLocaleString("pt-BR")}</div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
