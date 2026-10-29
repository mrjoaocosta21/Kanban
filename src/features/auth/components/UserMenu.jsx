import { WORKSPACE_ROLES } from '../../tasks/taskAccess.js';
import AssigneeAvatar from '../../tasks/components/AssigneeAvatar.jsx';

function UserMenu({ member, isSubmitting, onLogout }) {
  const roleLabel = member.workspaceRole === WORKSPACE_ROLES.MANAGER ? 'Gestor' : 'Colaborador';

  return (
    <div className="user-menu">
      <AssigneeAvatar assignee={member} />
      <div>
        <strong>{member.name}</strong>
        <span>{roleLabel} · {member.role}</span>
      </div>
      <button type="button" onClick={onLogout} disabled={isSubmitting}>
        Sair
      </button>
    </div>
  );
}

export default UserMenu;
