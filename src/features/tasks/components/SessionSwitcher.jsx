import { TASK_ASSIGNEES } from '../taskData.js';
import { WORKSPACE_ROLES } from '../taskAccess.js';
import AssigneeAvatar from './AssigneeAvatar.jsx';

function getRoleLabel(workspaceRole) {
  return workspaceRole === WORKSPACE_ROLES.MANAGER ? 'Gestor' : 'Colaborador';
}

function SessionSwitcher({ currentMember, onChange }) {
  return (
    <div className="session-switcher">
      <AssigneeAvatar assignee={currentMember} />
      <label htmlFor="session-member">
        <span>Sessão demo · {getRoleLabel(currentMember.workspaceRole)}</span>
        <select
          id="session-member"
          value={currentMember.id}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Selecionar usuário da sessão demonstrativa"
        >
          {TASK_ASSIGNEES.map((member) => (
            <option value={member.id} key={member.id}>
              {member.name} · {getRoleLabel(member.workspaceRole)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default SessionSwitcher;
