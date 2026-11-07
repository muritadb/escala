import { AppProvider, useApp } from "./AppContext";
import { AppLayout } from "../components/AppLayout";
import { PeoplePage } from "../features/people/PeoplePage";
import { ShiftsPage } from "../features/shifts/ShiftsPage";
import { CoveragePage } from "../features/coverage/CoveragePage";
import { SchedulePage } from "../features/schedule/SchedulePage";
function Content() {
  const { state } = useApp();
  return (
    <AppLayout>
      {state.tab === "pessoas" ? (
        <PeoplePage />
      ) : state.tab === "turnos" ? (
        <ShiftsPage />
      ) : state.tab === "cobertura" ? (
        <CoveragePage />
      ) : (
        <SchedulePage />
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
