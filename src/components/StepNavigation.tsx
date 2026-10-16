'use client';

import React from 'react';
import { Settings2, CheckSquare, Printer, Check, ArrowRight } from 'lucide-react';

export type WorkflowStep = 'setup' | 'verify' | 'preview';

interface StepNavigationProps {
  currentStep: WorkflowStep;
  onStepChange: (step: WorkflowStep) => void;
  pendingCount: number;
  totalLotteries: number;
  isFooterReviewed: boolean;
  canExport: boolean;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  onStepChange,
  pendingCount,
  totalLotteries,
  isFooterReviewed,
  canExport,
}) => {
  const steps: {
    id: WorkflowStep;
    number: number;
    title: string;
    titleSi: string;
    subtitle: string;
    icon: React.ElementType;
    isComplete: boolean;
  }[] = [
    {
      id: 'setup',
      number: 1,
      title: 'Setup & Source',
      titleSi: 'සකස් කිරීම',
      subtitle: 'Date & document source',
      icon: Settings2,
      isComplete: true,
    },
    {
      id: 'verify',
      number: 2,
      title: 'Review & Verify',
      titleSi: 'පරීක්ෂාව',
      subtitle: pendingCount === 0 && isFooterReviewed 
        ? `All ${totalLotteries} lotteries verified` 
        : `${totalLotteries - pendingCount}/${totalLotteries} verified`,
      icon: CheckSquare,
      isComplete: pendingCount === 0 && isFooterReviewed,
    },
    {
      id: 'preview',
      number: 3,
      title: 'Preview & Print',
      titleSi: 'මුද්‍රණය',
      subtitle: 'Print-ready dual A4 PDF',
      icon: Printer,
      isComplete: canExport,
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center justify-between py-2.5 overflow-x-auto gap-2 sm:gap-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isFinished = step.isComplete;

            return (
              <React.Fragment key={step.id}>
                {idx > 0 && (
                  <div className="hidden sm:flex items-center text-slate-300 px-1">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onStepChange(step.id)}
                  className={`flex-1 sm:flex-initial flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all text-left outline-none cursor-pointer ${
                    isActive
                      ? 'bg-blue-50/80 text-blue-900 ring-1 ring-blue-500/30 shadow-2xs'
                      : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isFinished && step.id !== currentStep
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isFinished && step.id !== currentStep ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <span>{step.number}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold truncate">
                        {step.title}
                      </span>
                      <span className="text-[11px] font-sinhala text-slate-500 hidden md:inline">
                        ({step.titleSi})
                      </span>
                    </div>
                    <p className={`text-[11px] truncate font-medium ${
                      isActive ? 'text-blue-700' : 'text-slate-600'
                    }`}>
                      {step.subtitle}
                    </p>
                  </div>
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
