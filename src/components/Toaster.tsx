import { useToast } from './ToastContext';
import { CheckCircle, XCircle } from 'lucide-react';

export function Toaster() {
  const { toast } = useToast();

  if (!toast.visible) return null;

  const bgColor = toast.type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const Icon = toast.type === 'success' ? CheckCircle : XCircle;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">{toast.message}</p>
      </div>
    </div>
  );
}
