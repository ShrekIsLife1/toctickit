import { useRequester } from "../../context/RequesterContext";

export default function RequesterBadge() {
  const { requester, clearRequester } = useRequester();

  if (!requester) return null;

  return (
    <div className="d-flex align-items-center gap-2">
      <span className="text-muted small">
        Testing as: <strong>{requester.name}</strong>
      </span>
      <button
        className="btn btn-outline-secondary btn-sm"
        onClick={clearRequester}
      >
        Change Requester
      </button>
    </div>
  );
}