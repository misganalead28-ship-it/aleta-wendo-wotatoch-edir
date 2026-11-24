import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'ያልተጠበቀ የሲስተም ስህተት አጋጥሟል።',
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F8F6] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#E2E6E1] rounded-xl p-8">
            <div className="flex items-center gap-3 text-[#DC2626] mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-semibold text-[#111815]">የሥርዓት መልዕክት</h2>
            </div>
            <p className="text-sm text-[#4B5563] leading-relaxed mb-6 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              ገጹን እንደገና ጫን
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
