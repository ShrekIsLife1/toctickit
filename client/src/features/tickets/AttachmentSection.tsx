import { useRef, useState } from "react";
import { Attachment, uploadAttachment, removeAttachment } from "../../api";

interface Props {
  requesterId: number;
  ticketId: number;
  attachments: Attachment[];
  onAttachmentsChanged: () => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentSection({
  requesterId,
  ticketId,
  attachments,
  onAttachmentsChanged,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const activeCount = attachments.filter((a) => !a.isRemoved).length;

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Only JPG, PNG, WEBP, and PDF files are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError("File exceeds the 5 MB size limit.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (activeCount >= 5) {
      setUploadError("This ticket already has 5 active attachments.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      await uploadAttachment(requesterId, ticketId, file);
      onAttachmentsChanged();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirmRemove(attachmentId: number) {
    if (removalReason.trim().length < 3) return;
    try {
      await removeAttachment(requesterId, attachmentId, removalReason.trim());
      setRemovingId(null);
      setRemovalReason("");
      onAttachmentsChanged();
    } catch {
      // Keep the confirmation UI open so the requester can retry.
    }
  }

  async function handleDownload(attachment: Attachment) {
    setDownloadError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/api/attachments/${attachment.id}/download`, {
        headers: { "X-Requester-Id": String(requesterId) },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.originalFilename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Unable to download this file. Please try again.");
    }
  }

  return (
    <div className="card mt-4">
      <div className="card-body">
        <h2 className="h5 mb-3">Attachments</h2>

        <p className="text-muted small">
          Allowed: JPG, JPEG, PNG, WEBP, PDF. Max 5 MB per file. {activeCount} of 5 slots used.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          className="form-control mb-2"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={handleFileSelected}
          disabled={uploading || activeCount >= 5}
        />
        {uploading && <p className="text-muted small">Uploading…</p>}
        {uploadError && <div className="alert alert-danger py-2 small">{uploadError}</div>}
        {downloadError && <div className="alert alert-danger py-2 small">{downloadError}</div>}

        {attachments.length === 0 ? (
          <p className="text-muted">No attachments yet.</p>
        ) : (
          <ul className="list-group">
            {attachments.map((a) => (
              <li key={a.id} className="list-group-item">
                {a.isRemoved ? (
                  <div className="text-muted">
                    <span className="text-decoration-line-through">{a.originalFilename}</span>{" "}
                    <span className="badge bg-secondary">Removed</span>
                    <div className="small">Reason: {a.removalReason}</div>
                  </div>
                ) : (
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                      <strong>{a.originalFilename}</strong>{" "}
                      <span className="text-muted small">({formatSize(a.sizeBytes)})</span>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-outline-success btn-sm"
                        onClick={() => handleDownload(a)}
                      >
                        Download
                      </button>
                      {removingId === a.id ? (
                        <div className="d-flex gap-1 align-items-center">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Removal reason…"
                            value={removalReason}
                            onChange={(e) => setRemovalReason(e.target.value)}
                          />
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={removalReason.trim().length < 3}
                            onClick={() => handleConfirmRemove(a.id)}
                          >
                            Confirm
                          </button>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => {
                              setRemovingId(null);
                              setRemovalReason("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => setRemovingId(a.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}