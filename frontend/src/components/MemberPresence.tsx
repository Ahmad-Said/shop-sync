import { Member } from '../types';

interface Props {
  members: Member[];
  onlineIds: string[];
}

export default function MemberPresence({ members, onlineIds }: Props) {
  if (!members.length) return null;

  const onlineSet = new Set(onlineIds);
  const online = members.filter((m) => onlineSet.has(m.id));
  const offline = members.filter((m) => !onlineSet.has(m.id));
  const sorted = [...online, ...offline];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
        {online.length}/{members.length} active
      </span>
      <div className="flex items-center -space-x-2">
        {sorted.slice(0, 8).map((m, i) => {
          const isOnline = onlineSet.has(m.id);
          return (
            <div
              key={m.id}
              className={`avatar ${isOnline ? 'avatar-online' : ''}`}
              style={{
                background: m.avatar_color,
                border: `2px solid var(--base)`,
                opacity: isOnline ? 1 : 0.4,
                zIndex: sorted.length - i,
                width: 28,
                height: 28,
                fontSize: 10,
              }}
              title={`${m.username}${isOnline ? ' (online)' : ''}`}
            >
              {m.username.slice(0, 2).toUpperCase()}
            </div>
          );
        })}
        {members.length > 8 && (
          <div
            className="avatar"
            style={{
              background: 'var(--surface-2)',
              border: '2px solid var(--base)',
              color: 'var(--muted)',
              fontSize: 9,
              width: 28,
              height: 28,
            }}
          >
            +{members.length - 8}
          </div>
        )}
      </div>
    </div>
  );
}
