import { ChipsStack } from "@chips/component-library";
import { SceneListView } from "../views/SceneListView";
import { StateBindingView } from "../views/StateBindingView";
import { WorkspaceOverviewView } from "../views/WorkspaceOverviewView";
import type { AppSceneId } from "../app/scene-registry";

export interface MainSceneProps {
  activeSceneId: AppSceneId;
  onSelectScene(sceneId: AppSceneId): void;
}

export function MainScene({ activeSceneId, onSelectScene }: MainSceneProps) {
  return (
    <ChipsStack gap="lg">
      <WorkspaceOverviewView />
      <div className="app-view-grid">
        <StateBindingView />
        <SceneListView activeSceneId={activeSceneId} onSelectScene={onSelectScene} />
      </div>
    </ChipsStack>
  );
}
