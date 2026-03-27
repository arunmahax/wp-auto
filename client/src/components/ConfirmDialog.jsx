import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-content max-w-sm mx-4">
        <div className="p-6">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(220, 38, 38, 0.2)' }}
          >
            <AlertTriangle className="w-6 h-6" style={{ color: 'var(--error-400)' }} />
          </div>
          <h3 className="text-lg font-semibold text-center" style={{ color: 'var(--text-50)' }}>{title}</h3>
          <p className="mt-2 text-sm text-center" style={{ color: 'var(--text-400)' }}>{message}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={onConfirm} className="btn btn-danger">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
