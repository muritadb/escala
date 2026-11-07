import { AppProvider, useApp } from "./AppContext";
import { AppLayout } from "../components/AppLayout";
import { PeoplePage } from "../features/people/PeoplePage";
import { ShiftsPage } from "../features/shifts/ShiftsPage";
import { CoveragePage } from "../features/coverage/CoveragePage";
import { SchedulePage } from "../features/schedule/SchedulePage";
function Content() {
  const { state, revision, loading, busy } = useApp();
  const settingsPage = {
    pessoas: <PeoplePage />,
    turnos: <ShiftsPage />,
    cobertura: <CoveragePage />,
  };
  return (
    <AppLayout>
      {loading ? (
        <p role="status">Carregando dados do servidor local…</p>
      ) : revision === null ? null : state.tab === "escala" ? (
        <SchedulePage />
      ) : (
        <fieldset disabled={busy} className="min-w-0">
          {settingsPage[state.tab]}
        </fieldset>
      )}
    </AppLayout>
  );
}
export default function App() {
  return (
    <AppProvider>
      <Content />
    </AppProvider>
  );
}
