import { randomUUID } from 'node:crypto';
import { withTransaction } from '../database.js';

function toIsoString(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function mapMember(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.job_title,
    workspaceRole: row.workspace_role,
    initials: row.initials,
    avatarUrl: row.avatar_url,
  };
}

function mapTask(row) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assignee_id,
    date: row.date_label,
    tags: row.tags,
    position: row.position,
    version: row.version,
    createdById: row.created_by_id,
    createdAt: toIsoString(row.created_at),
    updatedById: row.updated_by_id,
    updatedAt: toIsoString(row.updated_at),
    activity: (row.activity ?? []).map((event) => ({
      ...event,
      at: toIsoString(event.at),
    })),
  };
}

const TASK_SELECT = `
  SELECT t.*,
    COALESCE((
      SELECT JSONB_AGG(
        JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
          'id', e.id,
          'type', e.event_type,
          'actorId', e.actor_id,
          'at', e.created_at,
          'fromStatus', e.payload ->> 'fromStatus',
          'toStatus', e.payload ->> 'toStatus'
        )) ORDER BY e.created_at
      )
      FROM task_events e
      WHERE e.task_id = t.id
    ), '[]'::JSONB) AS activity
  FROM tasks t
`;

export class PostgresTaskRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findMembership(workspaceId, userId, client = this.pool) {
    const { rows } = await client.query(`
      SELECT workspace_id, user_id, role
      FROM workspace_members
      WHERE workspace_id = $1 AND user_id = $2
      LIMIT 1
    `, [workspaceId, userId]);

    if (!rows[0]) {
      return null;
    }

