function BoardProgress({ completedTasks, totalTasks, personal = false }) {
  const completionPercentage = totalTasks === 0
    ? 0
    : Math.round((completedTasks / totalTasks) * 100);

  return (
    <section className="board-progress" aria-labelledby="overall-progress-title">
      <div className="board-progress__header">
        <div>
          <p className="board-progress__eyebrow">{personal ? 'Seu desempenho' : 'Visão geral'}</p>
          <h2 id="overall-progress-title">{personal ? 'Progresso das suas tarefas' : 'Progresso do quadro'}</h2>
          <span>
            {totalTasks === 0
              ? 'Adicione uma tarefa para começar'
              : `${completedTasks} de ${totalTasks} ${totalTasks === 1 ? 'tarefa concluída' : 'tarefas concluídas'}`}
          </span>
        </div>
        <strong>{completionPercentage}%</strong>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-label={personal ? 'Progresso das tarefas atribuídas a você' : 'Progresso geral das tarefas'}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={completionPercentage}
      >
        <span style={{ width: `${completionPercentage}%` }} />
      </div>
    </section>
  );
}

export default BoardProgress;
