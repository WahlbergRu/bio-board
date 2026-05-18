interface Props { message: string; }

export default function Notification({ message }: Props) {
  return (
    <div className="notification">
      {message}
    </div>
  );
}