    return {
      workspaceId: rows[0].workspace_id,
      userId: rows[0].user_id,
      role: rows[0].role,
    };
  }

  async listMembers(workspaceId) {
    const { rows } = await this.pool.query(`
      SELECT u.id, u.name, u.job_title, u.initials, u.avatar_url,
             wm.role AS workspace_role
      FROM workspace_members wm
      JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = $1
      ORDER BY CASE wm.role WHEN 'manager' THEN 0 ELSE 1 END, u.name
    `, [workspaceId]);

    return rows.map(mapMember);
  }

  async listTasks(workspaceId, membership) {
    const values = [workspaceId];
    let visibilityClause = '';

    if (membership.role !== 'manager') {
      values.push(membership.userId);
      visibilityClause = `AND t.assignee_id = $${values.length}`;
    }

    const { rows } = await this.pool.query(`
      ${TASK_SELECT}
      WHERE t.workspace_id = $1
        AND t.deleted_at IS NULL
        ${visibilityClause}
      ORDER BY
        CASE t.status WHEN 'todo' THEN 0 WHEN 'inprogress' THEN 1 ELSE 2 END,
        t.position,
        t.created_at
    `, values);

    return rows.map(mapTask);
  }

  async findTask(workspaceId, taskId, client = this.pool, { forUpdate = false } = {}) {
    const { rows } = await client.query(`
      ${TASK_SELECT}
      WHERE t.workspace_id = $1 AND t.id = $2 AND t.deleted_at IS NULL
      ${forUpdate ? 'FOR UPDATE OF t' : ''}
    `, [workspaceId, taskId]);

    return rows[0] ? mapTask(rows[0]) : null;
  }

  async createTask({ workspaceId, actorId, task }) {
    return withTransaction(this.pool, async (client) => {
      const { rows: positionRows } = await client.query(`
        SELECT COALESCE(MAX(position), -1) + 1 AS next_position
        FROM tasks
        WHERE workspace_id = $1 AND status = $2 AND deleted_at IS NULL
      `, [workspaceId, task.status]);

      await client.query(`
        INSERT INTO tasks (
          id, workspace_id, title, status, priority, assignee_id, date_label,
          tags, position, created_by_id, updated_by_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::JSONB, $9, $10, $10)
      `, [
        task.id,
        workspaceId,
        task.title,
        task.status,
        task.priority,
        task.assigneeId,
        task.date,
        JSON.stringify(task.tags),
        positionRows[0].next_position,
        actorId,
      ]);

      await this.insertEvent(client, {
        workspaceId,
        taskId: task.id,
        type: 'created',
        actorId,
      });

      return this.findTask(workspaceId, task.id, client);
    });
  }

  async updateTask({ workspaceId, taskId, actorId, expectedVersion, changes, event }) {
    return withTransaction(this.pool, async (client) => {
      const currentTask = await this.findTask(workspaceId, taskId, client, { forUpdate: true });
      if (!currentTask) {
        return { outcome: 'not_found' };
      }

      if (expectedVersion && currentTask.version !== expectedVersion) {
        return { outcome: 'conflict', task: currentTask };
      }

      const nextStatus = changes.status ?? currentTask.status;
      let nextPosition;

      if (nextStatus !== currentTask.status) {
        const { rows } = await client.query(`
          SELECT COALESCE(MAX(position), -1) + 1 AS next_position
          FROM tasks
          WHERE workspace_id = $1 AND status = $2 AND deleted_at IS NULL
        `, [workspaceId, nextStatus]);
        nextPosition = rows[0].next_position;
      } else {
        nextPosition = currentTask.position;
      }

      const { rows } = await client.query(`
        UPDATE tasks
        SET title = $3,
            status = $4,
            priority = $5,
            assignee_id = $6,
            date_label = $7,
            tags = $8::JSONB,
            position = $9,
            updated_by_id = $10,
            updated_at = NOW(),
            version = version + 1
        WHERE workspace_id = $1 AND id = $2 AND deleted_at IS NULL
        RETURNING version
      `, [
        workspaceId,
        taskId,
        changes.title ?? currentTask.title,
        nextStatus,
        changes.priority ?? currentTask.priority,
        changes.assigneeId ?? currentTask.assigneeId,
        changes.date ?? currentTask.date,
        JSON.stringify(changes.tags ?? currentTask.tags),
        nextPosition,
        actorId,
      ]);

      if (!rows[0]) {
        return { outcome: 'not_found' };
      }

      await this.insertEvent(client, {
        workspaceId,
        taskId,
        type: event.type,
        actorId,
        payload: event.payload,
      });

      return {
        outcome: 'updated',
        task: await this.findTask(workspaceId, taskId, client),
      };
    });
  }

  async reorderTask({ workspaceId, taskId, actorId, status, targetTaskId, expectedVersion }) {
    return withTransaction(this.pool, async (client) => {
      const task = await this.findTask(workspaceId, taskId, client, { forUpdate: true });
      if (!task) {
        return { outcome: 'not_found' };
      }

      if (expectedVersion && task.version !== expectedVersion) {
        return { outcome: 'conflict', task };
      }

      let targetPosition;
      if (targetTaskId) {
        const targetTask = await this.findTask(workspaceId, targetTaskId, client, { forUpdate: true });
        if (!targetTask || targetTask.status !== status) {
          return { outcome: 'invalid_target' };
        }
        targetPosition = targetTask.position;
      } else {
        const { rows } = await client.query(`
          SELECT COALESCE(MAX(position), -1) + 1 AS next_position
          FROM tasks
          WHERE workspace_id = $1 AND status = $2 AND deleted_at IS NULL
        `, [workspaceId, status]);
        targetPosition = rows[0].next_position;
      }

      await client.query(`
        UPDATE tasks
        SET position = position + 1
        WHERE workspace_id = $1 AND status = $2 AND position >= $3
          AND id <> $4 AND deleted_at IS NULL
      `, [workspaceId, status, targetPosition, taskId]);

      await client.query(`
        UPDATE tasks
        SET status = $3, position = $4, updated_by_id = $5,
            updated_at = NOW(), version = version + 1
        WHERE workspace_id = $1 AND id = $2 AND deleted_at IS NULL
      `, [workspaceId, taskId, status, targetPosition, actorId]);

      const statusChanged = task.status !== status;
      await this.insertEvent(client, {
        workspaceId,
        taskId,
        type: statusChanged ? 'status_changed' : 'reordered',
        actorId,
        payload: statusChanged ? { fromStatus: task.status, toStatus: status } : {},
      });

      return { outcome: 'updated' };
    });
  }

  async deleteTask({ workspaceId, taskId, actorId, expectedVersion }) {
    return withTransaction(this.pool, async (client) => {
      const task = await this.findTask(workspaceId, taskId, client, { forUpdate: true });
      if (!task) {
        return { outcome: 'not_found' };
      }

      if (expectedVersion && task.version !== expectedVersion) {
        return { outcome: 'conflict', task };
      }

      await this.insertEvent(client, {
        workspaceId,
        taskId,
        type: 'deleted',
        actorId,
      });

      await client.query(`
        UPDATE tasks
        SET deleted_at = NOW(), updated_at = NOW(), updated_by_id = $3, version = version + 1
        WHERE workspace_id = $1 AND id = $2
      `, [workspaceId, taskId, actorId]);

      return { outcome: 'deleted' };
    });
  }

  async insertEvent(client, { workspaceId, taskId, type, actorId, payload = {} }) {
    await client.query(`
      INSERT INTO task_events (id, workspace_id, task_id, event_type, actor_id, payload)
      VALUES ($1, $2, $3, $4, $5, $6::JSONB)
    `, [randomUUID(), workspaceId, taskId, type, actorId, JSON.stringify(payload)]);
  }
}
