import { Trash2 } from 'lucide-react';

export default function ConfirmDeleteModal({ fileName, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel} id="confirm-delete-overlay">
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()} id="confirm-delete-modal">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--danger-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trash2 size={24} color="var(--danger)" />
          </div>

          <div>
            <h3 style={{ marginBottom: '0.4rem' }}>Delete File?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{fileName}</strong> will be permanently deleted. This action cannot be undone.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={onCancel}
            id="btn-cancel-delete"
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            style={{ flex: 1, justifyContent: 'center', fontWeight: 600 }}
            onClick={onConfirm}
            id="btn-confirm-delete"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
