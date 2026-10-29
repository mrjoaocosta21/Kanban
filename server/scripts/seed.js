import { hashPassword } from '../src/security/password.js';
import { config } from '../src/config.js';
import { createDatabasePool, withTransaction } from '../src/database.js';
import { runMigrations } from '../src/migrate.js';

const managerPassword = process.env.DEMO_MANAGER_PASSWORD ?? 'Manager123!';
const collaboratorPassword = process.env.DEMO_COLLABORATOR_PASSWORD ?? 'Collaborator123!';

if (config.isProduction && (!process.env.DEMO_MANAGER_PASSWORD || !process.env.DEMO_COLLABORATOR_PASSWORD)) {
  throw new Error('As senhas do seed precisam ser informadas explicitamente em produção.');
}

const pool = createDatabasePool(config.databaseUrl);

try {
  await runMigrations(pool);
  const [managerHash, collaboratorHash] = await Promise.all([
    hashPassword(managerPassword),
    hashPassword(collaboratorPassword),
  ]);

  await withTransaction(pool, async (client) => {
    const users = [
      {
        id: 'joao-costa', email: 'joao@kanban.local', name: 'João Costa', jobTitle: 'Produto',
        initials: 'JC', avatarUrl: 'https://i.pravatar.cc/100?img=12', passwordHash: managerHash,
      },
      {
        id: 'marina-alves', email: 'marina@kanban.local', name: 'Marina Alves', jobTitle: 'Design',
        initials: 'MA', avatarUrl: 'https://i.pravatar.cc/100?img=47', passwordHash: collaboratorHash,
      },
      {
        id: 'lucas-rocha', email: 'lucas@kanban.local', name: 'Lucas Rocha', jobTitle: 'Engenharia',
        initials: 'LR', avatarUrl: 'https://i.pravatar.cc/100?img=5', passwordHash: collaboratorHash,
      },
    ];

    for (const user of users) {
      await client.query(`
        INSERT INTO users (id, email, name, job_title, initials, avatar_url, password_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          job_title = EXCLUDED.job_title,
          initials = EXCLUDED.initials,
          avatar_url = EXCLUDED.avatar_url,
          password_hash = EXCLUDED.password_hash,
          updated_at = NOW()
      `, [
        user.id, user.email, user.name, user.jobTitle, user.initials, user.avatarUrl, user.passwordHash,
      ]);
    }

    await client.query(`
      INSERT INTO workspaces (id, name, slug)
      VALUES ('react-kanban', 'React Kanban', 'react-kanban')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug
    `);

    const memberships = [
      ['joao-costa', 'manager'],
      ['marina-alves', 'collaborator'],
      ['lucas-rocha', 'collaborator'],
    ];

    for (const [userId, role] of memberships) {
      await client.query(`
        INSERT INTO workspace_members (workspace_id, user_id, role)
        VALUES ('react-kanban', $1, $2)
        ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role
      `, [userId, role]);
    }

    const tasks = [
      {
        id: 'task-ui-updates', title: 'UI Updates', status: 'todo', priority: 'high',
        assigneeId: 'marina-alves', date: 'Hoje, 28 out', position: 0,
        tags: [
          { id: 'tag-frontend', name: 'Frontend', color: '#a278e6' },
          { id: 'tag-design', name: 'Design', color: '#ffa94d' },
        ],
      },
      {
        id: 'task-api-integration', title: 'API Integration', status: 'inprogress', priority: 'medium',
        assigneeId: 'lucas-rocha', date: 'Hoje, 28 out', position: 0,
        tags: [{ id: 'tag-backend', name: 'Backend', color: '#4be0bb' }],
      },
    ];

    for (const task of tasks) {
      await client.query(`
        INSERT INTO tasks (
          id, workspace_id, title, status, priority, assignee_id, date_label,
          tags, position, created_by_id, updated_by_id
        ) VALUES ($1, 'react-kanban', $2, $3, $4, $5, $6, $7::JSONB, $8, 'joao-costa', 'joao-costa')
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          assignee_id = EXCLUDED.assignee_id,
          date_label = EXCLUDED.date_label,
          tags = EXCLUDED.tags,
          position = EXCLUDED.position,
          deleted_at = NULL,
          updated_at = NOW(),
          version = tasks.version + 1
      `, [
        task.id, task.title, task.status, task.priority, task.assigneeId,
        task.date, JSON.stringify(task.tags), task.position,
      ]);

      await client.query(`
        INSERT INTO task_events (id, workspace_id, task_id, event_type, actor_id)
        VALUES ($1, 'react-kanban', $2, 'created', 'joao-costa')
        ON CONFLICT (id) DO NOTHING
      `, [`seed-${task.id}-created`, task.id]);
    }
  });

  console.log('Seed concluído.');
  console.log('Gestor: joao@kanban.local');
  console.log('Colaboradores: marina@kanban.local e lucas@kanban.local');
} finally {
  await pool.end();
}
