interface Props { message: string; }

export default function Notification({ message }: Props) {
  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      padding: '8px 20px', background: '#2a6a3e', color: '#eee', borderRadius: 8,
      fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.4)', zIndex: 3000,
      animation: 'fadeIn 0.2s ease',
    }}>
      {message}
    </div>
  );
}
