import { useRequester } from "../../context/RequesterContext";

export default function RequesterBadge() {
  const { requester, clearRequester } = useRequester();

  if (!requester) return null;

  return (
    <div className="d-flex align-items-center gap-2">
      <span className="small text-white-50">
        Testing as: <strong className="text-white">{requester.name}</strong>
      </span>
      <button
        className="btn btn-sm btn-zen-secondary bg-white"
        onClick={clearRequester}
      >
        Change Requester
      </button>
    </div>
  );
}
