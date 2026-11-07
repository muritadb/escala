export function Notice({
  messages,
  error = false,
}: {
  messages: string[];
  error?: boolean;
}) {
  if (!messages.length) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={
        "mb-6 max-h-64 overflow-auto border-l-4 px-5 py-4 leading-relaxed " +
        (error ? "border-red-600 bg-red-50" : "border-amber-500 bg-amber-50")
      }
    >
      {messages.slice(0, 30).map((message, index) => (
        <p key={index}>{message}</p>
      ))}
      {messages.length > 30 && (
        <p>Há mais conflitos; corrija estes e valide novamente.</p>
      )}
    </div>
  );
}
