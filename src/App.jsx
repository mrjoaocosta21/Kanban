import './App.css';
import Board from './features/tasks/components/Board.jsx';
import ErrorBoundary from './shared/components/ErrorBoundary.jsx';

function App() {
  return (
    <ErrorBoundary>
      <Board />
    </ErrorBoundary>
  );
}

export default App;
