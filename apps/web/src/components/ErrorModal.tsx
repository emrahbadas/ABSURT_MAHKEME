type ErrorModalProps = {
  message: string;
};

export function ErrorModal({ message }: ErrorModalProps) {
  return (
    <div className="rounded-md border border-danger/70 bg-danger/10 p-3 text-sm text-textPrimary">
      {message}
    </div>
  );
}
